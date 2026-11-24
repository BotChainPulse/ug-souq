import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";

const SITE = "https://www.ugsouq.com";
const SUPPORT = `Need a person? Email support@ugsouq.com or visit ${SITE}/support`;
const MENU = [
  "Oli otya! 👋 Welcome to UGSouq. I’m the automated support assistant.",
  "Reply with a number or write what you need:",
  "1. Shop on UGSouq",
  "2. Track an order or delivery",
  "3. Returns and refunds",
  "4. Sell or get verified",
  "5. Contact our team",
].join("\n");

export function whatsappReply(text: string) {
  const message = text.trim().toLowerCase().replace(/^[\s.!?]+|[\s.!?]+$/g, "");
  if (/^(thanks|thank you|ok|okay|webale)$/.test(message)) return null;
  if (/^(5|agent|support)$|\b(human|talk to|speak to|real person|contact (support|your team))\b/.test(message)) return SUPPORT;
  if (/^3$|\b(returns?|refunds?)\b/.test(message)) return `For returns and refunds, use our request form at ${SITE}/returns. ${SUPPORT}`;
  if (/^2$|\b(track|tracking|delivery|deliveries|my order|order status)\b/.test(message)) return `Track your order at ${SITE}/track. Enter your order code and checkout phone number on the site.`;
  if (/^4$|\b(sell|sellers?|verify|verified|verification|blue tick|blue badge|open a shop)\b/.test(message)) return `To open a shop, visit ${SITE}/sell. For seller verification and the blue badge, see ${SITE}/verification. Keep your ID details and documents out of WhatsApp.`;
  if (/^1$|\b(shop|shopping|buy|browse|catalogue|catalog|products?)\b/.test(message)) return `Browse the UGSouq catalogue at ${SITE}/catalog.`;
  return MENU;
}

const incomingMessage = z.object({
  id: z.string().min(1).max(512),
  from: z.string().regex(/^[1-9]\d{0,14}$/).optional(),
  from_user_id: z.string().min(1).max(128).optional(),
  timestamp: z.string().regex(/^\d{1,12}$/),
  type: z.string(),
  text: z.object({ body: z.string() }).optional(),
});
const webhookEvent = z.object({
  object: z.string(),
  entry: z.array(z.object({
    changes: z.array(z.object({
      field: z.string(),
      value: z.object({
        messaging_product: z.string().optional(),
        metadata: z.object({ phone_number_id: z.string() }).optional(),
        messages: z.array(z.unknown()).optional(),
      }),
    })),
  })),
});

const SERVICE_WINDOW_SECONDS = 24 * 60 * 60;
const CUSTOMER_MESSAGE_TYPES = new Set(["text", "audio", "image", "video", "document", "sticker", "location", "contacts"]);

function configuration() {
  if (process.env.WHATSAPP_REPLIES_ENABLED !== "true") return null;
  const appSecret = process.env.WHATSAPP_APP_SECRET?.trim();
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN?.trim();
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const apiVersion = process.env.WHATSAPP_GRAPH_API_VERSION?.trim();
  if (!appSecret || !verifyToken || !accessToken || !phoneId || !apiVersion) return null;
  if (!/^\d+$/.test(phoneId) || !/^v\d+\.\d+$/.test(apiVersion)) return null;
  return { appSecret, verifyToken, accessToken, phoneId, apiVersion };
}

