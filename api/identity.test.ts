import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { decryptIdentity, encryptIdentity, identityFingerprint, parseIdentityDocumentDataUrl, reviewedDocumentRetentionDate } from "./identity";

describe("seller identity protection", () => {
  const previous = process.env.SELLER_DOCUMENT_ENCRYPTION_KEY;
  beforeEach(() => { process.env.SELLER_DOCUMENT_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64"); });
  afterEach(() => { process.env.SELLER_DOCUMENT_ENCRYPTION_KEY = previous; });

  it("encrypts with authenticated encryption and decrypts only on the server", () => {
    const encrypted = encryptIdentity("CM1234567890ABCD");
    expect(encrypted.ciphertext).not.toContain("CM123");
    expect(decryptIdentity(encrypted)).toBe("CM1234567890ABCD");
  });

  it("uses a stable keyed fingerprint without retaining the number", () => {
    expect(identityFingerprint("cm1234")).toBe(identityFingerprint(" CM1234 "));
  });

  it("rejects unsupported identity upload formats", () => {
    expect(() => parseIdentityDocumentDataUrl("data:text/plain;base64,SGVsbG8=")).toThrow(/JPG/);
  });

  it("sets reviewed-document deletion to 30 days", () => {
    const now = new Date("2026-09-10T00:00:00Z");
    expect(reviewedDocumentRetentionDate(now).toISOString()).toBe("2026-10-10T00:00:00.000Z");
  });
});
