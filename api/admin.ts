import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc, and, like, gte, lte, sql } from "drizzle-orm";
import { createHash, createHmac } from "crypto";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  sellers, orders, orderItems, affiliates, products, listings,
  sellerAdBookings, deliveryPartners, adminAuditLogs, payouts,
  platformSettings, sellerContracts, notifications, returns, customers, marketingSubscribers
} from "../db/schema";

const ADMIN_KEY = process.env.ADMIN_KEY;

function requireAdmin(key: string) {
  if (key !== ADMIN_KEY) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid admin key" });
}

const ORDER_STATUSES = ["placed", "confirmed", "pending_delivery", "on_the_way", "delivered", "cancelled"] as const;

// Flutterwave V4 (Next Gen) OAuth2 + V3 fallback
const FLW_SECRET = process.env.FLW_SECRET_KEY;
const FLW_CLIENT_ID = process.env.FLW_CLIENT_ID;
const FLW_CLIENT_SECRET = process.env.FLW_CLIENT_SECRET;
const FLW_BASE = "https://api.flutterwave.com/v3";

let flwAccessToken: string | null = null;
let flwTokenExpiresAt = 0;

async function getFlutterwaveToken(): Promise<string | null> {
  // V3 style: direct secret key
  if (FLW_SECRET && FLW_SECRET.startsWith("FLWSECK")) {
    return FLW_SECRET;
  }

  // V4 OAuth2 style
  if (!FLW_CLIENT_ID || !FLW_CLIENT_SECRET) return null;

  // Use cached token if not expired
  if (flwAccessToken && Date.now() < flwTokenExpiresAt - 60000) {
    return flwAccessToken;
  }

  try {
    const res = await fetch(`${FLW_BASE}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: FLW_CLIENT_ID,
        client_secret: FLW_CLIENT_SECRET,
      }),
    });
    const data: any = await res.json().catch(() => ({}));
    if (res.ok && data?.access_token) {
      flwAccessToken = data.access_token;
      flwTokenExpiresAt = Date.now() + (data.expires_in ?? 3600) * 1000;
      return flwAccessToken;
    }
    console.error("[FLW] Token fetch failed:", data);
    return null;
  } catch (e) {
    console.error("[FLW] Token network error:", e);
    return null;
  }
}

// Webhook signature verification
const FLW_WEBHOOK_SECRET = process.env.FLW_WEBHOOK_SECRET;

function verifyWebhookSignature(body: string, signature: string): boolean {
  if (!FLW_WEBHOOK_SECRET) return true; // Skip verification if not configured
  const expected = crypto.createHmac("sha256", FLW_WEBHOOK_SECRET).update(body).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

async function flwFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getFlutterwaveToken();
  if (!token) throw new Error("Flutterwave not configured. Add FLW_SECRET_KEY or FLW_CLIENT_ID + FLW_CLIENT_SECRET to Railway Variables.");

  const isV4 = !token.startsWith("FLWSECK");
  const authHeader = isV4 ? `Bearer ${token}` : `Bearer ${token}`;

  return fetch(`${FLW_BASE}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
  });
}

const normalizeUgPhone = (value: string) => {
  const digits = (value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("256")) return digits;
  if (digits.startsWith("0")) return `256${digits.slice(1)}`;
  return `256${digits}`;
};

const normalizeOrderCodes = (raw: string | string[]) => {
  const arr = Array.isArray(raw) ? raw : raw.split(",");
  return arr.map((x) => x.trim().toUpperCase()).filter(Boolean);
};

const actorTag = (key: string) => createHash("sha256").update(key).digest("hex").slice(0, 12);

async function writeAudit(params: {
  key: string;
  action: string;
  entityType: string;
  entityId: string | number;
  beforeState?: unknown;
  afterState?: unknown;
  meta?: unknown;
}) {
  const db = getDb();
  await db.insert(adminAuditLogs).values({
    actorTag: actorTag(params.key),
    action: params.action,
    entityType: params.entityType,
    entityId: String(params.entityId),
    beforeState: params.beforeState === undefined ? null : JSON.stringify(params.beforeState),
    afterState: params.afterState === undefined ? null : JSON.stringify(params.afterState),
    meta: params.meta === undefined ? null : JSON.stringify(params.meta),
  });
}

async function createNotification(params: {
  type: "new_order" | "payment_received" | "seller_registered" | "delivery_partner_registered" | "payout_completed" | "payout_failed" | "listing_pending" | "order_cancelled" | "low_stock";
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
}) {
  const db = getDb();
  await db.insert(notifications).values({
    type: params.type,
    title: params.title,
    message: params.message,
    entityType: params.entityType ?? null,
    entityId: params.entityId ?? null,
  });
}

