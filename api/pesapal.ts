import { randomBytes } from "crypto";
import { and, eq, or } from "drizzle-orm";
import { orders, paymentTransactions } from "../db/schema";
import { getDb } from "./queries/connection";
import { validatePesapalTransaction, type PesapalStatus } from "./pesapalStatus";

const baseUrl = () => process.env.PESAPAL_ENV === "live"
  ? "https://pay.pesapal.com/v3"
  : "https://cybqa.pesapal.com/pesapalv3";

function required(name: "PESAPAL_CONSUMER_KEY" | "PESAPAL_CONSUMER_SECRET" | "PESAPAL_IPN_ID" | "APP_URL") {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Pesapal is not configured. Add ${name} to Railway Variables.`);
  return value;
}

export function pesapalConfigured() {
  return Boolean(process.env.PESAPAL_CONSUMER_KEY && process.env.PESAPAL_CONSUMER_SECRET && process.env.PESAPAL_IPN_ID && process.env.APP_URL);
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.value;
  const response = await fetch(`${baseUrl()}/api/Auth/RequestToken`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      consumer_key: required("PESAPAL_CONSUMER_KEY"),
      consumer_secret: required("PESAPAL_CONSUMER_SECRET"),
    }),
  });
  const body: any = await response.json().catch(() => ({}));
  if (!response.ok || !body?.token) throw new Error(body?.error?.message || body?.message || "Pesapal authentication failed.");
  cachedToken = { value: body.token, expiresAt: Date.now() + 4 * 60_000 };
  return body.token as string;
}

async function pesapalFetch(path: string, init: RequestInit = {}) {
  const response = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${await accessToken()}`, ...init.headers },
  });
  const body: any = await response.json().catch(() => ({}));
  if (!response.ok || body?.error) throw new Error(body?.error?.message || body?.message || "Pesapal request failed.");
  return body;
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return { firstName: parts[0] || "Customer", lastName: parts.slice(1).join(" ") };
}

function maskPaymentAccount(value: unknown) {
  const account = String(value ?? "").trim();
  if (!account) return null;
  if (account.length <= 4) return "****";
  return `${"*".repeat(Math.min(account.length - 4, 12))}${account.slice(-4)}`;
}

export async function createPesapalPayment(order: typeof orders.$inferSelect) {
  if (order.paymentMethod === "cash") throw new Error("Cash-on-delivery orders do not require Pesapal.");
  if (order.paymentStatus === "paid") throw new Error("This order is already paid.");
  const appUrl = required("APP_URL").replace(/\/$/, "");
  if (!/^https:\/\//i.test(appUrl)) throw new Error("APP_URL must be a public HTTPS address for Pesapal callbacks.");
  const merchantReference = `${order.code}-${randomBytes(6).toString("hex")}`.slice(0, 50);
  const names = splitName(order.customerName);
  const db = getDb();
  const [created] = await db.insert(paymentTransactions).values({
    orderId: order.id, merchantReference, amount: order.total, currency: "UGX", status: "pending",
  }).$returningId();

  try {
    const response = await pesapalFetch("/api/Transactions/SubmitOrderRequest", {
      method: "POST",
      body: JSON.stringify({
        id: merchantReference,
        currency: "UGX",
        amount: order.total,
        description: `UG Souq order ${order.code}`.slice(0, 100),
        callback_url: `${appUrl}/api/pesapal/callback`,
        cancellation_url: `${appUrl}/order/${encodeURIComponent(order.code)}?payment=cancelled`,
        redirect_mode: "TOP_WINDOW",
        notification_id: required("PESAPAL_IPN_ID"),
        branch: "UG Souq Online",
        billing_address: {
          phone_number: order.phone,
          country_code: "UG",
          first_name: names.firstName,
          last_name: names.lastName,
          line_1: order.address.slice(0, 100),
          city: "",
        },
      }),
    });
    if (!response?.order_tracking_id || !response?.redirect_url || response?.merchant_reference !== merchantReference) {
      throw new Error("Pesapal returned an incomplete or mismatched payment session.");
    }
    await db.transaction(async (tx) => {
      await tx.update(paymentTransactions).set({ trackingId: response.order_tracking_id }).where(eq(paymentTransactions.id, created.id));
      await tx.update(orders).set({ paymentStatus: "pending_confirmation", paymentRef: merchantReference }).where(eq(orders.id, order.id));
    });
    return { redirectUrl: response.redirect_url as string, merchantReference, trackingId: response.order_tracking_id as string, environment: process.env.PESAPAL_ENV === "live" ? "live" as const : "sandbox" as const };
  } catch (error) {
    await db.update(paymentTransactions).set({ status: "failed", providerResponse: { error: error instanceof Error ? error.message : "Payment session failed" } }).where(eq(paymentTransactions.id, created.id));
    throw error;
  }
}

export async function verifyPesapalPayment(trackingId: string, merchantReference?: string) {
  const db = getDb();
  const [transaction] = await db.select().from(paymentTransactions).where(
    merchantReference
      ? and(eq(paymentTransactions.trackingId, trackingId), eq(paymentTransactions.merchantReference, merchantReference))
      : or(eq(paymentTransactions.trackingId, trackingId), eq(paymentTransactions.merchantReference, trackingId)),
  ).limit(1);
  if (!transaction) throw new Error("Pesapal transaction was not found.");
  const response = await pesapalFetch(`/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(trackingId)}`);
  const checked = validatePesapalTransaction({ merchantReference: transaction.merchantReference, amount: transaction.amount, currency: transaction.currency }, response);
  const { providerReference, amount, currency } = checked;
  const finalStatus: PesapalStatus = checked.status;
  const safeResponse = {
    paymentMethod: response?.payment_method ?? null,
    amount: Number.isFinite(amount) ? amount : null,
    currency: currency || null,
    status: response?.payment_status_description ?? null,
    statusCode: response?.status_code ?? null,
    confirmationCode: response?.confirmation_code ?? null,
    // Treat the provider field as potentially unmasked. Persist only its final four characters.
    paymentAccountMasked: maskPaymentAccount(response?.payment_account),
    merchantReference: providerReference || null,
  };
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.update(paymentTransactions).set({
      status: finalStatus,
      paymentMethod: safeResponse.paymentMethod,
      paymentAccountMasked: safeResponse.paymentAccountMasked,
      confirmationCode: safeResponse.confirmationCode,
      providerResponse: safeResponse,
      verifiedAt: now,
    }).where(eq(paymentTransactions.id, transaction.id));
    if (finalStatus === "completed") {
      await tx.update(orders).set({ paymentStatus: "paid", paymentRef: safeResponse.confirmationCode || transaction.merchantReference }).where(eq(orders.id, transaction.orderId));
    } else if (finalStatus === "reversed") {
      await tx.update(orders).set({ paymentStatus: "unpaid", paymentRef: transaction.merchantReference }).where(eq(orders.id, transaction.orderId));
    }
  });
  const [order] = await db.select().from(orders).where(eq(orders.id, transaction.orderId));
  return { ok: finalStatus === "completed", status: finalStatus, orderCode: order?.code ?? null, merchantReference: transaction.merchantReference };
}
