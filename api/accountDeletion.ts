import { createHash, randomBytes, timingSafeEqual } from "crypto";

export const newAccountDeletionToken = () => randomBytes(32).toString("base64url");

export const accountDeletionTokenHash = (token: string) =>
  createHash("sha256").update(token, "utf8").digest("hex");

export function accountDeletionTokenMatches(token: string, expectedHash: string | null | undefined) {
  if (!token || !expectedHash) return false;
  const actual = Buffer.from(accountDeletionTokenHash(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