function matchingBytes(actual: Buffer, expected: Buffer) {
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const WHATSAPP_REPLY_TABLE_SQL = `CREATE TABLE IF NOT EXISTS whatsapp_replies (
  message_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_whatsapp_replies_created (created_at)
)`;

async function replyDatabase() {
  const { getDb } = await import("./queries/connection");
  return getDb().$client.promise();
}

export async function initializeWhatsAppReplies() {
  if (!configuration()) return;
  const db = await replyDatabase();
  await db.query(WHATSAPP_REPLY_TABLE_SQL);
  await replyStore.prune();
}

const replyStore = {
  async prune() {
    const db = await replyDatabase();
    await db.query("DELETE FROM whatsapp_replies WHERE created_at < CURRENT_TIMESTAMP - INTERVAL 2 DAY");
  },
  async claim(hash: string) {
    const db = await replyDatabase();
    try {
      await db.execute("INSERT INTO whatsapp_replies (message_hash) VALUES (?)", [hash]);
      return true;
    } catch (error) {
      if ((error as { code?: string })?.code === "ER_DUP_ENTRY") return false;
      throw error;
    }
  },
  async release(hash: string) {
    const db = await replyDatabase();
    await db.execute("DELETE FROM whatsapp_replies WHERE message_hash = ?", [hash]);
  },
};

export function createWhatsAppWebhook(store = replyStore) {
  const webhook = new Hono();
  webhook.get("/", (c) => {
    const config = configuration();
    if (!config) return c.notFound();
    const challenge = c.req.query("hub.challenge");
    const token = c.req.query("hub.verify_token") ?? "";
    if (c.req.query("hub.mode") !== "subscribe" || !challenge || !matchingBytes(Buffer.from(token), Buffer.from(config.verifyToken))) {
      return c.text("Forbidden", 403);
    }
    return c.text(challenge);
  });

  webhook.post("/", bodyLimit({ maxSize: 3 * 1024 * 1024 }), async (c) => {
    const config = configuration();
    if (!config) return c.notFound();
    const signature = c.req.header("x-hub-signature-256") ?? "";
    if (!/^sha256=[0-9a-f]{64}$/i.test(signature)) return c.text("Unauthorized", 401);
    const body = Buffer.from(await c.req.arrayBuffer());
    const expected = createHmac("sha256", config.appSecret).update(body).digest();
    if (!matchingBytes(Buffer.from(signature.slice(7), "hex"), expected)) return c.text("Unauthorized", 401);

    let payload: unknown;
    try {
      payload = JSON.parse(body.toString("utf8"));
    } catch {
      return c.text("Invalid JSON", 400);
    }
    const parsed = webhookEvent.safeParse(payload);
    if (!parsed.success) return c.text("Invalid event", 400);
    if (parsed.data.object !== "whatsapp_business_account") return c.text("OK");

    const now = Math.floor(Date.now() / 1000);
    const changes = parsed.data.entry.flatMap(({ changes }) => changes);
    const messages = changes.flatMap(({ field, value }) => {
      if (field !== "messages" || value.messaging_product !== "whatsapp" || value.metadata?.phone_number_id !== config.phoneId) return [];
      return value.messages ?? [];
    });
    let pruned = false;
    let retry = false;
    try {
      for (const candidate of messages) {
        const result = incomingMessage.safeParse(candidate);
        if (!result.success) continue;
        const { id, from, from_user_id: userId, timestamp, type, text } = result.data;
        const age = now - Number(timestamp);
        if ((!userId && !from) || !CUSTOMER_MESSAGE_TYPES.has(type) || age >= SERVICE_WINDOW_SECONDS || age < -300) continue;
        const reply = type === "text" ? whatsappReply(text?.body ?? "") : `Please type a short message so I can help. ${SUPPORT}`;
        if (!reply) continue;

        if (!pruned) {
          await store.prune();
          pruned = true;
        }
        const hash = createHash("sha256").update(`${config.phoneId}:${id}`).digest("hex");
        if (!await store.claim(hash)) continue;

        let response: Response;
        try {
          response = await fetch(`https://graph.facebook.com/${config.apiVersion}/${config.phoneId}/messages`, {
            method: "POST",
            headers: { Authorization: `Bearer ${config.accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              recipient_type: "individual",
              ...(userId ? { recipient: userId } : { to: from }),
              type: "text",
              text: { body: reply, preview_url: false },
            }),
            redirect: "error",
            signal: AbortSignal.timeout(5_000),
          });
        } catch {
          // A timeout can occur after Meta accepts the message. Keep the claim to avoid a second reply.
          console.error("WhatsApp reply delivery could not be confirmed.");
          continue;
        }
        await response.body?.cancel().catch(() => undefined);
        if (response.ok) continue;
        console.error("WhatsApp reply API returned an unsuccessful status", response.status);
        if (response.status >= 400 && response.status < 500) {
          await store.release(hash);
          retry = true;
        }
      }
    } catch {
      console.error("WhatsApp reply database operation failed.");
      return c.text("Retry later", 503);
    }
    return retry ? c.text("Retry later", 503) : c.text("OK");
  });
  return webhook;
}
