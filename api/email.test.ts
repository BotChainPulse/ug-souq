import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { matchRoutes } from "react-router";
import {
  outboundEmailConfigured,
  outboundFromAddress,
  sendOrderPlacedEmail,
  sendOrderStatusEmail,
  sendResendEmail,
  sendSellerStatusEmail,
} from "./email";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("outgoing Resend email", () => {
  it.each(["placed", "status"] as const)("links the %s email to a registered protected order route", async (kind) => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("SYSTEM_FROM_EMAIL", "UGSouq <notifications@ugsouq.com>");
    vi.stubEnv("APP_URL", "https://pilot.example.com/");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "email_route" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const order = {
      code: "US-ABC 123",
      customerName: "Customer",
      customerEmail: "customer@example.com",
      status: "confirmed",
      paymentStatus: "unpaid",
      paymentMethod: "cash",
      address: "Kampala",
      subtotal: 1000,
      deliveryFee: 500,
      total: 1500,
    };

    if (kind === "placed") await sendOrderPlacedEmail(order, []);
    else await sendOrderStatusEmail(order, "confirmed");

    const payload = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    const href = payload.html.match(/href="([^"]+)"[^>]*>(?:View|Track) order<\/a>/)?.[1];
    expect(href).toBe("https://pilot.example.com/orders/US-ABC%20123");
    // Check the email destination against the application's real route declarations.
    const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
    const routes = [...appSource.matchAll(/<Route path="([^"]+)"/g)].map((match) => ({ path: match[1] }));
    const matched = matchRoutes(routes, new URL(href).pathname);
    expect(matched?.at(-1)?.route.path).toBe("/orders/:code");
    expect(matched?.at(-1)?.params.code).toBe(order.code);
  });

  it("keeps transactional and marketing senders separate", () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("SYSTEM_FROM_EMAIL", "UGSouq <notifications@ugsouq.com>");
    vi.stubEnv("MARKETING_FROM_EMAIL", "UGSouq Deals <deals@ugsouq.com>");

    expect(outboundEmailConfigured()).toBe(true);
    expect(outboundFromAddress()).toBe("UGSouq <notifications@ugsouq.com>");
    expect(outboundFromAddress("marketing")).toBe("UGSouq Deals <deals@ugsouq.com>");
  });

  it("sends through Resend with a deterministic idempotency key", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("SYSTEM_FROM_EMAIL", "UGSouq <notifications@ugsouq.com>");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "email_1" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendResendEmail({
      to: "Customer@Example.com",
      subject: "Order received",
      html: "<p>Safe</p>",
      idempotencyKey: "order-placed-ABC123",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(request.headers).toMatchObject({
      Authorization: "Bearer re_test",
      "Content-Type": "application/json",
      "Idempotency-Key": "order-placed-ABC123",
    });
    expect(JSON.parse(String(request.body))).toMatchObject({
      from: "UGSouq <notifications@ugsouq.com>",
      to: ["customer@example.com"],
      subject: "Order received",
    });
  });

  it("does not call Resend when an order has no recipient", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await sendOrderPlacedEmail({
      code: "ABC123",
      customerName: "Customer",
      customerEmail: null,
      status: "placed",
      paymentStatus: "unpaid",
      paymentMethod: "cash",
      address: "Kampala",
      subtotal: 1000,
      deliveryFee: 500,
      total: 1500,
    }, []);

    expect(result).toEqual({ skipped: true, reason: "no_recipient" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("escapes seller-controlled values in system emails", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("SYSTEM_FROM_EMAIL", "UGSouq <notifications@ugsouq.com>");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "email_2" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendSellerStatusEmail({
      id: 7,
      email: "seller@example.com",
      ownerName: "A <script>",
      shopName: "Shop & Sons",
      status: "approved",
    });

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    const payload = JSON.parse(String(request.body));
    expect(payload.html).toContain("A &lt;script&gt;");
    expect(payload.html).toContain("Shop &amp; Sons");
    expect(payload.html).not.toContain("A <script>");
  });
});
