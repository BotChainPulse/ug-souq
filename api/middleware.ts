import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import { desc, eq, sql } from "drizzle-orm";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { getDb } from "./queries/connection";
import { listings, notifications, orderItems, orders, paymentTransactions, products, returns } from "../db/schema";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

const normPhone = (value: string) => value.replace(/[\s-]+/g, "").trim();
const OPEN_CANCELLATION_REQUESTS = new Set(["requested", "approved", "picked_up"]);

async function cancelPlacedUnpaidOrder(orderId: number) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [locked] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    if (!locked || locked.status !== "placed" || locked.paymentStatus !== "unpaid") return false;

    // Do not auto/direct-cancel after a hosted payment attempt has started. A late provider
    // confirmation could otherwise arrive after stock was released. Those cases go through
    // the cancellation/refund-request path below.
    const paymentRows = await tx.select().from(paymentTransactions).where(eq(paymentTransactions.orderId, orderId));
    if (paymentRows.some((row) => row.status === "pending" || row.status === "completed")) return false;

    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    for (const item of items) {
      if (item.itemType === "product") {
        await tx.update(products)
          .set({ stock: sql`${products.stock} + ${item.qty}` })
          .where(eq(products.id, item.itemId));
      } else if (item.itemType === "listing") {
        await tx.update(listings)
          .set({ stock: sql`${listings.stock} + ${item.qty}` })
          .where(eq(listings.id, item.itemId));
      }
    }

    await tx.update(orders).set({ status: "cancelled" }).where(eq(orders.id, orderId));
    await tx.insert(notifications).values({
      type: "order_cancelled",
      title: "Order cancelled by buyer",
      message: `Buyer cancelled order ${locked.code} before fulfilment. Reserved stock was restored.`,
      entityType: "order",
      entityId: String(locked.id),
    });
    return true;
  });
}

async function createCancellationRequest(order: typeof orders.$inferSelect, reason: string) {
  const db = getDb();
  const existing = await db.select().from(returns)
    .where(eq(returns.orderId, Number(order.id)))
    .orderBy(desc(returns.createdAt));
  const open = existing.find((row) => OPEN_CANCELLATION_REQUESTS.has(row.status));
  if (open) return { id: Number(open.id), created: false };

  const refundAmount = order.paymentStatus === "paid" ? order.total : 0;
  const [request] = await db.insert(returns).values({
    orderId: Number(order.id),
    orderCode: order.code,
    customerName: order.customerName,
    customerPhone: order.phone,
    reason: `Cancellation request: ${reason}`,
    refundAmount,
  }).$returningId();

  await db.insert(notifications).values({
    type: "order_cancelled",
    title: "Buyer requested cancellation",
    message: `Cancellation requested for order ${order.code}. Review fulfilment and payment status before approving.`,
    entityType: "order",
    entityId: String(order.id),
  });
  return { id: Number(request.id), created: true };
}

async function hasOpenCancellationRequest(orderId: number) {
  const db = getDb();
  const existing = await db.select().from(returns)
    .where(eq(returns.orderId, orderId))
    .orderBy(desc(returns.createdAt));
  return existing.some((row) => OPEN_CANCELLATION_REQUESTS.has(row.status));
}