export const adminRouter = createRouter({
  login: publicQuery.input(z.object({ key: z.string() })).mutation(({ input }) => {
    requireAdmin(input.key);
    return { ok: true };
  }),

  marketingSubscribers: publicQuery.input(z.object({ key: z.string() })).query(async ({ input }) => {
    requireAdmin(input.key);
    const db = getDb();
    const rows = await db.select().from(marketingSubscribers).orderBy(desc(marketingSubscribers.consentedAt)).limit(1000);
    return {
      rows: rows.map(({ unsubscribeToken: _unsubscribeToken, ...row }) => row),
      totals: {
        subscribers: rows.filter((row) => row.emailOptIn || row.whatsappOptIn).length,
        email: rows.filter((row) => row.emailOptIn).length,
        whatsapp: rows.filter((row) => row.whatsappOptIn).length,
      },
    };
  }),

  // ============================================
  // OVERVIEW & STATS
  // ============================================
  stats: publicQuery.input(z.object({ key: z.string() })).query(async ({ input }) => {
    requireAdmin(input.key);
    const db = getDb();
    const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
    const allSellers = await db.select().from(sellers);
    const allAffiliates = await db.select().from(affiliates);
    const allProducts = await db.select().from(products);
    const allCustomers = await db.select().from(customers);
    const active = allOrders.filter((o) => o.status !== "cancelled");
    const paid = active.filter((o) => o.paymentStatus === "paid");
    const pendingPayoutCount = await db.select({ count: sql<number>`COUNT(*)` }).from(payouts).where(eq(payouts.status, "pending"));
    const unreadNotifications = await db.select({ count: sql<number>`COUNT(*)` }).from(notifications).where(eq(notifications.isRead, false));

    return {
      orderCount: allOrders.length,
      revenue: active.reduce((s, o) => s + o.total, 0),
      sellerCount: allSellers.length,
      pendingSellers: allSellers.filter((s) => s.status === "pending").length,
      affiliateCount: allAffiliates.length,
      productCount: allProducts.length,
      customerCount: allCustomers.length,
      pendingPayouts: pendingPayoutCount[0]?.count ?? 0,
      unreadNotifications: unreadNotifications[0]?.count ?? 0,
      ordersByStatus: ORDER_STATUSES.map((st) => ({ status: st, count: allOrders.filter((o) => o.status === st).length })),
      commissionBooked: active.reduce((s, o) => s + o.commissionFee, 0),
      commissionRealized: paid.reduce((s, o) => s + o.commissionFee, 0),
    };
  }),

  // ============================================
  // ORDER ANALYTICS (for charts)
  // ============================================
  orderAnalytics: publicQuery.input(z.object({ key: z.string(), days: z.number().default(30) })).query(async ({ input }) => {
    requireAdmin(input.key);
    const db = getDb();
    const since = new Date(Date.now() - input.days * 86400000);
    const rows = await db.select().from(orders).where(gte(orders.createdAt, since)).orderBy(orders.createdAt);

    const daily: Record<string, { date: string; orders: number; revenue: number; commission: number }> = {};
    for (const o of rows) {
      const d = new Date(o.createdAt).toISOString().slice(0, 10);
      if (!daily[d]) daily[d] = { date: d, orders: 0, revenue: 0, commission: 0 };
      daily[d].orders++;
      if (o.status !== "cancelled") {
        daily[d].revenue += o.total;
        daily[d].commission += o.commissionFee;
      }
    }

    const statusBreakdown = ORDER_STATUSES.map((st) => ({
      status: st,
      count: rows.filter((o) => o.status === st).length,
      revenue: rows.filter((o) => o.status === st).reduce((s, o) => s + o.total, 0),
    }));

    const paymentBreakdown = ["unpaid", "pending_confirmation", "paid"].map((ps) => ({
      status: ps,
      count: rows.filter((o) => o.paymentStatus === ps).length,
    }));

    return {
      daily: Object.values(daily).sort((a, b) => a.date.localeCompare(b.date)),
      statusBreakdown,
      paymentBreakdown,
      totalOrders: rows.length,
      totalRevenue: rows.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.total, 0),
      totalCommission: rows.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.commissionFee, 0),
    };
  }),

  // ============================================
  // SELLERS
  // ============================================
  sellers: publicQuery.input(z.object({ key: z.string(), search: z.string().optional(), status: z.enum(["pending", "approved", "rejected", "suspended", "terminated"]).optional() })).query(async ({ input }) => {
    requireAdmin(input.key);
    const db = getDb();
    let query = db.select().from(sellers).orderBy(desc(sellers.createdAt));
    const rows = await query;

    let filtered = rows;
    if (input.status) filtered = filtered.filter((s) => s.status === input.status);
    if (input.search) {
      const q = input.search.toLowerCase();
      filtered = filtered.filter((s) =>
        s.shopName.toLowerCase().includes(q) ||
        s.ownerName.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        (s.district ?? "").toLowerCase().includes(q)
      );
    }

    // Get contract status for each seller
    const contractRows = await db.select().from(sellerContracts);
    const contractMap = new Map<number, typeof contractRows>();
    for (const c of contractRows) {
      const list = contractMap.get(Number(c.sellerId)) ?? [];
      list.push(c);
      contractMap.set(Number(c.sellerId), list);
    }

    return filtered.map((s) => ({
      ...s,
      contracts: contractMap.get(Number(s.id)) ?? [],
    })).sort((a, b) => (a.status === "pending" ? -1 : 0) - (b.status === "pending" ? -1 : 0));
  }),

  setSellerStatus: publicQuery
    .input(z.object({ key: z.string(), id: z.number(), status: z.enum(["pending", "approved", "rejected", "suspended", "terminated"]) }))
    .mutation(async ({ input }) => {
      requireAdmin(input.key);
      const db = getDb();
      const [before] = await db.select().from(sellers).where(eq(sellers.id, input.id));
      await db.update(sellers).set({
        status: input.status,
        verified: input.status === "approved",
      }).where(eq(sellers.id, input.id));
      const [after] = await db.select().from(sellers).where(eq(sellers.id, input.id));
      await writeAudit({ key: input.key, action: "seller.status.changed", entityType: "seller", entityId: input.id, beforeState: before, afterState: after });
      if (input.status === "approved") {
        await createNotification({ type: "seller_registered", title: "Seller Approved", message: `${after.shopName} has been approved.`, entityType: "seller", entityId: String(input.id) });
      }
      return { ok: true };
    }),

  // ============================================
  // SELLER CONTRACTS
  // ============================================
  sellerContracts: publicQuery.input(z.object({ key: z.string(), sellerId: z.number() })).query(async ({ input }) => {
    requireAdmin(input.key);
    const db = getDb();
    return db.select().from(sellerContracts).where(eq(sellerContracts.sellerId, input.sellerId));
  }),

  acceptSellerContract: publicQuery
    .input(z.object({ key: z.string(), sellerId: z.number(), contractType: z.enum(["seller_agreement", "commission_terms", "delivery_terms"]) }))
    .mutation(async ({ input }) => {
      requireAdmin(input.key);
      const db = getDb();
      const hash = createHash("sha256").update(input.key).digest("hex");

      await db.insert(sellerContracts).values({
        sellerId: input.sellerId,
        contractType: input.contractType,
        accepted: true,
        acceptedAt: new Date(),
        acceptedBy: "admin",
        adminKeyHash: hash.slice(0, 64),
      }).onDuplicateKeyUpdate({
        set: { accepted: true, acceptedAt: new Date(), acceptedBy: "admin", adminKeyHash: hash.slice(0, 64) },
      });

      // Also update the legacy flags on sellers table
      if (input.contractType === "commission_terms") {
        await db.update(sellers).set({ commissionTermsAccepted: true, commissionTermsAcceptedAt: new Date() }).where(eq(sellers.id, input.sellerId));
      }
      if (input.contractType === "seller_agreement") {
        await db.update(sellers).set({ sellerContractAccepted: true, sellerContractAcceptedAt: new Date() }).where(eq(sellers.id, input.sellerId));
      }

      await writeAudit({ key: input.key, action: "seller.contract.accepted_by_admin", entityType: "seller", entityId: input.sellerId, meta: { contractType: input.contractType } });
      return { ok: true };
    }),

  // ============================================
  // ORDERS (with search)
  // ============================================
  orders: publicQuery.input(z.object({ key: z.string(), search: z.string().optional(), status: z.enum(ORDER_STATUSES).optional(), limit: z.number().default(100) })).query(async ({ input }) => {
    requireAdmin(input.key);
    const db = getDb();
    let query = db.select().from(orders).orderBy(desc(orders.createdAt)).limit(input.limit);
    const rows = await query;

    let filtered = rows;
    if (input.status) filtered = filtered.filter((o) => o.status === input.status);
    if (input.search) {
      const q = input.search.toLowerCase();
      filtered = filtered.filter((o) =>
        (o.code ?? '').toLowerCase().includes(q) ||
        ((o as any).customerName ?? '').toLowerCase().includes(q) ||
        ((o as any).phone ?? '').includes(q)
      );
    }

    const withItems = await Promise.all(
      filtered.map(async (o) => ({
        ...o,
        customerName: (o as any).customerName ?? 'Unknown',
        phone: (o as any).phone ?? '',
        address: (o as any).address ?? '',
        paymentMethod: (o as any).paymentMethod ?? '',
        deliveryPartnerId: (o as any).deliveryPartnerId ?? null,
        paidOut: (o as any).paidOut ?? false,
        items: await db.select().from(orderItems).where(eq(orderItems.orderId, o.id)),
      })),
    );
    return withItems;
  }),

  setOrderStatus: publicQuery
    .input(z.object({ key: z.string(), id: z.number(), status: z.enum(ORDER_STATUSES) }))
    .mutation(async ({ input }) => {
      requireAdmin(input.key);
      const db = getDb();
      const [before] = await db.select().from(orders).where(eq(orders.id, input.id));
      const updates: any = { status: input.status };
      if (input.status === "delivered") updates.deliveredAt = new Date();
      await db.update(orders).set(updates).where(eq(orders.id, input.id));
      const [after] = await db.select().from(orders).where(eq(orders.id, input.id));
      await writeAudit({ key: input.key, action: "order.status.changed", entityType: "order", entityId: input.id, beforeState: before, afterState: after });

      if (input.status === "delivered" && after.paymentStatus === "paid") {
        await createNotification({ type: "payment_received", title: "Order Ready for Payout", message: `Order ${after.code} is delivered and paid. Ready for seller payout.`, entityType: "order", entityId: after.code });
      }
      return { ok: true };
    }),

  setPaymentStatus: publicQuery
    .input(z.object({ key: z.string(), id: z.number(), status: z.enum(["unpaid", "pending_confirmation", "paid"]) }))
    .mutation(async ({ input }) => {
      requireAdmin(input.key);
      const db = getDb();
      const [before] = await db.select().from(orders).where(eq(orders.id, input.id));
      await db.update(orders).set({ paymentStatus: input.status }).where(eq(orders.id, input.id));
      const [after] = await db.select().from(orders).where(eq(orders.id, input.id));
      await writeAudit({ key: input.key, action: "order.payment_status.changed", entityType: "order", entityId: input.id, beforeState: before, afterState: after });

      if (input.status === "paid") {
        await createNotification({ type: "payment_received", title: "Payment Received", message: `Payment confirmed for order ${after.code}.`, entityType: "order", entityId: after.code });
      }
      return { ok: true };
    }),

  // ============================================
  // DELIVERY ASSIGNMENT
  // ============================================
  assignDeliveryPartner: publicQuery
    .input(z.object({ key: z.string(), orderId: z.number(), partnerId: z.number(), notes: z.string().optional() }))
    .mutation(async ({ input }) => {
      requireAdmin(input.key);
      const db = getDb();
      const [order] = await db.select().from(orders).where(eq(orders.id, input.orderId));
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });

      const [partner] = await db.select().from(deliveryPartners).where(eq(deliveryPartners.id, input.partnerId));
      if (!partner || partner.status !== "approved") throw new TRPCError({ code: "BAD_REQUEST", message: "Delivery partner not approved" });

      await db.update(orders).set({
        deliveryPartnerId: input.partnerId,
        deliveryAssignedAt: new Date(),
        deliveryNotes: input.notes ?? null,
        status: "on_the_way",
      }).where(eq(orders.id, input.orderId));

      await writeAudit({ key: input.key, action: "order.delivery.assigned", entityType: "order", entityId: input.orderId, meta: { partnerId: input.partnerId, partnerName: partner.fullName } });
      await createNotification({ type: "new_order", title: "Delivery Assigned", message: `${partner.fullName} assigned to order ${order.code}.`, entityType: "order", entityId: order.code });
      return { ok: true };
    }),

  unassignDeliveryPartner: publicQuery
    .input(z.object({ key: z.string(), orderId: z.number() }))
    .mutation(async ({ input }) => {
      requireAdmin(input.key);
      const db = getDb();
      const [before] = await db.select().from(orders).where(eq(orders.id, input.orderId));
      await db.update(orders).set({
        deliveryPartnerId: null,
        deliveryAssignedAt: null,
        deliveryNotes: null,
        status: "confirmed",
      }).where(eq(orders.id, input.orderId));
      await writeAudit({ key: input.key, action: "order.delivery.unassigned", entityType: "order", entityId: input.orderId, beforeState: before });
      return { ok: true };
    }),

  markDelivered: publicQuery
    .input(z.object({ key: z.string(), orderId: z.number() }))
    .mutation(async ({ input }) => {
      requireAdmin(input.key);
      const db = getDb();
      const [before] = await db.select().from(orders).where(eq(orders.id, input.orderId));
      await db.update(orders).set({ status: "delivered", deliveredAt: new Date() }).where(eq(orders.id, input.orderId));
      const [after] = await db.select().from(orders).where(eq(orders.id, input.orderId));
      await writeAudit({ key: input.key, action: "order.delivered", entityType: "order", entityId: input.orderId, beforeState: before, afterState: after });

      if (after.paymentStatus === "paid") {
        await createNotification({ type: "payment_received", title: "Order Delivered & Paid", message: `Order ${after.code} is ready for seller payout.`, entityType: "order", entityId: after.code });
      }
      return { ok: true };
    }),

  // ============================================
  // DELIVERY PARTNERS
  // ============================================
  deliveryPartners: publicQuery
    .input(z.object({ key: z.string(), search: z.string().optional() }))
    .query(async ({ input }) => {
      requireAdmin(input.key);
      const db = getDb();
      const partners = await db.select().from(deliveryPartners).orderBy(desc(deliveryPartners.createdAt));
      const orderRows = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(500);
      const active = orderRows.filter((o) => o.status !== "cancelled");
      const paid = active.filter((o) => o.paymentStatus === "paid");
      const platform10Booked = active.reduce((s, o) => s + Math.round(o.deliveryFee * 0.1), 0);
      const platform10Realized = paid.reduce((s, o) => s + Math.round(o.deliveryFee * 0.1), 0);

      let filtered = partners;
      if (input.search) {
        const q = input.search.toLowerCase();
        filtered = filtered.filter((p) =>
          p.fullName.toLowerCase().includes(q) || p.phone.includes(q) || p.area.toLowerCase().includes(q)
        );
      }

      return {
        partners: filtered,
        ledger: {
          deliveryFeesBooked: active.reduce((s, o) => s + o.deliveryFee, 0),
          deliveryFeesRealized: paid.reduce((s, o) => s + o.deliveryFee, 0),
          platform10Booked,
          platform10Realized,
          partnerShareBooked: active.reduce((s, o) => s + (o.deliveryFee - Math.round(o.deliveryFee * 0.1)), 0),
          partnerShareRealized: paid.reduce((s, o) => s + (o.deliveryFee - Math.round(o.deliveryFee * 0.1)), 0),
        },
      };
    }),

  setDeliveryPartnerStatus: publicQuery
    .input(z.object({ key: z.string(), id: z.number(), status: z.enum(["pending", "approved", "rejected", "suspended", "terminated"]) }))
    .mutation(async ({ input }) => {
      requireAdmin(input.key);
      const db = getDb();
      const [before] = await db.select().from(deliveryPartners).where(eq(deliveryPartners.id, input.id));
      await db.update(deliveryPartners).set({ status: input.status }).where(eq(deliveryPartners.id, input.id));
      const [after] = await db.select().from(deliveryPartners).where(eq(deliveryPartners.id, input.id));
      await writeAudit({ key: input.key, action: "delivery_partner.status.changed", entityType: "delivery_partner", entityId: input.id, beforeState: before, afterState: after });
      return { ok: true };
    }),

  // ============================================
  // BUYERS / CUSTOMERS
  // ============================================
  customers: publicQuery.input(z.object({ key: z.string(), search: z.string().optional() })).query(async ({ input }) => {
    requireAdmin(input.key);
    const db = getDb();
    const rows = await db.select().from(customers).orderBy(desc(customers.createdAt));
    let filtered = rows;
    if (input.search) {
      const q = input.search.toLowerCase();
      filtered = filtered.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q));
    }

    // Get order counts per customer
    const allOrders = await db.select().from(orders);
    const orderMap = new Map<string, number>();
    const spentMap = new Map<string, number>();
    for (const o of allOrders) {
      if (o.status === "cancelled") continue;
      const key = o.phone;
      orderMap.set(key, (orderMap.get(key) ?? 0) + 1);
      spentMap.set(key, (spentMap.get(key) ?? 0) + o.total);
    }

    return filtered.map((c) => ({
      ...c,
      orderCount: orderMap.get(c.phone) ?? 0,
      totalSpent: spentMap.get(c.phone) ?? 0,
    }));
  }),

  customerOrders: publicQuery.input(z.object({ key: z.string(), phone: z.string() })).query(async ({ input }) => {
    requireAdmin(input.key);
    const db = getDb();
    const rows = await db.select().from(orders).where(eq(orders.phone, input.phone)).orderBy(desc(orders.createdAt));
    const withItems = await Promise.all(
      rows.map(async (o) => ({
        ...o,
        items: await db.select().from(orderItems).where(eq(orderItems.orderId, o.id)),
      })),
    );
    return withItems;
  }),

  // ============================================
  // LISTINGS (with search)
  // ============================================
  listings: publicQuery.input(z.object({ key: z.string(), search: z.string().optional(), status: z.enum(["pending", "approved", "rejected"]).optional() })).query(async ({ input }) => {
    requireAdmin(input.key);
    const db = getDb();
    const rows = await db
      .select({ listing: listings, seller: sellers })
      .from(listings)
      .innerJoin(sellers, eq(listings.sellerId, sellers.id))
      .orderBy(desc(listings.createdAt));

    let mapped = rows.map(({ listing, seller }) => ({ ...listing, sellerName: seller.shopName, sellerVerified: seller.verified }));
    if (input.status) mapped = mapped.filter((l) => l.status === input.status);
    if (input.search) {
      const q = input.search.toLowerCase();
      mapped = mapped.filter((l) => l.name.toLowerCase().includes(q) || l.sellerName.toLowerCase().includes(q));
    }
    return mapped.sort((a, b) => (a.status === "pending" ? -1 : 0) - (b.status === "pending" ? -1 : 0));
  }),

  setListingStatus: publicQuery
    .input(z.object({ key: z.string(), id: z.number(), status: z.enum(["pending", "approved", "rejected", "suspended", "terminated"]) }))
    .mutation(async ({ input }) => {
      requireAdmin(input.key);
      const db = getDb();
      const [before] = await db.select().from(listings).where(eq(listings.id, input.id));
      await db.update(listings).set({ status: input.status }).where(eq(listings.id, input.id));
      const [after] = await db.select().from(listings).where(eq(listings.id, input.id));
      await writeAudit({ key: input.key, action: "listing.status.changed", entityType: "listing", entityId: input.id, beforeState: before, afterState: after });
      return { ok: true };
    }),

  // ============================================
  // AD BOOKINGS
  // ============================================
  adBookings: publicQuery
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      requireAdmin(input.key);
      const db = getDb();
      const rows = await db
        .select({ booking: sellerAdBookings, seller: sellers })
        .from(sellerAdBookings)
        .innerJoin(sellers, eq(sellerAdBookings.sellerId, sellers.id))
        .orderBy(desc(sellerAdBookings.createdAt));

      const list = rows.map(({ booking, seller }) => ({
        ...booking,
        sellerName: seller.shopName,
        sellerPhone: seller.phone,
      }));
      const totals = {
        booked: list.filter((r) => r.status !== "cancelled").reduce((s, r) => s + r.amount, 0),
        realized: list.filter((r) => ["paid", "active", "completed"].includes(r.status)).reduce((s, r) => s + r.amount, 0),
        count: list.length,
      };

      return { rows: list, totals };
    }),

  setAdBookingStatus: publicQuery
    .input(z.object({ key: z.string(), id: z.number(), status: z.enum(["booked", "paid", "active", "completed", "cancelled"]) }))
    .mutation(async ({ input }) => {
      requireAdmin(input.key);
      const db = getDb();
      const [before] = await db.select().from(sellerAdBookings).where(eq(sellerAdBookings.id, input.id));
      if (!before) throw new TRPCError({ code: "NOT_FOUND", message: "Seller ad booking not found" });
      if (input.status === "active") {
        const [approvedListing] = await db
          .select({ id: listings.id })
          .from(listings)
          .where(and(eq(listings.sellerId, before.sellerId), eq(listings.status, "approved")))
          .limit(1);
        if (!approvedListing) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Approve at least one seller listing before activating this campaign." });
        }
      }
      await db.update(sellerAdBookings).set({ status: input.status }).where(eq(sellerAdBookings.id, input.id));
      const [after] = await db.select().from(sellerAdBookings).where(eq(sellerAdBookings.id, input.id));
      await writeAudit({ key: input.key, action: "seller_ad_booking.status.changed", entityType: "seller_ad_booking", entityId: input.id, beforeState: before, afterState: after });
      return { ok: true };
    }),

  // ============================================
  // ACCOUNTS (Transparent Books)
  // ============================================
  accounts: publicQuery.input(z.object({ key: z.string() })).query(async ({ input }) => {
    requireAdmin(input.key);
    const db = getDb();
    const rows = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(500);
    const adRows = await db.select().from(sellerAdBookings).orderBy(desc(sellerAdBookings.createdAt)).limit(500);
    const active = rows.filter((o) => o.status !== "cancelled");
    const paid = active.filter((o) => o.paymentStatus === "paid");
    const deliveryIncomeBooked = active.reduce((s, o) => s + Math.round(o.deliveryFee * 0.1), 0);
    const deliveryIncomeRealized = paid.reduce((s, o) => s + Math.round(o.deliveryFee * 0.1), 0);
    const adBooked = adRows.filter((a) => a.status !== "cancelled").reduce((s, a) => s + a.amount, 0);
    const adRealized = adRows.filter((a) => ["paid", "active", "completed"].includes(a.status)).reduce((s, a) => s + a.amount, 0);
    const commissionBooked = active.reduce((s, o) => s + o.commissionFee, 0);
    const commissionRealized = paid.reduce((s, o) => s + o.commissionFee, 0);

    // Get actual payout history totals
    const payoutRows = await db.select().from(payouts).where(eq(payouts.status, "completed"));
    const totalPayoutsSent = payoutRows.reduce((s, p) => s + p.amount, 0);

    const entries = active.map((o) => ({
      id: o.id,
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
    }));

    return {
      rate: 0.07,
      totals: {
        orders: active.length,
        sales: active.reduce((s, o) => s + o.subtotal, 0),
        deliveryFees: active.reduce((s, o) => s + o.deliveryFee, 0),
        commissionEarned: commissionBooked,
        commissionRealized,
        commissionBooked,
        deliveryIncome10pctBooked: deliveryIncomeBooked,
        deliveryIncome10pctRealized: deliveryIncomeRealized,
        adRevenueBooked: adBooked,
        adRevenueRealized: adRealized,
        grossPlatformIncomeBooked: commissionBooked + deliveryIncomeBooked + adBooked,
        grossPlatformIncomeRealized: commissionRealized + deliveryIncomeRealized + adRealized,
        sellerPayoutsOwed: active.reduce((s, o) => s + (o.subtotal - o.commissionFee), 0),
        sellerPayoutsSent: totalPayoutsSent,
        sellerPayoutsPending: active.reduce((s, o) => s + (o.subtotal - o.commissionFee), 0) - totalPayoutsSent,
        receivedFromBuyers: paid.reduce((s, o) => s + o.total, 0),
        awaitingBuyerPayment: active.filter((o) => o.paymentStatus !== "paid").reduce((s, o) => s + o.total, 0),
      },
      incomeStreams: [
        { stream: "Product commission", booked: commissionBooked, realized: commissionRealized, rule: "7% of product subtotal" },
        { stream: "Delivery income", booked: deliveryIncomeBooked, realized: deliveryIncomeRealized, rule: "10% of delivery fee" },
        { stream: "Seller ad revenue", booked: adBooked, realized: adRealized, rule: "Weekly UGX 25,000 / Monthly UGX 50,000" },
      ],
      entries,
    };
  }),
  // ============================================
  // COMMISSION BREAKDOWN (by role)
  // ============================================
  commissionBreakdown: publicQuery
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      requireAdmin(input.key);
      const db = getDb();

      const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
      const allSellers = await db.select().from(sellers);
      const allPartners = await db.select().from(deliveryPartners);
      const allAffiliates = await db.select().from(affiliates);
      const adBookings = await db.select().from(sellerAdBookings);

      const activeOrders = allOrders.filter((o) => o.status !== "cancelled");
      const paidOrders = allOrders.filter((o) => o.status !== "cancelled" && o.paymentStatus === "paid");

      // --- SELLER COMMISSIONS ---
      const sellerMap = new Map<number, {
        sellerId: number; shopName: string; ownerName: string; phone: string;
        orders: number; totalSales: number; commissionBooked: number;
        commissionRealized: number; payoutOwed: number; status: string;
      }>();

      for (const s of allSellers) {
        sellerMap.set(s.id, {
          sellerId: s.id, shopName: s.shopName, ownerName: s.ownerName, phone: s.phone,
          orders: 0, totalSales: 0, commissionBooked: 0, commissionRealized: 0, payoutOwed: 0, status: s.status,
        });
      }

      const allOrderItems = await db.select().from(orderItems);
      const orderSellerMap = new Map<number, number>();
      for (const oi of allOrderItems) {
        if (!orderSellerMap.has(oi.orderId)) orderSellerMap.set(oi.orderId, oi.sellerId);
      }

      for (const o of activeOrders) {
        const sellerId = orderSellerMap.get(o.id);
        if (sellerId && sellerMap.has(sellerId)) {
          const entry = sellerMap.get(sellerId)!;
          entry.orders += 1;
          entry.totalSales += o.subtotal;
          entry.commissionBooked += o.commissionFee;
          entry.payoutOwed += (o.subtotal - o.commissionFee);
        }
      }
      for (const o of paidOrders) {
        const sellerId = orderSellerMap.get(o.id);
        if (sellerId && sellerMap.has(sellerId)) {
          sellerMap.get(sellerId)!.commissionRealized += o.commissionFee;
        }
      }

      // --- RIDER COMMISSIONS ---
      const riderMap = new Map<number, {
        riderId: number; fullName: string; phone: string; area: string;
        vehicleType: string; orders: number; totalDeliveryFees: number;
        platformIncomeBooked: number; platformIncomeRealized: number;
        riderShareBooked: number; riderShareRealized: number; status: string;
      }>();

      for (const p of allPartners) {
        riderMap.set(p.id, {
          riderId: p.id, fullName: p.fullName, phone: p.phone, area: p.area,
          vehicleType: p.vehicleType, orders: 0, totalDeliveryFees: 0,
          platformIncomeBooked: 0, platformIncomeRealized: 0,
          riderShareBooked: 0, riderShareRealized: 0, status: p.status,
        });
      }

      for (const o of activeOrders) {
        if (o.deliveryPartnerId && riderMap.has(o.deliveryPartnerId)) {
          const entry = riderMap.get(o.deliveryPartnerId)!;
          entry.orders += 1;
          entry.totalDeliveryFees += o.deliveryFee;
          const platformCut = Math.round(o.deliveryFee * 0.1);
          entry.platformIncomeBooked += platformCut;
          entry.riderShareBooked += (o.deliveryFee - platformCut);
        }
      }
      for (const o of paidOrders) {
        if (o.deliveryPartnerId && riderMap.has(o.deliveryPartnerId)) {
          const entry = riderMap.get(o.deliveryPartnerId)!;
          const platformCut = Math.round(o.deliveryFee * 0.1);
          entry.platformIncomeRealized += platformCut;
          entry.riderShareRealized += (o.deliveryFee - platformCut);
        }
      }

      // --- AFFILIATES ---
      const affiliateList = allAffiliates.map((a) => ({
        affiliateId: a.id, name: a.name, phone: a.phone, code: a.code, channel: a.channel,
        referrals: 0, commissionBooked: 0, commissionRealized: 0,
      }));

      const adBooked = adBookings.reduce((s, b) => s + (b.status !== "cancelled" ? b.price : 0), 0);
      const adRealized = adBookings.reduce((s, b) => s + (b.status === "paid" || b.status === "completed" ? b.price : 0), 0);
      const commissionBooked = activeOrders.reduce((s, o) => s + o.commissionFee, 0);
      const commissionRealized = paidOrders.reduce((s, o) => s + o.commissionFee, 0);
      const deliveryIncomeBooked = activeOrders.reduce((s, o) => s + Math.round(o.deliveryFee * 0.1), 0);
      const deliveryIncomeRealized = paidOrders.reduce((s, o) => s + Math.round(o.deliveryFee * 0.1), 0);

      return {
        rate: 0.07,
        totals: {
          commissionBooked, commissionRealized,
          deliveryIncomeBooked, deliveryIncomeRealized,
          adRevenueBooked: adBooked, adRevenueRealized: adRealized,
          grossPlatformIncomeBooked: commissionBooked + deliveryIncomeBooked + adBooked,
          grossPlatformIncomeRealized: commissionRealized + deliveryIncomeRealized + adRealized,
        },
        sellers: Array.from(sellerMap.values()).filter((s) => s.orders > 0 || s.status === "approved"),
        riders: Array.from(riderMap.values()).filter((r) => r.orders > 0 || r.status === "approved"),
        affiliates: affiliateList,
        streams: [
          { stream: "Product commission (sellers)", booked: commissionBooked, realized: commissionRealized, rule: "7% of product subtotal" },
          { stream: "Delivery platform fee (riders)", booked: deliveryIncomeBooked, realized: deliveryIncomeRealized, rule: "10% of delivery fee" },
          { stream: "Seller ad revenue", booked: adBooked, realized: adRealized, rule: "Weekly UGX 25,000 / Monthly UGX 50,000" },
          { stream: "Affiliate commission", booked: 0, realized: 0, rule: "Not yet configured" },
        ],
      };
    }),



  // ============================================
  // PAYOUTS (COMPLETE REWRITE)
  // ============================================
  pendingPayouts: publicQuery
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      requireAdmin(input.key);
      const db = getDb();

      const eligibleOrders = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.status, "delivered"),
            eq(orders.paymentStatus, "paid"),
            eq(orders.paidOut, false),
          ),
        )
        .orderBy(desc(orders.createdAt));

      if (eligibleOrders.length === 0) return { success: true, pending: [] as any[] };

      const sellerRows = await db.select().from(sellers);
      const sellerById = new Map(sellerRows.map((s) => [Number(s.id), s]));

      const productRows = await db.select().from(products);
      const productById = new Map(productRows.map((p) => [Number(p.id), p]));

      const grouped = new Map<
        number,
        {
          sellerId: number;
          sellerName: string;
          payoutMethod: string | null;
          payoutNumber: string | null;
          totalOwed: number;
          orderCodeSet: Set<string>;
        }
      >();

      for (const order of eligibleOrders) {
        const items = await db
          .select()
          .from(orderItems)
          .where(and(eq(orderItems.orderId, order.id), eq(orderItems.itemType, "product")));

        if (items.length === 0) continue;

        const perSellerGross = new Map<number, number>();
        let grossTotal = 0;

        for (const it of items) {
          const product = productById.get(Number(it.itemId));
          if (!product) continue;
          const lineTotal = Number(it.price) * Number(it.qty);
          grossTotal += lineTotal;
          const sid = Number(product.sellerId);
          perSellerGross.set(sid, (perSellerGross.get(sid) ?? 0) + lineTotal);
        }

        if (grossTotal <= 0) continue;

        for (const [sid, sellerGross] of perSellerGross.entries()) {
          const seller = sellerById.get(sid);
          if (!seller) continue;
          const allocatedCommission = Math.round((sellerGross / grossTotal) * Number(order.commissionFee ?? 0));
          const payoutNet = sellerGross - allocatedCommission;
          if (payoutNet <= 0) continue;

          const row = grouped.get(sid);
          if (!row) {
            grouped.set(sid, {
              sellerId: sid,
              sellerName: seller.shopName,
              payoutMethod: seller.payoutMethod ?? null,
              payoutNumber: seller.payoutNumber ?? null,
              totalOwed: payoutNet,
              orderCodeSet: new Set([order.code]),
            });
          } else {
            row.totalOwed += payoutNet;
            row.orderCodeSet.add(order.code);
          }
        }
      }

      const pending = Array.from(grouped.values())
        .map((x) => ({
          seller_id: x.sellerId,
          seller_name: x.sellerName,
          payout_method: x.payoutMethod,
          payout_number: x.payoutNumber,
          total_owed: x.totalOwed,
          order_count: x.orderCodeSet.size,
          order_codes: Array.from(x.orderCodeSet),
        }))
        .sort((a, b) => b.total_owed - a.total_owed);

      return { success: true, pending };
    }),

  payoutHistory: publicQuery
    .input(z.object({ key: z.string(), limit: z.number().default(100) }))
    .query(async ({ input }) => {
      requireAdmin(input.key);
      const db = getDb();
      const rows = await db
        .select({ payout: payouts, seller: sellers })
        .from(payouts)
        .leftJoin(sellers, eq(payouts.sellerId, sellers.id))
        .orderBy(desc(payouts.createdAt))
        .limit(input.limit);
      return { success: true, payouts: rows.map(r => ({ ...r.payout, sellerName: r.seller?.shopName ?? "Unknown" })) };
    }),

  processPayout: publicQuery
    .input(z.object({
      key: z.string(),
      sellerId: z.number(),
      amount: z.number().positive(),
      orderCodes: z.union([z.string(), z.array(z.string())]),
      payoutMethod: z.string(),
      payoutNumber: z.string(),
      sellerName: z.string(),
    }))
    .mutation(async ({ input }) => {
      requireAdmin(input.key);
      const db = getDb();

      const orderCodes = normalizeOrderCodes(input.orderCodes);
      const reference = `UGS-PAYOUT-${input.sellerId}-${Date.now()}`;

      // Insert payout record as "processing"
      await db.insert(payouts).values({
        sellerId: input.sellerId,
        orderCodes: JSON.stringify(orderCodes),
        amount: Math.round(input.amount),
        payoutMethod: input.payoutMethod,
        payoutNumber: input.payoutNumber,
        status: "processing",
        reference,
      });

      // If Flutterwave is configured, attempt transfer
      if (FLW_SECRET) {
        const accountNumber = normalizeUgPhone(input.payoutNumber);
        if (!accountNumber) {
          await db.update(payouts).set({ status: "failed", failedReason: "Invalid payout number" }).where(eq(payouts.reference, reference));
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid payout number." });
        }

        const res = await flwFetch("/transfers", {
          method: "POST",
          body: JSON.stringify({
            account_bank: "MPS",
            account_number: accountNumber,
            amount: Math.round(input.amount),
            currency: "UGX",
            narration: `UG Souq payout to ${input.sellerName}`,
            reference,
            callback_url: `${process.env.APP_URL}/api/trpc/admin.payoutWebhook`,
            meta: [{ seller_id: input.sellerId }, { order_codes: orderCodes }],
          }),
        });

        const payload: any = await res.json().catch(() => ({}));
        await db.update(payouts).set({ flutterwaveResponse: JSON.stringify(payload) }).where(eq(payouts.reference, reference));

        if (!res.ok || payload?.status !== "success") {
          await db.update(payouts).set({ status: "failed", failedReason: payload?.message || "Payout failed" }).where(eq(payouts.reference, reference));
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: payload?.message || "Payout failed" });
        }

        await db.update(payouts).set({ status: "completed", processedAt: new Date() }).where(eq(payouts.reference, reference));
      } else {
        // No Flutterwave — mark as completed manually (for testing/demo)
        await db.update(payouts).set({ status: "completed", processedAt: new Date() }).where(eq(payouts.reference, reference));
      }

      // Mark orders as paid out
      for (const code of orderCodes) {
        await db.update(orders).set({ paidOut: true, payoutRef: reference }).where(eq(orders.code, code));
      }

      await writeAudit({
        key: input.key,
        action: "payout.initiated",
        entityType: "seller",
        entityId: input.sellerId,
        meta: {
          sellerName: input.sellerName,
          amount: Math.round(input.amount),
          orderCodes,
          payoutMethod: input.payoutMethod,
          payoutNumber: input.payoutNumber,
          reference,
        },
      });

      await createNotification({
        type: "payout_completed",
        title: "Payout Completed",
        message: `UGX ${input.amount.toLocaleString()} sent to ${input.sellerName}.`,
        entityType: "seller",
        entityId: String(input.sellerId),
      });

      return {
        success: true,
        message: "Payout completed",
        reference,
      };
    }),

  // Webhook endpoint - NO admin key required (called by Flutterwave)
  payoutWebhook: publicQuery
    .input(z.any())
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const payload = input;

      // Verify webhook signature if secret is configured
      const signature = (ctx as any)?.req?.headers?.["verif-hash"] ?? "";
      const rawBody = JSON.stringify(payload);
      if (FLW_WEBHOOK_SECRET && signature && !verifyWebhookSignature(rawBody, signature)) {
        console.error("[FLW WEBHOOK] Invalid signature received");
        return { received: false, error: "Invalid signature" };
      }

      console.log("[FLUTTERWAVE WEBHOOK] Received:", JSON.stringify(payload));

      if (payload?.event === "transfer.completed" || payload?.event === "transfer.failed") {
        const data = payload?.data;
        const reference = String(data?.reference ?? "");
        const status = String(data?.status ?? "").toUpperCase();

        if (!reference) return { received: true };

        if (payload?.event === "transfer.failed" || (status && status !== "SUCCESSFUL")) {
          await db.update(payouts).set({ status: "rolled_back", failedReason: payload?.data?.complete_message || "Transfer failed" }).where(eq(payouts.reference, reference));
          await db.update(orders).set({ paidOut: false, payoutRef: null }).where(eq(orders.payoutRef, reference));
          await db.insert(adminAuditLogs).values({
            actorTag: "system-webhook",
            action: "payout.webhook.rollback",
            entityType: "payout_reference",
            entityId: reference,
            meta: JSON.stringify({ status, event: payload?.event ?? null, data: payload?.data }),
          });
        } else if (status === "SUCCESSFUL") {
          await db.update(payouts).set({ status: "completed", processedAt: new Date() }).where(eq(payouts.reference, reference));
          await db.insert(adminAuditLogs).values({
            actorTag: "system-webhook",
            action: "payout.webhook.success",
            entityType: "payout_reference",
            entityId: reference,
            meta: JSON.stringify({ status, event: payload?.event ?? null }),
          });
        }
      }

      return { received: true };
    }),

  // Test endpoint to verify Flutterwave keys are working
  testFlutterwave: publicQuery
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      requireAdmin(input.key);

      if (!FLW_SECRET) {
        return { ok: false, message: "FLW_SECRET_KEY not configured. Add it to Railway Variables." };
      }

      try {
        // Test by getting balance
        const res = await flwFetch("/balances/UGX");
        const data: any = await res.json().catch(() => ({}));

        if (res.ok && data?.status === "success") {
          return { 
            ok: true, 
            message: "Flutterwave connection successful!", 
            balance: data?.data?.available_balance,
            currency: data?.data?.currency,
            mode: FLW_SECRET.includes("TEST") ? "TEST MODE" : "LIVE MODE"
          };
        }
        return { ok: false, message: data?.message || "Connection failed", response: data };
      } catch (e: any) {
        return { ok: false, message: e.message || "Network error" };
      }
    }),

  // ============================================
  // PLATFORM SETTINGS
  // ============================================
  settings: publicQuery.input(z.object({ key: z.string() })).query(async ({ input }) => {
    requireAdmin(input.key);
    const db = getDb();
    const [row] = await db.select().from(platformSettings);
    return row ?? {
      id: 1,
      commissionRate: "0.0700",
      deliveryFeeBase: 3000,
      deliveryFeePerKm: 500,
      platformName: "UG Souq",
      platformEmail: "support@ugsouq.com",
      enableCashOnDelivery: true,
      enableMtnMomo: true,
      enableAirtelMoney: true,
      minOrderAmount: 5000,
      freeDeliveryThreshold: 100000,
    };
  }),

  updateSettings: publicQuery
    .input(z.object({
      key: z.string(),
      commissionRate: z.number().min(0).max(1).optional(),
      deliveryFeeBase: z.number().min(0).optional(),
      deliveryFeePerKm: z.number().min(0).optional(),
      platformName: z.string().optional(),
      platformEmail: z.string().email().optional(),
      enableCashOnDelivery: z.boolean().optional(),
      enableMtnMomo: z.boolean().optional(),
      enableAirtelMoney: z.boolean().optional(),
      minOrderAmount: z.number().min(0).optional(),
      freeDeliveryThreshold: z.number().min(0).optional(),
    }))
    .mutation(async ({ input }) => {
      requireAdmin(input.key);
      const db = getDb();
      const [before] = await db.select().from(platformSettings);
      const updates: any = {};
      if (input.commissionRate !== undefined) updates.commissionRate = input.commissionRate.toFixed(4);
      if (input.deliveryFeeBase !== undefined) updates.deliveryFeeBase = input.deliveryFeeBase;
      if (input.deliveryFeePerKm !== undefined) updates.deliveryFeePerKm = input.deliveryFeePerKm;
      if (input.platformName !== undefined) updates.platformName = input.platformName;
      if (input.platformEmail !== undefined) updates.platformEmail = input.platformEmail;
      if (input.enableCashOnDelivery !== undefined) updates.enableCashOnDelivery = input.enableCashOnDelivery;
      if (input.enableMtnMomo !== undefined) updates.enableMtnMomo = input.enableMtnMomo;
      if (input.enableAirtelMoney !== undefined) updates.enableAirtelMoney = input.enableAirtelMoney;
      if (input.minOrderAmount !== undefined) updates.minOrderAmount = input.minOrderAmount;
      if (input.freeDeliveryThreshold !== undefined) updates.freeDeliveryThreshold = input.freeDeliveryThreshold;

      await db.insert(platformSettings).values({ id: 1, ...updates }).onDuplicateKeyUpdate({ set: updates });
      await writeAudit({ key: input.key, action: "settings.updated", entityType: "platform_settings", entityId: 1, beforeState: before, afterState: updates });
      return { ok: true };
    }),

  // ============================================
  // NOTIFICATIONS
  // ============================================
  notifications: publicQuery.input(z.object({ key: z.string(), unreadOnly: z.boolean().default(false) })).query(async ({ input }) => {
    requireAdmin(input.key);
    const db = getDb();
    let query = db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(100);
    const rows = await query;
    if (input.unreadOnly) return rows.filter((n) => !n.isRead);
    return rows;
  }),

  markNotificationRead: publicQuery
    .input(z.object({ key: z.string(), id: z.number() }))
    .mutation(async ({ input }) => {
      requireAdmin(input.key);
      const db = getDb();
      await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, input.id));
      return { ok: true };
    }),

  markAllNotificationsRead: publicQuery
    .input(z.object({ key: z.string() }))
    .mutation(async ({ input }) => {
      requireAdmin(input.key);
      const db = getDb();
      await db.update(notifications).set({ isRead: true }).where(eq(notifications.isRead, false));
      return { ok: true };
    }),

  // ============================================
  // RETURNS / DISPUTES
  // ============================================
  returns: publicQuery.input(z.object({ key: z.string(), status: z.string().optional() })).query(async ({ input }) => {
    requireAdmin(input.key);
    const db = getDb();
    let query = db.select().from(returns).orderBy(desc(returns.createdAt));
    const rows = await query;
    if (input.status) return rows.filter((r) => r.status === input.status);
    return rows;
  }),

  createReturn: publicQuery
    .input(z.object({
      key: z.string(),
      orderId: z.number(),
      orderCode: z.string(),
      customerName: z.string(),
      customerPhone: z.string(),
      reason: z.string(),
      refundAmount: z.number().default(0),
    }))
    .mutation(async ({ input }) => {
      requireAdmin(input.key);
      const db = getDb();
      const [ret] = await db.insert(returns).values({
        orderId: input.orderId,
        orderCode: input.orderCode,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        reason: input.reason,
        refundAmount: input.refundAmount,
      }).$returningId();
      await writeAudit({ key: input.key, action: "return.created", entityType: "return", entityId: ret.id, meta: { orderCode: input.orderCode, reason: input.reason } });
      await createNotification({ type: "order_cancelled", title: "Return Requested", message: `Return requested for order ${input.orderCode}.`, entityType: "return", entityId: String(ret.id) });
      return { ok: true, id: ret.id };
    }),

  updateReturnStatus: publicQuery
    .input(z.object({ key: z.string(), id: z.number(), status: z.enum(["requested", "approved", "rejected", "picked_up", "refunded", "closed"]), adminNotes: z.string().optional() }))
    .mutation(async ({ input }) => {
      requireAdmin(input.key);
      const db = getDb();
      const updates: any = { status: input.status };
      if (input.adminNotes !== undefined) updates.adminNotes = input.adminNotes;
      if (input.status === "refunded" || input.status === "closed") updates.resolvedAt = new Date();
      await db.update(returns).set(updates).where(eq(returns.id, input.id));
      await writeAudit({ key: input.key, action: "return.status.changed", entityType: "return", entityId: input.id, meta: { status: input.status } });
      return { ok: true };
    }),

  // ============================================
  // AFFILIATES
  // ============================================
  affiliates: publicQuery.input(z.object({ key: z.string() })).query(async ({ input }) => {
    requireAdmin(input.key);
    const db = getDb();
    return db.select().from(affiliates).orderBy(desc(affiliates.createdAt));
  }),

  // ============================================
  // AUDIT LOG
  // ============================================
  auditLog: publicQuery.input(z.object({ key: z.string() })).query(async ({ input }) => {
    requireAdmin(input.key);
    const db = getDb();
    return db.select().from(adminAuditLogs).orderBy(desc(adminAuditLogs.createdAt)).limit(300);
  }),
});
