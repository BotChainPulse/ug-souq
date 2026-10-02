import { createHmac, timingSafeEqual } from "node:crypto";
import type { Hono } from "hono";

const OFFICIAL_MAILBOXES = {
  "info@ugsouq.com": "Info",
  "support@ugsouq.com": "Support",
  "partnerships@ugsouq.com": "Partnerships",
} as const;

const BLOCKED_ATTACHMENT_EXTENSIONS = new Set([
  "ade", "adp", "apk", "appx", "bat", "chm", "cmd", "com", "cpl", "dll",
  "dmg", "exe", "hta", "ins", "iso", "jar", "js", "jse", "lnk", "mde",
  "msc", "msi", "msp", "mst", "pif", "ps1", "reg", "scr", "sct", "shb",
  "sys", "vb", "vbe", "vbs", "vhd", "vxd", "wsc", "wsf", "wsh",
]);

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

type OfficialMailbox = keyof typeof OFFICIAL_MAILBOXES;
type SqlResult = { affectedRows?: number };
type SqlClient = { query(sql: string, values?: unknown[]): Promise<[SqlResult, unknown]> };

type ReceivedEmail = {
  from?: string;
  subject?: string;
  html?: string | null;
  text?: string | null;
  attachments?: Array<{
    id: string;
    filename?: string | null;
    content_type?: string | null;
    content_id?: string | null;
    size?: number | null;
  }>;
};

type ResendWebhookEvent = {
  type?: string;
  data?: { email_id?: string; to?: string[] };
};

type AttachmentDownload = {
  id: string;
  filename?: string | null;
  content_type?: string | null;
  content_id?: string | null;
  download_url?: string | null;
};

function normalizeAddress(value: string) {
  const match = value.trim().toLowerCase().match(/<([^<>]+)>$/);
  return (match?.[1] || value.trim().toLowerCase()).replace(/^mailto:/, "");
}

export function selectOfficialMailbox(recipients: string[] = []): OfficialMailbox | null {
  for (const recipient of recipients) {
    const address = normalizeAddress(recipient);
    if (address in OFFICIAL_MAILBOXES) return address as OfficialMailbox;
  }
  return null;
}

export function forwardedSubject(mailbox: OfficialMailbox, subject = "(no subject)") {
  return `[${OFFICIAL_MAILBOXES[mailbox]}] ${subject.trim() || "(no subject)"}`;
}

export function isBlockedAttachment(filename = "") {
  const extension = filename.toLowerCase().split(".").pop() || "";
  return BLOCKED_ATTACHMENT_EXTENSIONS.has(extension);
}

export function verifyResendWebhook(
  payload: string,
  headers: { id: string; timestamp: string; signature: string },
  webhookSecret: string,
  nowMs = Date.now(),
): ResendWebhookEvent {
  const timestamp = Number(headers.timestamp);
  if (!Number.isFinite(timestamp) || Math.abs(nowMs / 1000 - timestamp) > WEBHOOK_TOLERANCE_SECONDS) {
    throw new Error("Webhook timestamp is outside the allowed window");
  }

  const encodedSecret = webhookSecret.startsWith("whsec_") ? webhookSecret.slice(6) : webhookSecret;
  const secret = Buffer.from(encodedSecret, "base64");
  if (secret.length < 16) throw new Error("Invalid webhook secret");
  const expected = createHmac("sha256", secret)
    .update(`${headers.id}.${headers.timestamp}.${payload}`)
    .digest();
  const valid = headers.signature.split(" ").some((candidate) => {
    const [version, encoded] = candidate.split(",", 2);
    if (version !== "v1" || !encoded) return false;
    const actual = Buffer.from(encoded, "base64");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  });
  if (!valid) throw new Error("Invalid webhook signature");
  return JSON.parse(payload) as ResendWebhookEvent;
}

function safeReplyTo(value = "") {
  const address = normalizeAddress(value);
  if (!/^\S+@\S+\.\S+$/.test(address)) return undefined;
  if (address.endsWith("@ugsouq.com")) return undefined;
  return value;
}

async function sqlClient() {
  const { getDb } = await import("./queries/connection");
  const db = getDb() as unknown as { $client: SqlClient & { promise?: () => SqlClient } };
  return typeof db.$client.promise === "function" ? db.$client.promise() : db.$client;
}

async function claimForward(emailId: string) {
  const client = await sqlClient();
  const [result] = await client.query(
    "INSERT IGNORE INTO inbound_email_forwards (email_id, status) VALUES (?, 'processing')",
    [emailId],
  );
  return Number(result.affectedRows || 0) === 1;
}