const buyerOrdersRouter = t.router({
  cancellationStatus: t.procedure
    .input(z.object({
      code: z.string().trim().min(4).max(32),
      phone: z.string().trim().min(9).max(32),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      const code = input.code.trim().toUpperCase();
      const phone = normPhone(input.phone);
      const [order] = await db.select().from(orders).where(eq(orders.code, code)).limit(1);

      if (!order || normPhone(order.phone) !== phone) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found for that code and phone number." });
      }

      if (order.status === "cancelled") {
        return { pending: false, status: "cancelled" as const, requestId: null };
      }

      const existing = await db.select().from(returns)
        .where(eq(returns.orderId, Number(order.id)))
        .orderBy(desc(returns.createdAt));
      const open = existing.find((row) => OPEN_CANCELLATION_REQUESTS.has(row.status));
      if (!open) return { pending: false, status: null, requestId: null };

      return {
        pending: true,
        status: open.status,
        requestId: Number(open.id),
      };
    }),

  cancellationStatuses: t.procedure
    .input(z.object({
      phone: z.string().trim().min(9).max(32),
      codes: z.array(z.string().trim().min(4).max(32)).max(20),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      const phone = normPhone(input.phone);
      const result: Record<string, boolean> = {};

      for (const rawCode of [...new Set(input.codes)]) {
        const code = rawCode.trim().toUpperCase();
        const [order] = await db.select().from(orders).where(eq(orders.code, code)).limit(1);
        if (!order || normPhone(order.phone) !== phone || order.status === "cancelled") {
          result[code] = false;
          continue;
        }
        result[code] = await hasOpenCancellationRequest(Number(order.id));
      }

      return result;
    }),

  cancel: t.procedure
    .input(z.object({
      code: z.string().trim().min(4).max(32),
      phone: z.string().trim().min(9).max(32),
      reason: z.string().trim().min(3).max(180),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const code = input.code.trim().toUpperCase();
      const phone = normPhone(input.phone);
      const [order] = await db.select().from(orders).where(eq(orders.code, code)).limit(1);

      if (!order || normPhone(order.phone) !== phone) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found for that code and phone number." });
      }
      if (order.status === "cancelled") {
        return { outcome: "already_cancelled" as const, message: "This order is already cancelled." };
      }
      if (order.status === "delivered") {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This order has already been delivered. Use Returns & refunds instead." });
      }
      if (order.status === "on_the_way") {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This order is already on the way. Please contact support for urgent help." });
      }

      if (order.status === "placed" && order.paymentStatus === "unpaid") {
        const cancelled = await cancelPlacedUnpaidOrder(Number(order.id));
        if (cancelled) {
          return { outcome: "cancelled" as const, message: "Order cancelled. Reserved stock has been released." };
        }
      }

      // Confirmed/preparing orders and any order with a payment attempt require review so
      // fulfilment can be stopped safely and a paid transaction can be refunded correctly.
      await createCancellationRequest(order, input.reason);
      return {
        outcome: "requested" as const,
        message: order.paymentStatus === "paid"
          ? "Cancellation requested. We will review the order and arrange the refund if approved."
          : "Cancellation requested. We will stop fulfilment if it has not progressed too far.",
      };
    }),

  expireStale: t.procedure
    .input(z.object({ phone: z.string().trim().min(9).max(32) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const phone = normPhone(input.phone);
      const cutoff = Date.now() - 30 * 60 * 1000;
      const candidates = await db.select().from(orders)
        .where(eq(orders.phone, phone))
        .orderBy(desc(orders.createdAt))
        .limit(50);

      let cancelled = 0;
      for (const order of candidates) {
        if (order.status !== "placed" || order.paymentStatus !== "unpaid" || order.paymentMethod === "cash") continue;
        const createdAt = new Date(order.createdAt).getTime();
        if (!Number.isFinite(createdAt) || createdAt > cutoff) continue;
        if (await cancelPlacedUnpaidOrder(Number(order.id))) cancelled += 1;
      }
      return { cancelled };
    }),
});

// Most of the codebase builds routers through this helper. Adding the buyer-order router here keeps
// the existing app router API intact while making the secure cancellation endpoints available at
// the root. Nested routers also carry the helper route; clients use only root buyerOrders.*.
export function createRouter<T extends Record<string, any>>(record: T) {
  return t.router({ ...record, buyerOrders: buyerOrdersRouter });
}

export const publicQuery = t.procedure;

// UG Souq's marketplace commission on the product subtotal (delivery fee is not commissioned)
export const COMMISSION_RATE = 0.07;
