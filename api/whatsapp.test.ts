import { createHmac } from "node:crypto";
import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createWhatsAppWebhook, whatsappReply } from "./whatsapp";

const PATH = "/api/whatsapp/webhook";
const PHONE_ID = "1234567890";
const APP_SECRET = "unit-test-app-secret";
const VERIFY_TOKEN = "unit-test-verification-token";

function harness() {
  const claims = new Set<string>();
  const store = {
    prune: vi.fn(async () => {}),
    claim: vi.fn(async (hash: string) => {
      if (claims.has(hash)) return false;
      claims.add(hash);
      return true;
    }),
    release: vi.fn(async (hash: string) => { claims.delete(hash); }),
  };
  const app = new Hono();
  app.route(PATH, createWhatsAppWebhook(store));
  const send = vi.fn<typeof fetch>().mockImplementation(async () => new Response(null, { status: 200 }));
  vi.stubGlobal("fetch", send);
  return { app, store, send };
}

function event({ phoneId = PHONE_ID, value = {}, message = {} } = {}) {
  return {
    object: "whatsapp_business_account",
    entry: [{ changes: [{ field: "messages", value: {
      messaging_product: "whatsapp",
      metadata: { phone_number_id: phoneId },
      messages: [{
        id: "wamid.test",
        from: "256700000001",
        timestamp: String(Math.floor(Date.now() / 1000)),
        type: "text",
        text: { body: "Hi" },
        ...message,
      }],
      ...value,
    } }] }],
  };
}

function request(payload: unknown, secret = APP_SECRET) {
  const body = JSON.stringify(payload);
  const digest = createHmac("sha256", secret).update(body).digest("hex");
  return { method: "POST", body, headers: { "x-hub-signature-256": `sha256=${digest}` } };
}

beforeEach(() => {
  vi.stubEnv("WHATSAPP_REPLIES_ENABLED", "true");
  vi.stubEnv("WHATSAPP_APP_SECRET", APP_SECRET);
  vi.stubEnv("WHATSAPP_VERIFY_TOKEN", VERIFY_TOKEN);
  vi.stubEnv("WHATSAPP_ACCESS_TOKEN", "unit-test-access-token");
  vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", PHONE_ID);
  vi.stubEnv("WHATSAPP_GRAPH_API_VERSION", "v27.0");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("UGSouq WhatsApp replies", () => {
  it("routes common questions and numbers to the relevant support pages", () => {
    expect(whatsappReply("hello")).toContain("Oli otya");
    expect(whatsappReply("1")).toContain("/catalog");
    expect(whatsappReply("Where is my delivery?")).toContain("/track");
    expect(whatsappReply("Can I return my order?")).toContain("/returns");
    expect(whatsappReply("How do I get a blue tick?")).toContain("/verification");
    expect(whatsappReply("5")).toContain("support@ugsouq.com");
    expect(whatsappReply("Thank you!")).toBeNull();
  });

  it("answers the Meta challenge only when configured and verified", async () => {
    const { app } = harness();
    const query = "?hub.mode=subscribe&hub.challenge=12345&hub.verify_token=";
    expect((await app.request(`${PATH}${query}wrong`)).status).toBe(403);
    expect(await (await app.request(`${PATH}${query}${VERIFY_TOKEN}`)).text()).toBe("12345");
    vi.stubEnv("WHATSAPP_REPLIES_ENABLED", "false");
    expect((await app.request(`${PATH}${query}${VERIFY_TOKEN}`)).status).toBe(404);
    expect((await app.request(PATH, request(event()))).status).toBe(404);
  });

  it("rejects forged notifications and ignores statuses, stale messages and other business numbers", async () => {
    const { app, store, send } = harness();
    expect((await app.request(PATH, request(event(), "wrong-secret"))).status).toBe(401);
    expect((await app.request(PATH, request(event({ value: { messages: undefined, statuses: [{}] } })))).status).toBe(200);
    expect((await app.request(PATH, request(event({ phoneId: "999" })))).status).toBe(200);
    expect((await app.request(PATH, request(event({ message: { timestamp: "1" } })))).status).toBe(200);
    expect(store.claim).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("sends one reply to the sender even for concurrent duplicate notifications", async () => {
    const { app, send } = harness();
    const payload = event();
    const replies = await Promise.all([app.request(PATH, request(payload)), app.request(PATH, request(payload))]);
    expect(replies.map((reply) => reply.status)).toEqual([200, 200]);
    expect(send).toHaveBeenCalledTimes(1);
    const [url, options] = send.mock.calls[0];
    expect(url).toBe(`https://graph.facebook.com/v27.0/${PHONE_ID}/messages`);
    expect(JSON.parse(String(options?.body))).toMatchObject({ to: "256700000001", text: { body: expect.stringContaining("Oli otya") } });
  });

  it("supports senders with only a WhatsApp business-scoped ID and does not echo attachments", async () => {
    const { app, send } = harness();
    const payload = event({ message: { from: undefined, from_user_id: "UG.1234567890000", type: "image", image: { caption: "customer details" } } });
    expect((await app.request(PATH, request(payload))).status).toBe(200);
    const body = JSON.parse(String(send.mock.calls[0][1]?.body));
    expect(body.recipient).toBe("UG.1234567890000");
    expect(body.to).toBeUndefined();
    expect(body.text.body).toContain("Please type");
    expect(body.text.body).not.toContain("customer details");
  });

  it("retries a rejected request and avoids resending when delivery is uncertain", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { app, send } = harness();
    const payload = event();
    send.mockResolvedValueOnce(new Response(null, { status: 429 }));
    send.mockRejectedValueOnce(new Error("network timeout"));
    expect((await app.request(PATH, request(payload))).status).toBe(503);
    expect((await app.request(PATH, request(payload))).status).toBe(200);
    expect((await app.request(PATH, request(payload))).status).toBe(200);
    expect(send).toHaveBeenCalledTimes(2);
  });
});