async function markForwarded(emailId: string, mailbox: string) {
  const client = await sqlClient();
  await client.query(
    "UPDATE inbound_email_forwards SET recipient_alias = ?, status = 'forwarded', forwarded_at = CURRENT_TIMESTAMP WHERE email_id = ?",
    [mailbox, emailId],
  );
}

async function releaseForward(emailId: string) {
  const client = await sqlClient();
  await client.query("DELETE FROM inbound_email_forwards WHERE email_id = ? AND status = 'processing'", [emailId]);
}

function requiredConfiguration() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  const forwardTo = process.env.INBOUND_FORWARD_TO?.trim();
  const from = (process.env.INBOUND_FROM_EMAIL || process.env.MARKETING_FROM_EMAIL || process.env.RESEND_FROM_EMAIL)?.trim();
  if (!apiKey || !webhookSecret || !forwardTo || !from) return null;
  return { apiKey, webhookSecret, forwardTo, from };
}

async function resendRequest<T>(apiKey: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://api.resend.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Resend API request failed (${response.status})`);
  return body as T;
}

export function registerInboundEmailRoutes(app: Hono) {
  app.post("/api/resend/inbound", async (c) => {
    const config = requiredConfiguration();
    if (!config) return c.json({ error: "Inbound email is not configured" }, 503);

    const payload = await c.req.text();
    const id = c.req.header("svix-id");
    const timestamp = c.req.header("svix-timestamp");
    const signature = c.req.header("svix-signature");
    if (!id || !timestamp || !signature) return c.json({ error: "Missing webhook signature" }, 400);

    let event: ResendWebhookEvent;
    try {
      event = verifyResendWebhook(payload, { id, timestamp, signature }, config.webhookSecret);
    } catch {
      return c.json({ error: "Invalid webhook signature" }, 401);
    }

    if (event.type !== "email.received") return c.json({ received: true });
    const emailId = event.data?.email_id;
    const mailbox = selectOfficialMailbox(event.data?.to || []);
    if (!emailId || !mailbox) return c.json({ received: true, forwarded: false });

    const claimed = await claimForward(emailId);
    if (!claimed) return c.json({ received: true, duplicate: true });

    try {
      const email = await resendRequest<ReceivedEmail>(config.apiKey, `/emails/receiving/${encodeURIComponent(emailId)}`);
      const replyTo = safeReplyTo(email.from || "");
      if (!replyTo) {
        await markForwarded(emailId, mailbox);
        return c.json({ received: true, forwarded: false });
      }

      const attachmentMeta = email.attachments || [];
      const totalBytes = attachmentMeta.reduce((sum, item) => sum + Number(item.size || 0), 0);
      const permitted = totalBytes <= MAX_TOTAL_ATTACHMENT_BYTES
        ? attachmentMeta.filter((item) => Number(item.size || 0) <= MAX_ATTACHMENT_BYTES && !isBlockedAttachment(item.filename || ""))
        : [];
      const attachments: Array<{ filename: string; content: string; content_type?: string; content_id?: string }> = [];

      if (permitted.length > 0) {
        const listed = await resendRequest<{ data?: AttachmentDownload[] }>(
          config.apiKey,
          `/emails/receiving/${encodeURIComponent(emailId)}/attachments`,
        );
        const allowedIds = new Set(permitted.map((item) => item.id));
        for (const attachment of listed.data || []) {
          if (!allowedIds.has(attachment.id) || !attachment.download_url) continue;
          const response = await fetch(attachment.download_url);
          if (!response.ok) throw new Error("Unable to download email attachment");
          attachments.push({
            filename: attachment.filename || "attachment",
            content: Buffer.from(await response.arrayBuffer()).toString("base64"),
            ...(attachment.content_type ? { content_type: attachment.content_type } : {}),
            ...(attachment.content_id ? { content_id: attachment.content_id } : {}),
          });
        }
      }

      await resendRequest(config.apiKey, "/emails", {
        method: "POST",
        body: JSON.stringify({
          from: config.from,
          to: [config.forwardTo],
          reply_to: replyTo,
          subject: forwardedSubject(mailbox, email.subject),
          html: email.html || undefined,
          text: email.text || (email.html ? "This message also contains an HTML body." : "Original message had no readable body."),
          attachments,
          headers: {
            "X-UGSouq-Original-Recipient": mailbox,
            "X-UGSouq-Inbound-ID": emailId,
          },
        }),
      });

      await markForwarded(emailId, mailbox);
      return c.json({ received: true, forwarded: true });
    } catch (error) {
      await releaseForward(emailId);
      console.error("Inbound email forwarding failed", error instanceof Error ? error.message : "Unknown error");
      return c.json({ error: "Unable to forward received email" }, 502);
    }
  });
}

