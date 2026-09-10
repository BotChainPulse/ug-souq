import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { isValidFlutterwaveWebhook, verifyPlusPayment } from "./plus";
import { verifyPesapalPayment } from "./pesapal";

async function ensureStartupSchema() {
  const { getDb } = await import("./queries/connection");
  const db = getDb();
  const raw: any = (db as any).$client;
  const client: any = typeof raw.promise === "function" ? raw.promise() : raw;

  const addColumn = async (sql: string) => {
    try {
      await client.query(sql);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/duplicate column|already exists/i.test(message)) return;
      throw error;
    }
  };

  // Older databases did not distinguish curated products from seller listings.
  // Keeping the types separate prevents an ID collision from charging for the wrong item.
  await client.query(`
    ALTER TABLE order_items
    MODIFY COLUMN item_type ENUM('product','listing','menu_item') NOT NULL
  `);
  await client.query(`
    ALTER TABLE listings
    MODIFY COLUMN status ENUM('pending','approved','rejected','suspended','terminated') NOT NULL DEFAULT 'pending'
  `);
  await addColumn(`ALTER TABLE sellers ADD COLUMN identity_checked_at TIMESTAMP NULL`);
  await addColumn(`ALTER TABLE sellers ADD COLUMN location_checked_at TIMESTAMP NULL`);
  await addColumn(`ALTER TABLE sellers ADD COLUMN verified_at TIMESTAMP NULL`);
  await addColumn(`ALTER TABLE sellers ADD COLUMN verified_by VARCHAR(64) NULL`);
  await addColumn(`ALTER TABLE sellers ADD COLUMN verification_notes TEXT NULL`);
  await addColumn(`ALTER TABLE order_items ADD COLUMN seller_id BIGINT UNSIGNED NULL`);
  await addColumn(`ALTER TABLE order_items ADD COLUMN commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0000`);
  await addColumn(`ALTER TABLE order_items ADD COLUMN commission_fee INT NOT NULL DEFAULT 0`);
  await addColumn(`ALTER TABLE order_items ADD COLUMN seller_net INT NOT NULL DEFAULT 0`);
  await addColumn(`ALTER TABLE seller_ad_bookings ADD COLUMN listing_id BIGINT UNSIGNED NULL`);
  await addColumn(`ALTER TABLE seller_ad_bookings ADD COLUMN headline VARCHAR(120) NULL`);
  await addColumn(`ALTER TABLE seller_ad_bookings ADD COLUMN message VARCHAR(255) NULL`);
  await addColumn(`ALTER TABLE seller_ad_bookings ADD COLUMN objective ENUM('product_sales','product_views','shop_visits') NULL`);
  await addColumn(`ALTER TABLE seller_ad_bookings ADD COLUMN cta ENUM('shop_now','view_product','visit_shop') NULL`);
  await addColumn(`ALTER TABLE seller_ad_bookings ADD COLUMN requested_start_date VARCHAR(10) NULL`);
  await addColumn(`ALTER TABLE listings ADD COLUMN is_branded BOOLEAN NOT NULL DEFAULT FALSE`);
  await addColumn(`ALTER TABLE listings ADD COLUMN brand_name VARCHAR(128) NULL`);
  await addColumn(`ALTER TABLE listings ADD COLUMN authenticity_evidence TEXT NULL`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS seller_identity_documents (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      seller_id BIGINT UNSIGNED NOT NULL UNIQUE,
      document_type ENUM('national_id','passport','driving_permit') NOT NULL,
      id_number_ciphertext TEXT NULL,
      id_number_iv VARCHAR(32) NULL,
      id_number_tag VARCHAR(32) NULL,
      id_number_fingerprint VARCHAR(64) NOT NULL UNIQUE,
      id_number_last4 VARCHAR(4) NOT NULL,
      document_ciphertext MEDIUMTEXT NULL,
      document_iv VARCHAR(32) NULL,
      document_tag VARCHAR(32) NULL,
      mime_type VARCHAR(64) NULL,
      original_name VARCHAR(255) NULL,
      status ENUM('pending','approved','rejected','deleted') NOT NULL DEFAULT 'pending',
      purpose VARCHAR(255) NOT NULL DEFAULT 'Seller identity verification and marketplace fraud prevention',
      consent_version VARCHAR(32) NOT NULL,
      consented_at TIMESTAMP NOT NULL,
      reviewed_at TIMESTAMP NULL,
      reviewed_by VARCHAR(64) NULL,
      review_notes TEXT NULL,
      retention_until TIMESTAMP NULL,
      deleted_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_identity_status (status),
      INDEX idx_identity_retention (retention_until)
    )
  `);

  // Delete document images after the review retention window while retaining
  // only the non-reversible fingerprint, last four characters and audit result.
  await client.query(`
    UPDATE seller_identity_documents
    SET document_ciphertext = NULL, document_iv = NULL, document_tag = NULL,
        id_number_ciphertext = NULL, id_number_iv = NULL, id_number_tag = NULL,
        status = 'deleted', deleted_at = CURRENT_TIMESTAMP
    WHERE retention_until IS NOT NULL AND retention_until <= CURRENT_TIMESTAMP
      AND document_ciphertext IS NOT NULL
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS seller_subscriptions (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      seller_id BIGINT UNSIGNED NOT NULL UNIQUE,
      tier ENUM('free','basic','verified','premium') NOT NULL DEFAULT 'free',
      monthly_fee INT NOT NULL DEFAULT 0,
      commission_rate DECIMAL(5,2) NOT NULL DEFAULT 7.00,
      features JSON NULL,
      started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NULL,
      is_active BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS seller_plan_payments (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      seller_id BIGINT UNSIGNED NOT NULL,
      plan ENUM('pro') NOT NULL DEFAULT 'pro',
      months INT NOT NULL DEFAULT 1,
      amount INT NOT NULL,
      payment_reference VARCHAR(128) NOT NULL UNIQUE,
      status ENUM('confirmed','refunded') NOT NULL DEFAULT 'confirmed',
      confirmed_by VARCHAR(64) NOT NULL DEFAULT 'admin-review',
      confirmed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

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
  await client.query(`
    CREATE TABLE IF NOT EXISTS payment_transactions (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      order_id BIGINT UNSIGNED NOT NULL,
      provider ENUM('pesapal') NOT NULL DEFAULT 'pesapal',
      merchant_reference VARCHAR(50) NOT NULL UNIQUE,
      tracking_id VARCHAR(64) NULL UNIQUE,
      amount INT NOT NULL,
      currency VARCHAR(8) NOT NULL DEFAULT 'UGX',
      status ENUM('pending','completed','failed','reversed','invalid') NOT NULL DEFAULT 'pending',
      payment_method VARCHAR(64) NULL,
      payment_account_masked VARCHAR(128) NULL,
      confirmation_code VARCHAR(128) NULL,
      provider_response JSON NULL,
      verified_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_payment_order (order_id), INDEX idx_payment_status (status)
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS marketing_subscribers (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NULL,
      email VARCHAR(255) NULL UNIQUE,
      phone VARCHAR(32) NULL UNIQUE,
      email_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
      whatsapp_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
      consent_source VARCHAR(64) NOT NULL DEFAULT 'homepage',
      consent_version VARCHAR(32) NOT NULL DEFAULT '2026-09-01',
      unsubscribe_token VARCHAR(64) NOT NULL UNIQUE,
      consented_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      email_unsubscribed_at TIMESTAMP NULL,
      whatsapp_unsubscribed_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_marketing_email_opt_in (email_opt_in),
      INDEX idx_marketing_whatsapp_opt_in (whatsapp_opt_in)
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
// The creative is taken from the seller's selected approved listing so no unreviewed image can become an ad.
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

    const [listing] = booking.listingId
      ? await db
          .select()
          .from(listings)
          .where(and(
            eq(listings.id, booking.listingId),
            eq(listings.sellerId, seller.id),
            eq(listings.status, "approved"),
          ))
          .limit(1)
      : await db
          .select()
          .from(listings)
          .where(and(eq(listings.sellerId, seller.id), eq(listings.status, "approved")))
          .orderBy(desc(listings.createdAt))
          .limit(1);

    // Never silently replace a seller's chosen product with another listing.
    if (!listing || listing.stock < 1) return null;

    const ctaLabel = booking.cta === "visit_shop"
      ? "Visit shop"
      : booking.cta === "view_product"
        ? "View product"
        : "Shop now";
    const targetPath = booking.cta === "visit_shop"
      ? `/seller/${seller.id}`
      : `/product/listing-${listing.id}`;

    return {
      id: booking.id,
      sellerId: seller.id,
      sellerName: seller.shopName,
      sellerVerified: seller.verified,
      planType: booking.planType,
      startsAt,
      expiresAt,
      listingId: listing.id,
      headline: booking.headline || listing.name,
      message: booking.message || null,
      objective: booking.objective || "product_sales",
      cta: booking.cta || "shop_now",
      ctaLabel,
      requestedStartDate: booking.requestedStartDate,
      image: listing.imageData ?? "/images/product-default.png",
      price: listing.price,
      oldPrice: listing.oldPrice,
      stock: listing.stock,
      targetPath,
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

// Pesapal callbacks and IPNs contain references, not a trusted payment result.
// Every notification is verified server-to-server before an order is marked paid.
app.get("/api/pesapal/callback", async (c) => {
  const trackingId = c.req.query("OrderTrackingId") ?? "";
  const merchantReference = c.req.query("OrderMerchantReference") ?? "";
  const base = (process.env.APP_URL ?? "").replace(/\/$/, "");
  try {
    const result = await verifyPesapalPayment(trackingId, merchantReference);
    const path = result.orderCode ? `/order/${encodeURIComponent(result.orderCode)}` : "/orders";
    return c.redirect(`${base}${path}?payment=${result.ok ? "successful" : result.status}`);
  } catch (error) {
    console.error("[PESAPAL] callback verification failed", error);
    return c.redirect(`${base}/orders?payment=failed`);
  }
});

const handlePesapalIpn = async (c: any) => {
  const payload = c.req.method === "POST" ? await c.req.json().catch(() => ({})) : {};
  const trackingId = c.req.query("OrderTrackingId") ?? payload?.OrderTrackingId ?? "";
  const merchantReference = c.req.query("OrderMerchantReference") ?? payload?.OrderMerchantReference ?? "";
  const notificationType = c.req.query("OrderNotificationType") ?? payload?.OrderNotificationType ?? "IPNCHANGE";
  try {
    await verifyPesapalPayment(trackingId, merchantReference);
    return c.json({ orderNotificationType: notificationType, orderTrackingId: trackingId, orderMerchantReference: merchantReference, status: 200 });
  } catch (error) {
    console.error("[PESAPAL] IPN verification failed", error);
    return c.json({ orderNotificationType: notificationType, orderTrackingId: trackingId, orderMerchantReference: merchantReference, status: 500 }, 500);
  }
};
app.get("/api/pesapal/ipn", handlePesapalIpn);
app.post("/api/pesapal/ipn", handlePesapalIpn);
// DukaBooks sync: read-only accounts summary, protected by the admin key.
// GET /api/accounts/summary?key=ADMIN_KEY
app.get("/api/accounts/summary", async (c) => {
  const key = c.req.query("key") ?? "";
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
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
  await ensureStartupSchema();
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
