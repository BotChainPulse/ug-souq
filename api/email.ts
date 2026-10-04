import type { Hono } from "hono";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const esc = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const money = (value: unknown) => `UGX ${Number(value ?? 0).toLocaleString("en-UG")}`;

export function outboundEmailConfigured(kind: "transactional" | "marketing" = "transactional") {
  return Boolean(process.env.RESEND_API_KEY?.trim() && outboundFromAddress(kind));
}

export function outboundFromAddress(kind: "transactional" | "marketing" = "transactional") {
  if (kind === "marketing") {
    return process.env.MARKETING_FROM_EMAIL?.trim()
      || process.env.RESEND_FROM_EMAIL?.trim()
      || process.env.SYSTEM_FROM_EMAIL?.trim()
      || "";
  }
  return process.env.SYSTEM_FROM_EMAIL?.trim()
    || process.env.RESEND_FROM_EMAIL?.trim()
    || process.env.MARKETING_FROM_EMAIL?.trim()
    || "";
}

export function senderDomain(from = outboundFromAddress()) {
  const address = from.match(/<([^>]+)>/)?.[1] || from;
  return address.split("@")[1]?.trim().toLowerCase() || "";
}

export async function sendResendEmail(input: {
  to: string;
  subject: string;
  html: string;
  kind?: "transactional" | "marketing";
  idempotencyKey?: string;
  replyTo?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = input.to.trim().toLowerCase();
  const from = outboundFromAddress(input.kind);
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
  if (!from) throw new Error("A verified Resend sender address is not configured");
  if (!EMAIL_PATTERN.test(to)) throw new Error("A valid recipient email is required");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(input.idempotencyKey ? { "Idempotency-Key": input.idempotencyKey.slice(0, 256) } : {}),
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: input.subject,
      html: input.html,
      ...(input.replyTo ? { reply_to: input.replyTo } : {}),
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const result = await response.json().catch(() => ({})) as { id?: string; message?: string };
  if (!response.ok) throw new Error(result?.message || `Resend returned ${response.status}`);
  return result;
}

function shell(preview: string, title: string, body: string) {
  const base = (process.env.APP_URL || "https://www.ugsouq.com").replace(/\/$/, "");
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
  <div style="display:none;max-height:0;overflow:hidden">${esc(preview)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:20px 10px">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border-radius:20px;overflow:hidden">
      <tr><td style="background:#020617;color:#fff;padding:24px"><div style="font-size:24px;font-weight:900">UGSouq</div><h1 style="margin:18px 0 0;font-size:28px;line-height:34px">${esc(title)}</h1></td></tr>
      <tr><td style="padding:24px">${body}
        <p style="margin-top:24px;font-size:11px;line-height:17px;color:#64748b">This is a service message about your UGSouq account or order. UGSouq will never ask for your password, PIN, OTP or full payment details by email.</p>
        <p style="font-size:11px;color:#94a3b8">Need help? Use the secure <a href="${base}/support" style="color:#047857">UGSouq Help Centre</a>.</p>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

export type EmailOrder = {
  code: string;
  customerName: string;
  customerEmail?: string | null;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  address: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
};

type EmailOrderItem = { name: string; qty: number; price: number };

const statusLabel = (status: string) => ({
  placed: "Order placed",
  confirmed: "Order confirmed",
  pending_delivery: "Preparing for delivery",
  on_the_way: "Out for delivery",
  delivered: "Order delivered",
  cancelled: "Order cancelled",
  payment_pending_confirmation: "Payment awaiting confirmation",
  payment_paid: "Payment confirmed",
  payment_unpaid: "Payment not yet confirmed",
}[status] || status.replaceAll("_", " "));

export async function sendOrderPlacedEmail(order: EmailOrder, items: EmailOrderItem[]) {
  if (!order.customerEmail) return { skipped: true, reason: "no_recipient" } as const;
  const base = (process.env.APP_URL || "https://www.ugsouq.com").replace(/\/$/, "");
  const itemRows = items.map((item) => `<tr><td style="padding:7px 0">${esc(item.name)} × ${item.qty}</td><td align="right" style="padding:7px 0;font-weight:700">${esc(money(item.price * item.qty))}</td></tr>`).join("");
  const body = `<p style="font-size:15px;line-height:24px">Hi ${esc(order.customerName)}, your order has been received.</p>
    <div style="margin:18px 0;padding:16px;border-radius:14px;background:#f8fafc"><div style="font-size:12px;color:#64748b">Order code</div><div style="font-size:22px;font-weight:900">${esc(order.code)}</div></div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px">${itemRows}<tr><td style="padding-top:12px;border-top:1px solid #e2e8f0;font-weight:900">Total</td><td align="right" style="padding-top:12px;border-top:1px solid #e2e8f0;font-weight:900">${esc(money(order.total))}</td></tr></table>
    <p style="font-size:13px;line-height:21px;color:#475569">Delivery: ${esc(order.address)}<br>Payment: ${esc(order.paymentMethod.replaceAll("_", " "))}</p>
    <a href="${base}/order/${encodeURIComponent(order.code)}" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;padding:12px 18px;border-radius:11px;font-weight:800">View order</a>`;
  return sendResendEmail({
    to: order.customerEmail,
    subject: `Order ${order.code} received — UGSouq`,
    html: shell(`We received order ${order.code}`, "Order received", body),
    idempotencyKey: `order-placed-${order.code}`,
  });
}

export async function sendOrderStatusEmail(order: EmailOrder, event: string) {
  if (!order.customerEmail) return { skipped: true, reason: "no_recipient" } as const;
  const base = (process.env.APP_URL || "https://www.ugsouq.com").replace(/\/$/, "");
  const label = statusLabel(event);
  const body = `<p style="font-size:15px;line-height:24px">Hi ${esc(order.customerName)},</p>
    <div style="margin:18px 0;padding:16px;border-radius:14px;background:#ecfdf5"><div style="font-size:12px;color:#047857">Order ${esc(order.code)}</div><div style="margin-top:4px;font-size:21px;font-weight:900;color:#065f46">${esc(label)}</div></div>
    <p style="font-size:14px;line-height:22px;color:#475569">Current order status: ${esc(statusLabel(order.status))}<br>Payment status: ${esc(statusLabel(`payment_${order.paymentStatus}`))}</p>
    <a href="${base}/order/${encodeURIComponent(order.code)}" style="display:inline-block;background:#047857;color:#fff;text-decoration:none;padding:12px 18px;border-radius:11px;font-weight:800">Track order</a>`;
  return sendResendEmail({
    to: order.customerEmail,
    subject: `${label}: ${order.code} — UGSouq`,
    html: shell(`${label} for ${order.code}`, label, body),
    idempotencyKey: `order-${order.code}-${event}`,
  });
}

export async function sendSellerApplicationEmail(seller: { email?: string | null; ownerName: string; shopName: string; id: number }) {
  if (!seller.email) return { skipped: true, reason: "no_recipient" } as const;
  const body = `<p style="font-size:15px;line-height:24px">Hi ${esc(seller.ownerName)},</p>
    <p style="font-size:15px;line-height:24px">We received the seller application for <b>${esc(seller.shopName)}</b>. The shop remains pending while UGSouq reviews the identity and business information supplied.</p>
    <div style="margin:18px 0;padding:16px;border-radius:14px;background:#fff7ed;color:#9a3412;font-size:13px;line-height:21px">Submitting an application does not mean the shop is approved or verified. We will send another service email after review.</div>`;
  return sendResendEmail({
    to: seller.email,
    subject: `Seller application received — ${seller.shopName}`,
    html: shell(`We received the seller application for ${seller.shopName}`, "Seller application received", body),
    idempotencyKey: `seller-application-${seller.id}`,
  });
}

export async function sendSellerStatusEmail(seller: {
  email?: string | null;
  ownerName: string;
  shopName: string;
  id: number;
  status: string;
}) {
  if (!seller.email) return { skipped: true, reason: "no_recipient" } as const;
  const base = (process.env.APP_URL || "https://www.ugsouq.com").replace(/\/$/, "");
  const status = seller.status.replaceAll("_", " ");
  const approved = seller.status === "approved";
  const body = `<p style="font-size:15px;line-height:24px">Hi ${esc(seller.ownerName)},</p>
    <p style="font-size:15px;line-height:24px">The status of <b>${esc(seller.shopName)}</b> is now <b>${esc(status)}</b>.</p>
    ${approved
      ? `<p style="font-size:14px;line-height:22px;color:#475569">Your shop can now use the seller tools. Individual listings still require approval before they appear publicly.</p><a href="${base}/sell/listings" style="display:inline-block;background:#047857;color:#fff;text-decoration:none;padding:12px 18px;border-radius:11px;font-weight:800">Open seller listings</a>`
      : `<p style="font-size:14px;line-height:22px;color:#475569">Use the secure seller area for the current status. UGSouq will never request a password, PIN, OTP or full payment details by email.</p><a href="${base}/sell" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 18px;border-radius:11px;font-weight:800">Open seller area</a>`}`;
  return sendResendEmail({
    to: seller.email,
    subject: `Seller application ${status} — ${seller.shopName}`,
    html: shell(`The seller status for ${seller.shopName} is now ${status}`, "Seller status updated", body),
    idempotencyKey: `seller-${seller.id}-status-${seller.status}`,
  });
}

export function reportEmailFailure(context: string, error: unknown) {
  console.error(`[EMAIL] ${context}`, error instanceof Error ? error.message : String(error));
}

export function registerOutboundEmailRoutes(app: Hono) {
  app.get("/api/email/status", (c) => c.json({
    provider: "resend",
    configured: outboundEmailConfigured(),
    senderDomain: senderDomain(),
    capabilities: {
      orderNotifications: outboundEmailConfigured("transactional"),
      systemEmails: outboundEmailConfigured("transactional"),
      marketingEmails: outboundEmailConfigured("marketing"),
      inboundEmail: false,
    },
  }));
}
