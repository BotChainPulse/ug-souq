import type { Hono } from "hono";
import { getDb } from "./queries/connection";

const MAX_PRODUCTS = 6;
const MAX_RECIPIENTS_PER_RUN = 200;

const esc = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const money = (value: unknown) => `UGX ${Number(value ?? 0).toLocaleString("en-UG")}`;

const providerConfigured = () => Boolean(
  process.env.RESEND_API_KEY && (process.env.MARKETING_FROM_EMAIL || process.env.RESEND_FROM_EMAIL),
);

const fromAddress = () => process.env.MARKETING_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || "";

function requireAdmin(key: string) {
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    const error: any = new Error("Unauthorized");
    error.status = 401;
    throw error;
  }
}

function requestAdminKey(c: any) {
  const authorization = String(c.req.header("authorization") || "");
  if (authorization.toLowerCase().startsWith("bearer ")) return authorization.slice(7).trim();
  return String(c.req.header("x-admin-key") || "");
}

function rawClient() {
  const db = getDb();
  const raw: any = (db as any).$client;
  return typeof raw.promise === "function" ? raw.promise() : raw;
}

async function ensureCampaignSchema() {
  const client = rawClient();
  await client.query(`
    CREATE TABLE IF NOT EXISTS marketing_campaigns (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(160) NOT NULL,
      subject VARCHAR(160) NOT NULL,
      preheader VARCHAR(255) NULL,
      headline VARCHAR(160) NOT NULL,
      intro TEXT NULL,
      cta_text VARCHAR(80) NOT NULL DEFAULT 'Shop UGSouq',
      cta_url VARCHAR(500) NOT NULL,
      channel ENUM('email','whatsapp','both') NOT NULL DEFAULT 'email',
      products_json JSON NULL,
      status ENUM('draft','scheduled','sending','sent','failed') NOT NULL DEFAULT 'draft',
      scheduled_for DATETIME NULL,
      sent_at DATETIME NULL,
      sent_count INT NOT NULL DEFAULT 0,
      failed_count INT NOT NULL DEFAULT 0,
      last_error TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_campaign_status_schedule (status, scheduled_for)
    )
  `);
}

function normalizeCampaign(input: any) {
  const products = Array.isArray(input?.products) ? input.products.slice(0, MAX_PRODUCTS).map((product: any) => ({
    slug: String(product?.slug ?? "").slice(0, 180),
    name: String(product?.name ?? "").slice(0, 180),
    price: Math.max(0, Number(product?.price ?? 0)),
    oldPrice: product?.oldPrice == null ? null : Math.max(0, Number(product.oldPrice)),
    image: String(product?.image ?? "").slice(0, 2000),
    sellerName: String(product?.sellerName ?? "UGSouq seller").slice(0, 180),
    url: String(product?.url ?? "").slice(0, 1000),
  })) : [];

  const channel = ["email", "whatsapp", "both"].includes(input?.channel) ? input.channel : "email";
  return {
    id: input?.id ? Number(input.id) : null,
    name: String(input?.name ?? "Untitled campaign").trim().slice(0, 160),
    subject: String(input?.subject ?? "UGSouq deals worth opening").trim().slice(0, 160),
    preheader: String(input?.preheader ?? "").trim().slice(0, 255),
    headline: String(input?.headline ?? "UGSouq deals").trim().slice(0, 160),
    intro: String(input?.intro ?? "").trim().slice(0, 2000),
    ctaText: String(input?.ctaText ?? "Shop UGSouq").trim().slice(0, 80),
    ctaUrl: String(input?.ctaUrl ?? `${process.env.APP_URL || "https://www.ugsouq.com"}/catalog?deals=true`).trim().slice(0, 500),
    channel,
    products,
    scheduledFor: input?.scheduledFor ? String(input.scheduledFor) : null,
  };
}

