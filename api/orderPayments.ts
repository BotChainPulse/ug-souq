import { and, eq, lt, or, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "./queries/connection";
import {
  listings,
  notifications,
  orderItems,
  orderPayments,
  orders,
  products,
} from "../db/schema";
import { appUrl, flutterwave } from "./flutterwave";

export type DeliveryZoneId = "kampala" | "upcountry";
export type DeliveryMethod = "door" | "pickup";

const DELIVERY_FEES: Record<DeliveryZoneId, Record<DeliveryMethod, number>> = {
  kampala: { door: 4600, pickup: 2900 },
  upcountry: { door: 9000, pickup: 5000 },
};

export function serverDeliveryFee(
  zone: DeliveryZoneId,
  method: DeliveryMethod,
  plusActive: boolean
) {
  return plusActive ? 0 : DELIVERY_FEES[zone][method];
}

export function isVerifiedOrderPayment(
  data: any,
  expected: { reference: string; amount: number; currency: string }
) {
  return Boolean(
    data?.status === "successful" &&
    data?.tx_ref === expected.reference &&
    data?.currency === expected.currency &&
    Number(data?.amount) === expected.amount
  );
}

function paymentReference(orderCode: string) {
  return `ORDER-${orderCode}-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

async function restoreReservedInventory(orderId: number) {
  const db = getDb();
  await db.transaction(async tx => {
    // Claim the reservation before restoring it so duplicate callbacks cannot add stock twice.
    const updateResult: any = await tx
      .update(orders)
      .set({ inventoryStatus: "released", reservationExpiresAt: null })
      .where(
        and(eq(orders.id, orderId), eq(orders.inventoryStatus, "reserved"))
      );
    const affectedRows = Number(
      updateResult?.[0]?.affectedRows ?? updateResult?.affectedRows ?? 0
    );
    if (affectedRows !== 1) return;
    const items = await tx
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));
    for (const item of items.filter(line => line.itemType === "product")) {
      await tx
        .update(products)
        .set({ stock: sql`${products.stock} + ${item.qty}` })
        .where(eq(products.id, item.itemId));
    }
    for (const item of items.filter(line => line.itemType === "listing")) {
      await tx
        .update(listings)
        .set({ stock: sql`${listings.stock} + ${item.qty}` })
        .where(eq(listings.id, item.itemId));
    }
  });
}

export async function releaseOrderInventoryOnCancellation(orderId: number) {
  const db = getDb();
  await db.transaction(async tx => {
    const updateResult: any = await tx.update(orders)
      .set({ inventoryStatus: "released", reservationExpiresAt: null })
      .where(and(eq(orders.id, orderId), or(eq(orders.inventoryStatus, "reserved"), eq(orders.inventoryStatus, "committed"))));
    const affectedRows = Number(updateResult?.[0]?.affectedRows ?? updateResult?.affectedRows ?? 0);
    if (affectedRows !== 1) return;
    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    for (const item of items.filter(line => line.itemType === "product")) {
      await tx.update(products).set({ stock: sql`${products.stock} + ${item.qty}` }).where(eq(products.id, item.itemId));
    }
    for (const item of items.filter(line => line.itemType === "listing")) {
      await tx.update(listings).set({ stock: sql`${listings.stock} + ${item.qty}` }).where(eq(listings.id, item.itemId));
    }
  });
}

async function commitOrReacquireInventory(tx: any, orderId: number) {
  // Serialise duplicate redirect/webhook deliveries for the same order.
  await tx.execute(sql`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`);
  const [order] = await tx.select().from(orders).where(eq(orders.id, orderId));
  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (order.inventoryStatus === "committed" || order.inventoryStatus === "not_applicable") return;
  if (order.inventoryStatus === "reserved") {
    await tx.update(orders).set({ inventoryStatus: "committed", reservationExpiresAt: null }).where(eq(orders.id, orderId));
    return;
  }

  // A genuinely successful but very late payment may arrive after its reservation expired.
  // Re-acquire the exact saved quantities atomically; never silently oversell.
  const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  for (const item of items.filter((line: any) => line.itemType === "product")) {
    const stockResult: any = await tx.update(products)
      .set({ stock: sql`${products.stock} - ${item.qty}` })
      .where(and(eq(products.id, item.itemId), sql`${products.stock} >= ${item.qty}`));
    const affectedRows = Number(stockResult?.[0]?.affectedRows ?? stockResult?.affectedRows ?? 0);
    if (affectedRows !== 1) throw new Error("STOCK_UNAVAILABLE");
  }
  for (const item of items.filter((line: any) => line.itemType === "listing")) {
    const stockResult: any = await tx.update(listings)
      .set({ stock: sql`${listings.stock} - ${item.qty}` })
      .where(and(eq(listings.id, item.itemId), eq(listings.status, "approved"), sql`${listings.stock} >= ${item.qty}`));
    const affectedRows = Number(stockResult?.[0]?.affectedRows ?? stockResult?.affectedRows ?? 0);
    if (affectedRows !== 1) throw new Error("STOCK_UNAVAILABLE");
  }
  await tx.update(orders).set({ inventoryStatus: "committed", reservationExpiresAt: null }).where(eq(orders.id, orderId));
}

export async function releaseExpiredOrderReservations() {
  const db = getDb();
  const expired = await db
    .select({ id: orders.id })
    .from(orders)
    .where(
      and(
        eq(orders.inventoryStatus, "reserved"),
        lt(orders.reservationExpiresAt, new Date())
      )
    )
    .limit(50);
  await Promise.all(expired.map(({ id }) => restoreReservedInventory(id)));
}

export async function createOrderCheckout({
  order,
  email,
}: {
  order: typeof orders.$inferSelect;
  email: string;
}) {
  const db = getDb();
  const reference = paymentReference(order.code);
  await db.insert(orderPayments).values({
    orderId: order.id,
    reference,
    amount: order.total,
    currency: "UGX",
    status: "pending",
  });
  await db
    .update(orders)
    .set({ paymentStatus: "pending", paymentRef: reference })
    .where(eq(orders.id, order.id));

  let response: Response;
  try {
    response = await flutterwave("/payments", {
      method: "POST",
      body: JSON.stringify({
        tx_ref: reference,
        amount: order.total,
        currency: "UGX",
        redirect_url: `${appUrl()}/api/orders/payment/callback`,
        payment_options: "mobilemoneyuganda,card",
        customer: {
          email,
          name: order.customerName,
          phonenumber: order.phone,
        },
        customizations: {
          title: "UG Souq order payment",
          description: `Payment for order ${order.code}`,
        },
        meta: {
          purpose: "ug_souq_order",
          order_id: order.id,
          order_code: order.code,
        },
      }),
    });
  } catch (error) {
    await failOrderPayment(reference, {
      error: error instanceof Error ? error.message : "Network error",
    });
    throw error;
  }

  const payload: any = await response.json().catch(() => ({}));
  const checkoutUrl = payload?.data?.link;
  if (!response.ok || !checkoutUrl) {
    await failOrderPayment(reference, payload);
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message:
        payload?.message ||
        "Could not start Flutterwave checkout. Please try again.",
    });
  }
  return { checkoutUrl: String(checkoutUrl), reference };
}

async function failOrderPayment(reference: string, providerResponse: unknown) {
  const db = getDb();
  const [payment] = await db
    .select()
    .from(orderPayments)
    .where(eq(orderPayments.reference, reference));
  if (!payment || payment.status === "successful") return;
  await db
    .update(orderPayments)
    .set({ status: "failed", providerResponse })
    .where(eq(orderPayments.id, payment.id));
  await db
    .update(orders)
    .set({ paymentStatus: "failed" })
    .where(eq(orders.id, payment.orderId));
  await restoreReservedInventory(payment.orderId);
}

export async function cancelOrderPayment(reference: string) {
  const db = getDb();
  const [payment] = await db
    .select()
    .from(orderPayments)
    .where(eq(orderPayments.reference, reference));
  if (!payment) return null;
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, payment.orderId));
  if (payment.status === "successful")
    return order ? { code: order.code } : null;
  await db
    .update(orderPayments)
    .set({ status: "cancelled" })
    .where(eq(orderPayments.id, payment.id));
  await db
    .update(orders)
    .set({ paymentStatus: "failed" })
    .where(eq(orders.id, payment.orderId));
  await restoreReservedInventory(payment.orderId);
  return order ? { code: order.code } : null;
}

export async function verifyOrderPayment(
  transactionId: string,
  expectedReference?: string
) {
  const db = getDb();
  const response = await flutterwave(
    `/transactions/${encodeURIComponent(transactionId)}/verify`
  );
  const payload: any = await response.json().catch(() => ({}));
  const data = payload?.data;
  const reference = String(data?.tx_ref ?? expectedReference ?? "");
  const [payment] = reference
    ? await db
        .select()
        .from(orderPayments)
        .where(eq(orderPayments.reference, reference))
    : [];
  if (!payment) throw new Error("Order payment reference was not found.");
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, payment.orderId));
  if (!order) throw new Error("Order was not found for this payment.");
  if (payment.status === "successful" && order.paymentStatus === "paid") {
    return {
      ok: order.paymentStatus === "paid",
      requiresReview: order.status === "cancelled",
      code: order.code,
      reference: payment.reference,
    };
  }

  if (!response.ok || !isVerifiedOrderPayment(data, payment)) {
    await failOrderPayment(payment.reference, payload);
    return {
      ok: false,
      requiresReview: false,
      code: order.code,
      reference: payment.reference,
    };
  }

  const [usedTransaction] = await db
    .select({ id: orderPayments.id })
    .from(orderPayments)
    .where(eq(orderPayments.transactionId, String(transactionId)));
  if (usedTransaction && usedTransaction.id !== payment.id) {
    await failOrderPayment(payment.reference, {
      error: "Transaction ID was already used.",
    });
    return {
      ok: false,
      requiresReview: false,
      code: order.code,
      reference: payment.reference,
    };
  }

  const now = new Date();
  let inventoryCommitted = true;
  try {
    await db.transaction(async tx => {
      await commitOrReacquireInventory(tx, order.id);
      await tx.update(orderPayments).set({ status: "successful", transactionId: String(transactionId), providerResponse: payload, verifiedAt: now }).where(eq(orderPayments.id, payment.id));
      await tx.update(orders).set({ paymentStatus: "paid", paymentRef: payment.reference, inventoryStatus: "committed", reservationExpiresAt: null }).where(eq(orders.id, order.id));
    });
  } catch (error) {
    if (!(error instanceof Error) || error.message !== "STOCK_UNAVAILABLE") throw error;
    inventoryCommitted = false;
    await db.transaction(async tx => {
      await tx.update(orderPayments).set({ status: "successful", transactionId: String(transactionId), providerResponse: payload, verifiedAt: now }).where(eq(orderPayments.id, payment.id));
      await tx.update(orders).set({ paymentStatus: "paid", paymentRef: payment.reference, status: "cancelled", inventoryStatus: "released", reservationExpiresAt: null }).where(eq(orders.id, order.id));
      await tx.insert(notifications).values({
        type: "payment_received",
        title: `Paid order ${order.code} needs refund review`,
        message: "Flutterwave verified this payment after its stock reservation expired, but stock was no longer available.",
        entityType: "order",
        entityId: String(order.id),
      });
    });
  }
  return {
    ok: true,
    requiresReview: !inventoryCommitted,
    code: order.code,
    reference: payment.reference,
  };
}
