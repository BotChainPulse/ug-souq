import { eq } from "drizzle-orm";
import { getDb } from "./queries/connection";
import { customers, plusMemberships, plusPayments } from "../db/schema";

const FLW_BASE = "https://api.flutterwave.com/v3";
const PLUS_PRICE_UGX = Math.max(1, Number.parseInt(process.env.PLUS_MONTHLY_PRICE_UGX ?? "10000", 10) || 10000);
const PLUS_DURATION_DAYS = Math.max(1, Number.parseInt(process.env.PLUS_DURATION_DAYS ?? "30", 10) || 30);

export const plusPlan = {
  amount: PLUS_PRICE_UGX,
  currency: "UGX",
  durationDays: PLUS_DURATION_DAYS,
};

function appUrl() {
  const value = process.env.APP_URL?.replace(/\/$/, "");
  if (!value) throw new Error("Plus payments are not configured. Set APP_URL in Railway Variables.");
  return value;
}

function flutterwaveSecret() {
  const key = process.env.FLW_SECRET_KEY;
  if (!key) throw new Error("Plus payments are not configured. Set FLW_SECRET_KEY in Railway Variables.");
  return key;
}

function reference() {
  return `PLUS-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

async function flutterwave(path: string, init: RequestInit = {}) {
  return fetch(`${FLW_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${flutterwaveSecret()}`, "Content-Type": "application/json", ...init.headers },
  });
}

export async function createPlusCheckout({ customer, email }: { customer: typeof customers.$inferSelect; email: string }) {
  const db = getDb();
  const txRef = reference();
  const [existing] = await db.select().from(plusMemberships).where(eq(plusMemberships.customerId, customer.id));
  let membershipId = existing?.id ?? null;
  if (existing) {
    await db.update(plusMemberships).set({ status: "pending", plan: "monthly", provider: "flutterwave", providerReference: txRef }).where(eq(plusMemberships.id, existing.id));
  } else {
    const [created] = await db.insert(plusMemberships).values({ customerId: customer.id, plan: "monthly", status: "pending", provider: "flutterwave", providerReference: txRef }).$returningId();
    membershipId = created.id;
  }
  await db.insert(plusPayments).values({ customerId: customer.id, membershipId, reference: txRef, amount: PLUS_PRICE_UGX, currency: "UGX", status: "pending" });

  let response: Response;
  try {
    response = await flutterwave("/payments", {
      method: "POST",
      body: JSON.stringify({
        tx_ref: txRef,
        amount: PLUS_PRICE_UGX,
        currency: "UGX",
        redirect_url: `${appUrl()}/api/plus/callback`,
        customer: { email, name: customer.name, phonenumber: customer.phone },
        customizations: { title: "UG Souq Plus", description: `${PLUS_DURATION_DAYS}-day Plus membership` },
        meta: { purpose: "ug_souq_plus", customer_id: customer.id, membership_id: membershipId },
      }),
    });
  } catch (error) {
    await db.update(plusPayments).set({ status: "failed", providerResponse: { error: error instanceof Error ? error.message : "Network error" } }).where(eq(plusPayments.reference, txRef));
    throw error;
  }
  const payload: any = await response.json().catch(() => ({}));
  const link = payload?.data?.link;
  if (!response.ok || !link) {
    await db.update(plusPayments).set({ status: "failed", providerResponse: payload }).where(eq(plusPayments.reference, txRef));
    await db.update(plusMemberships).set({ status: "payment_failed" }).where(eq(plusMemberships.customerId, customer.id));
    throw new Error(payload?.message || "Could not start the Flutterwave checkout. Please try again.");
  }
  return { checkoutUrl: link, reference: txRef, amount: PLUS_PRICE_UGX, currency: "UGX", durationDays: PLUS_DURATION_DAYS };
}

// Verifies with Flutterwave before making any entitlement active. Safe to call from both redirect and webhook.
export async function verifyPlusPayment(transactionId: string, expectedReference?: string) {
  const db = getDb();
  const response = await flutterwave(`/transactions/${encodeURIComponent(transactionId)}/verify`);
  const payload: any = await response.json().catch(() => ({}));
  const data = payload?.data;
  const txRef = String(data?.tx_ref ?? expectedReference ?? "");
  const [payment] = txRef ? await db.select().from(plusPayments).where(eq(plusPayments.reference, txRef)) : [];
  if (!payment) throw new Error("Plus payment reference was not found.");
  if (payment.status === "successful") {
    const [membership] = await db.select().from(plusMemberships).where(eq(plusMemberships.customerId, payment.customerId));
    return { ok: membership?.status === "active", reference: payment.reference, expiresAt: membership?.expiresAt ?? null };
  }
  const valid = response.ok && data?.status === "successful" && data?.currency === payment.currency && Number(data?.amount) >= payment.amount && data?.tx_ref === payment.reference;
  if (!valid) {
    await db.update(plusPayments).set({ status: "failed", transactionId, providerResponse: payload }).where(eq(plusPayments.id, payment.id));
    await db.update(plusMemberships).set({ status: "payment_failed" }).where(eq(plusMemberships.customerId, payment.customerId));
    return { ok: false, reference: payment.reference };
  }
  const now = new Date();
  const startsAt = now;
  const expiresAt = new Date(now.getTime() + PLUS_DURATION_DAYS * 24 * 60 * 60 * 1000);
  await db.update(plusPayments).set({ status: "successful", transactionId, providerResponse: payload, verifiedAt: now }).where(eq(plusPayments.id, payment.id));
  await db.update(plusMemberships).set({ status: "active", startsAt, expiresAt, provider: "flutterwave", providerReference: payment.reference }).where(eq(plusMemberships.customerId, payment.customerId));
  return { ok: true, reference: payment.reference, expiresAt };
}

export function isValidFlutterwaveWebhook(signature: string | undefined) {
  const secret = process.env.FLW_WEBHOOK_SECRET;
  // Refuse webhook activation unless its signing secret is explicitly configured.
  return Boolean(secret && signature && signature === secret);
}