function renderEmail(campaign: ReturnType<typeof normalizeCampaign>, subscriber?: { name?: string | null; unsubscribeToken?: string | null }) {
  const base = (process.env.APP_URL || "https://www.ugsouq.com").replace(/\/$/, "");
  const unsubscribe = subscriber?.unsubscribeToken
    ? `${base}/unsubscribe?token=${encodeURIComponent(subscriber.unsubscribeToken)}&channel=email`
    : `${base}/preferences`;
  const greeting = subscriber?.name ? `Hi ${esc(subscriber.name)},` : "Hello,";
  const cards = campaign.products.map((product: any) => `
    <td style="width:50%;padding:6px;vertical-align:top">
      <a href="${esc(product.url || `${base}/product/${product.slug}`)}" style="text-decoration:none;color:#0f172a">
        <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden">
          <img src="${esc(product.image)}" alt="" style="width:100%;aspect-ratio:1/1;object-fit:cover;display:block;background:#f1f5f9" />
          <div style="padding:12px">
            <div style="font-size:13px;line-height:18px;font-weight:800;min-height:36px">${esc(product.name)}</div>
            <div style="margin-top:6px;color:#047857;font-weight:900;font-size:13px">${esc(money(product.price))}</div>
            ${product.oldPrice && product.oldPrice > product.price ? `<div style="font-size:11px;color:#94a3b8;text-decoration:line-through">${esc(money(product.oldPrice))}</div>` : ""}
            <div style="margin-top:5px;font-size:10px;color:#64748b">${esc(product.sellerName)}</div>
          </div>
        </div>
      </a>
    </td>`).join("");

  const rows: string[] = [];
  for (let index = 0; index < campaign.products.length; index += 2) {
    rows.push(`<tr>${cards.split('</td>').slice(index, index + 2).map((cell: string) => cell ? `${cell}</td>` : '').join('')}</tr>`);
  }

  const productRows = campaign.products.length
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:6px"><tbody>${rows.join("")}</tbody></table>`
    : "";

  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
  <div style="display:none;max-height:0;overflow:hidden">${esc(campaign.preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:18px 8px">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:22px;overflow:hidden">
      <tr><td style="background:#020617;color:#ffffff;padding:26px">
        <div style="font-size:24px;font-weight:900">UGSouq</div>
        <div style="margin-top:24px;font-size:13px;color:#a7f3d0;font-weight:800">OFFERS WORTH OPENING</div>
        <div style="margin-top:10px;font-size:14px;color:#cbd5e1">${greeting}</div>
        <h1 style="margin:8px 0 0;font-size:34px;line-height:38px">${esc(campaign.headline)}</h1>
        <p style="font-size:15px;line-height:24px;color:#cbd5e1">${esc(campaign.intro)}</p>
        <a href="${esc(campaign.ctaUrl)}" style="display:inline-block;margin-top:8px;background:#f97316;color:#ffffff;text-decoration:none;padding:13px 20px;border-radius:12px;font-weight:900">${esc(campaign.ctaText)}</a>
      </td></tr>
      <tr><td>${productRows}</td></tr>
      <tr><td style="padding:24px;text-align:center">
        <div style="font-size:13px;font-weight:900;color:#047857">Shop verified sellers with buyer protection</div>
        <p style="font-size:11px;line-height:17px;color:#64748b">You are receiving this promotion because you opted in to UGSouq deals. Order, payment and security updates are separate.</p>
        <a href="${esc(unsubscribe)}" style="font-size:11px;color:#475569">Unsubscribe from promotional email</a>
        <p style="margin-top:18px;font-size:10px;line-height:16px;color:#94a3b8">UGSouq will never ask for your password, PIN, OTP or full payment details by email or WhatsApp.</p>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!providerConfigured()) throw new Error("Marketing email provider is not configured");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: fromAddress(), to: [to], subject, html }),
  });
  const result: any = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.message || `Email provider returned ${response.status}`);
  return result;
}

