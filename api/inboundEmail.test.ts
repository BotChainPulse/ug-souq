import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { forwardedSubject, isBlockedAttachment, selectOfficialMailbox, verifyResendWebhook } from "./inboundEmail";

describe("inbound official email routing", () => {
  it("allows only the three official UGSouq addresses", () => {
    expect(selectOfficialMailbox(["UGSouq Support <support@ugsouq.com>"])).toBe("support@ugsouq.com");
    expect(selectOfficialMailbox(["info@ugsouq.com"])).toBe("info@ugsouq.com");
    expect(selectOfficialMailbox(["PARTNERSHIPS@UGSOUQ.COM"])).toBe("partnerships@ugsouq.com");
    expect(selectOfficialMailbox(["anything@ugsouq.com"])).toBeNull();
  });

  it("labels forwarded messages by mailbox", () => {
    expect(forwardedSubject("support@ugsouq.com", "Order help")).toBe("[Support] Order help");
    expect(forwardedSubject("partnerships@ugsouq.com", "")).toBe("[Partnerships] (no subject)");
  });

  it("blocks executable attachment formats", () => {
    expect(isBlockedAttachment("invoice.pdf")).toBe(false);
    expect(isBlockedAttachment("payload.EXE")).toBe(true);
    expect(isBlockedAttachment("setup.ps1")).toBe(true);
  });

  it("accepts authentic Resend signatures and rejects tampering", () => {
    const secretBytes = Buffer.from("0123456789abcdef0123456789abcdef");
    const secret = `whsec_${secretBytes.toString("base64")}`;
    const payload = JSON.stringify({ type: "email.received", data: { email_id: "mail-1" } });
    const timestamp = "1760000000";
    const id = "msg_123";
    const signature = createHmac("sha256", secretBytes)
      .update(`${id}.${timestamp}.${payload}`)
      .digest("base64");

    expect(verifyResendWebhook(payload, { id, timestamp, signature: `v1,${signature}` }, secret, 1760000000 * 1000).type)
      .toBe("email.received");
    expect(() => verifyResendWebhook(`${payload} `, { id, timestamp, signature: `v1,${signature}` }, secret, 1760000000 * 1000))
      .toThrow("Invalid webhook signature");
  });
});

