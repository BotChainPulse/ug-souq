import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { isValidFlutterwaveWebhook, verifyPlusPayment } from "./plus";

async function ensureCheckoutSchema() {
  const { getDb } = await import("./queries/connection");
  const db = getDb();
  const raw: any = (db as any).$client;
  const client: any = typeof raw.promise === "function" ? raw.promise() : raw;

  await client.query(`
    CREATE TABLE IF NOT EXISTS plus_memberships (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      customer_id BIGINT UNSIGNED NOT NULL UNIQUE,
      plan VARCHAR(32) NOT NULL DEFAULT 'monthly',
      status ENUM('pending','active','expired','cancelled','payment_failed') NOT NULL DEFAULT 'pending',
      starts_at TIMESTAMP NULL,
      expires_at TIMESTAMP NULL,
      provider VARCHAR(32) NULL,
      provider_reference VARCHAR(128) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS plus_payments (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      customer_id BIGINT UNSIGNED NOT NULL,
      membership_id BIGINT UNSIGNED NULL,
      reference VARCHAR(128) NOT NULL UNIQUE,
      transaction_id VARCHAR(128) NULL,
      amount INT NOT NULL,
      currency VARCHAR(8) NOT NULL DEFAULT 'UGX',
      status ENUM('pending','successful','failed','cancelled') NOT NULL DEFAULT 'pending',
      provider_response JSON NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      verified_at TIMESTAMP NULL,
      INDEX idx_plus_payments_customer (customer_id)
    )
  `);
}

const app = new Hono<{ Bindings: HttpBindings }>();

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});

// Public sponsored seller campaigns. Only admin-activated bookings are exposed.
// The creative is taken from the seller's latest approved listing so no unreviewed image can become an ad.
// Campaign duration is measured from the audit entry that changed the booking to "active":
// weekly = 7 days, monthly = 30 days. Expired campaigns are completed lazily when this feed is read.
app.get("/api/ads/active", async (c) => {
  const { getDb } = await import("./queries/connection");
  const { sellerAdBookings, sellers, listings, adminAuditLogs } = await import("../db/schema");
  const { eq, desc, and } = await import("drizzle-orm");
  const db = getDb();
  const now = new Date();

  const active = await db
    .select({ booking: sellerAdBookings, seller: sellers })
    .from(sellerAdBookings)
    .innerJoin(sellers, eq(sellerAdBookings.sellerId, sellers.id))
    .where(and(eq(sellerAdBookings.status, "active"), eq(sellers.status, "approved")))
    .orderBy(desc(sellerAdBookings.createdAt));

  const ads = await Promise.all(active.map(async ({ booking, seller }) => {
    const auditRows = await db
      .select()
      .from(adminAuditLogs)
      .where(and(
        eq(adminAuditLogs.action, "seller_ad_booking.status.changed"),
        eq(adminAuditLogs.entityType, "seller_ad_booking"),
        eq(adminAuditLogs.entityId, String(booking.id)),
      ))
      .orderBy(desc(adminAuditLogs.createdAt));

    const activationAudit = auditRows.find((row) => {
      try {
        const after = row.afterState ? JSON.parse(row.afterState) : null;
        return after?.status === "active";
      } catch {
        return false;
      }
    });

    // Fallback protects older active campaigns that pre-date the activation audit flow.
    const startsAt = activationAudit?.createdAt ?? booking.createdAt;
    const durationDays = booking.planType === "monthly" ? 30 : 7;
    const expiresAt = new Date(new Date(startsAt).getTime() + durationDays * 24 * 60 * 60 * 1000);

    if (expiresAt <= now) {
      await db.update(sellerAdBookings).set({ status: "completed" }).where(eq(sellerAdBookings.id, booking.id));
      await db.insert(adminAuditLogs).values({
        actorTag: "system-expiry",
        action: "seller_ad_booking.auto_completed",
        entityType: "seller_ad_booking",
        entityId: String(booking.id),
        beforeState: JSON.stringify({ status: "active" }),
        afterState: JSON.stringify({ status: "completed" }),
        meta: JSON.stringify({ planType: booking.planType, startsAt, expiresAt }),
      });
      return null;
    }

    const [listing] = await db
      .select()
      .from(listings)
      .where(and(eq(listings.sellerId, seller.id), eq(listings.status, "approved")))
      .orderBy(desc(listings.createdAt))
      .limit(1);

    return {
      id: booking.id,
      sellerId: seller.id,
      sellerName: seller.shopName,
      sellerVerified: seller.verified,
      planType: booking.planType,
      startsAt,
      expiresAt,
      headline: listing?.name ? `${listing.name} from ${seller.shopName}` : `Shop ${seller.shopName} on UG Souq`,
      image: listing?.imageData ?? "/images/product-default.png",
    };
  }));

  return c.json(ads.filter(Boolean));
});

