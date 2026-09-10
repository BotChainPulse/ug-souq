import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "crypto";

export const IDENTITY_CONSENT_VERSION = "2026-09-10";
export const IDENTITY_RETENTION_DAYS_AFTER_REVIEW = 30;

export type EncryptedValue = { ciphertext: string; iv: string; tag: string };

function encryptionKey() {
  const encoded = process.env.SELLER_DOCUMENT_ENCRYPTION_KEY?.trim();
  if (!encoded) throw new Error("Secure identity upload is temporarily unavailable. SELLER_DOCUMENT_ENCRYPTION_KEY must be configured.");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("SELLER_DOCUMENT_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  return key;
}

export function identityStorageReady() {
  try { encryptionKey(); return true; } catch { return false; }
}

export function encryptIdentity(value: string): EncryptedValue {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return { ciphertext: ciphertext.toString("base64"), iv: iv.toString("hex"), tag: cipher.getAuthTag().toString("hex") };
}

export function decryptIdentity(value: EncryptedValue) {
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(value.iv, "hex"));
  decipher.setAuthTag(Buffer.from(value.tag, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(value.ciphertext, "base64")), decipher.final()]).toString("utf8");
}

export function identityFingerprint(value: string) {
  return createHmac("sha256", encryptionKey()).update(value.trim().toUpperCase()).digest("hex");
}

export function reviewedDocumentRetentionDate(now = new Date()) {
  return new Date(now.getTime() + IDENTITY_RETENTION_DAYS_AFTER_REVIEW * 24 * 60 * 60 * 1000);
}

export function parseIdentityDocumentDataUrl(dataUrl: string) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new Error("Upload a JPG, PNG or WebP image of the identity document.");
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length < 1_000 || bytes.length > 1_000_000) throw new Error("Identity image must be between 1 KB and 1 MB after compression.");
  return { mimeType: match[1], normalizedDataUrl: `data:${match[1]};base64,${bytes.toString("base64")}` };
}