async function saveCampaign(campaign: ReturnType<typeof normalizeCampaign>, status: "draft" | "scheduled") {
  await ensureCampaignSchema();
  const client = rawClient();
  const scheduledFor = status === "scheduled" && campaign.scheduledFor ? new Date(campaign.scheduledFor) : null;
  if (campaign.id) {
    await client.query(
      `UPDATE marketing_campaigns SET name=?, subject=?, preheader=?, headline=?, intro=?, cta_text=?, cta_url=?, channel=?, products_json=?, status=?, scheduled_for=?, last_error=NULL WHERE id=?`,
      [campaign.name, campaign.subject, campaign.preheader, campaign.headline, campaign.intro, campaign.ctaText, campaign.ctaUrl, campaign.channel, JSON.stringify(campaign.products), status, scheduledFor, campaign.id],
    );
    return campaign.id;
  }
  const [result]: any = await client.query(
    `INSERT INTO marketing_campaigns (name, subject, preheader, headline, intro, cta_text, cta_url, channel, products_json, status, scheduled_for) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [campaign.name, campaign.subject, campaign.preheader, campaign.headline, campaign.intro, campaign.ctaText, campaign.ctaUrl, campaign.channel, JSON.stringify(campaign.products), status, scheduledFor],
  );
  return Number(result.insertId);
}

async function deliverCampaignById(id: number) {
  await ensureCampaignSchema();
  const client = rawClient();
  const [campaignRows]: any = await client.query(`SELECT * FROM marketing_campaigns WHERE id=? LIMIT 1`, [id]);
  const row = campaignRows?.[0];
  if (!row) throw new Error("Campaign not found");
  if (!providerConfigured()) throw new Error("Marketing email provider is not configured");
  if (row.channel === "whatsapp") throw new Error("WhatsApp delivery is not connected yet");

  const products = typeof row.products_json === "string" ? JSON.parse(row.products_json || "[]") : (row.products_json || []);
  const campaign = normalizeCampaign({
    id: row.id,
    name: row.name,
    subject: row.subject,
    preheader: row.preheader,
    headline: row.headline,
    intro: row.intro,
    ctaText: row.cta_text,
    ctaUrl: row.cta_url,
    channel: row.channel,
    products,
  });

  await client.query(`UPDATE marketing_campaigns SET status='sending', last_error=NULL WHERE id=?`, [id]);
  const [subscriberRows]: any = await client.query(
    `SELECT name,email,unsubscribe_token FROM marketing_subscribers WHERE email_opt_in=TRUE AND email IS NOT NULL AND email_unsubscribed_at IS NULL ORDER BY id ASC LIMIT ?`,
    [MAX_RECIPIENTS_PER_RUN],
  );

  let sent = 0;
  let failed = 0;
  let lastError = "";
  for (let index = 0; index < subscriberRows.length; index += 5) {
    const batch = subscriberRows.slice(index, index + 5);
    const results = await Promise.allSettled(batch.map((subscriber: any) => sendEmail(
      subscriber.email,
      campaign.subject,
      renderEmail(campaign, { name: subscriber.name, unsubscribeToken: subscriber.unsubscribe_token }),
    )));
    for (const result of results) {
      if (result.status === "fulfilled") sent += 1;
      else {
        failed += 1;
        lastError = result.reason instanceof Error ? result.reason.message : String(result.reason);
      }
    }
  }

  const finalStatus = failed > 0 && sent === 0 ? "failed" : "sent";
  await client.query(
    `UPDATE marketing_campaigns SET status=?, sent_at=NOW(), sent_count=?, failed_count=?, last_error=? WHERE id=?`,
    [finalStatus, sent, failed, lastError || null, id],
  );
  return { id, status: finalStatus, sent, failed, capped: subscriberRows.length >= MAX_RECIPIENTS_PER_RUN };
}

export function registerMarketingCampaignRoutes(app: Hono<any>) {
  app.get("/api/admin/marketing/status", async (c) => {
    try {
      requireAdmin(requestAdminKey(c));
      await ensureCampaignSchema();
      return c.json({ configured: providerConfigured(), provider: providerConfigured() ? "resend" : null, from: providerConfigured() ? fromAddress() : null });
    } catch (error: any) {
      return c.json({ error: error?.message || "Unauthorized" }, error?.status || 500);
    }
  });

  app.get("/api/admin/marketing/campaigns", async (c) => {
    try {
      requireAdmin(requestAdminKey(c));
      await ensureCampaignSchema();
      const client = rawClient();
      const [rows]: any = await client.query(`SELECT * FROM marketing_campaigns ORDER BY updated_at DESC LIMIT 100`);
      return c.json(rows.map((row: any) => ({
        id: Number(row.id), name: row.name, subject: row.subject, preheader: row.preheader, headline: row.headline,
        intro: row.intro, ctaText: row.cta_text, ctaUrl: row.cta_url, channel: row.channel,
        products: typeof row.products_json === "string" ? JSON.parse(row.products_json || "[]") : (row.products_json || []),
        status: row.status, scheduledFor: row.scheduled_for, sentAt: row.sent_at,
        sentCount: Number(row.sent_count || 0), failedCount: Number(row.failed_count || 0), lastError: row.last_error,
        createdAt: row.created_at, updatedAt: row.updated_at,
      })));
    } catch (error: any) {
      return c.json({ error: error?.message || "Failed to load campaigns" }, error?.status || 500);
    }
  });

  app.post("/api/admin/marketing/campaigns/save", async (c) => {
    try {
      const body: any = await c.req.json();
      requireAdmin(String(body?.key || ""));
      const campaign = normalizeCampaign(body?.campaign || {});
      const status = body?.status === "scheduled" ? "scheduled" : "draft";
      if (status === "scheduled" && !campaign.scheduledFor) return c.json({ error: "Choose a schedule time first" }, 400);
      const id = await saveCampaign(campaign, status);
      return c.json({ ok: true, id, status });
    } catch (error: any) {
      return c.json({ error: error?.message || "Failed to save campaign" }, error?.status || 500);
    }
  });

  app.post("/api/admin/marketing/campaigns/test", async (c) => {
    try {
      const body: any = await c.req.json();
      requireAdmin(String(body?.key || ""));
      const email = String(body?.email || "").trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email)) return c.json({ error: "Enter a valid test email address" }, 400);
      const campaign = normalizeCampaign(body?.campaign || {});
      await sendEmail(email, `[TEST] ${campaign.subject}`, renderEmail(campaign, { name: "UGSouq Admin" }));
      return c.json({ ok: true });
    } catch (error: any) {
      return c.json({ error: error?.message || "Failed to send test" }, error?.status || 500);
    }
  });

  app.post("/api/admin/marketing/campaigns/send", async (c) => {
    try {
      const body: any = await c.req.json();
      requireAdmin(String(body?.key || ""));
      const campaign = normalizeCampaign(body?.campaign || {});
      const id = await saveCampaign(campaign, "draft");
      const result = await deliverCampaignById(id);
      return c.json({ ok: true, ...result });
    } catch (error: any) {
      return c.json({ error: error?.message || "Failed to send campaign" }, error?.status || 500);
    }
  });
}

let schedulerStarted = false;
export function startMarketingCampaignScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;
  const run = async () => {
    try {
      if (!providerConfigured()) return;
      await ensureCampaignSchema();
      const client = rawClient();
      const [rows]: any = await client.query(`SELECT id FROM marketing_campaigns WHERE status='scheduled' AND scheduled_for IS NOT NULL AND scheduled_for <= NOW() ORDER BY scheduled_for ASC LIMIT 3`);
      for (const row of rows) {
        try { await deliverCampaignById(Number(row.id)); }
        catch (error: any) {
          await client.query(`UPDATE marketing_campaigns SET status='failed', last_error=? WHERE id=?`, [error?.message || String(error), row.id]);
        }
      }
    } catch (error) {
      console.error("[MARKETING] scheduler error", error);
    }
  };
  setTimeout(run, 15_000);
  setInterval(run, 5 * 60_000);
}