// Flutterwave returns the buyer here after hosted checkout. We always verify with Flutterwave
// server-to-server before activating a membership; query parameters alone are never trusted.
app.get("/api/plus/callback", async (c) => {
  const transactionId = c.req.query("transaction_id");
  const txRef = c.req.query("tx_ref");
  const base = (process.env.APP_URL ?? "").replace(/\/$/, "");
  if (!transactionId || !base) return c.redirect(`${base || ""}/plus?payment=failed`);
  try {
    const result = await verifyPlusPayment(transactionId, txRef);
    return c.redirect(`${base}/plus?payment=${result.ok ? "successful" : "failed"}`);
  } catch (error) {
    console.error("[PLUS] callback verification failed", error);
    return c.redirect(`${base}/plus?payment=failed`);
  }
});

// Webhooks make activation resilient if the buyer closes the redirect page. The signing secret is
// mandatory for this endpoint; unsigned webhooks are rejected.
app.post("/api/plus/webhook", async (c) => {
  const signature = c.req.header("verif-hash");
  if (!isValidFlutterwaveWebhook(signature)) return c.json({ error: "Invalid webhook signature" }, 401);
  const payload: any = await c.req.json().catch(() => null);
  const transactionId = payload?.data?.id ?? payload?.data?.transaction_id;
  if (!transactionId || payload?.event !== "charge.completed") return c.json({ received: true });
  try {
    await verifyPlusPayment(String(transactionId), payload?.data?.tx_ref);
    return c.json({ received: true });
  } catch (error) {
    console.error("[PLUS] webhook verification failed", error);
    return c.json({ received: false }, 400);
  }
});
// DukaBooks sync: read-only accounts summary, protected by the admin key.
// GET /api/accounts/summary?key=ADMIN_KEY
app.get("/api/accounts/summary", async (c) => {
  const key = c.req.query("key") ?? "";
  if (key !== (process.env.ADMIN_KEY ?? "ugsouq-admin-2026")) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const { getDb } = await import("./queries/connection");
  const { orders } = await import("../db/schema");
  const { desc } = await import("drizzle-orm");
  const { COMMISSION_RATE } = await import("./middleware");
  const db = getDb();
  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(500);
  const active = rows.filter((o) => o.status !== "cancelled");
  const paid = active.filter((o) => o.paymentStatus === "paid");
  return c.json({
    commissionRate: COMMISSION_RATE,
    generatedAt: new Date().toISOString(),
    totals: {
      orders: active.length,
      sales: active.reduce((s, o) => s + o.subtotal, 0),
      deliveryFees: active.reduce((s, o) => s + o.deliveryFee, 0),
      commissionEarned: active.reduce((s, o) => s + o.commissionFee, 0),
      sellerPayoutsOwed: active.reduce((s, o) => s + (o.subtotal - o.commissionFee), 0),
      receivedFromBuyers: paid.reduce((s, o) => s + o.total, 0),
      awaitingBuyerPayment: active.filter((o) => o.paymentStatus !== "paid").reduce((s, o) => s + o.total, 0),
    },
    entries: active.map((o) => ({
      code: o.code,
      date: o.createdAt,
      customer: o.customerName,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      status: o.status,
      subtotal: o.subtotal,
      deliveryFee: o.deliveryFee,
      commission: o.commissionFee,
      sellerPayout: o.subtotal - o.commissionFee,
      total: o.total,
    })),
  });
});

app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  await ensureCheckoutSchema();
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
