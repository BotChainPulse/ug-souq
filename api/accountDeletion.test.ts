import { describe, expect, it } from "vitest";
import { accountDeletionTokenHash, accountDeletionTokenMatches, newAccountDeletionToken } from "./accountDeletion";

describe("account deletion credential", () => {
  it("accepts only the token used to create the stored hash", () => {
    const token = newAccountDeletionToken();
    const hash = accountDeletionTokenHash(token);
    expect(accountDeletionTokenMatches(token, hash)).toBe(true);
    expect(accountDeletionTokenMatches(newAccountDeletionToken(), hash)).toBe(false);
  });

  it("rejects missing and malformed credentials", () => {
    expect(accountDeletionTokenMatches("", null)).toBe(false);
    expect(accountDeletionTokenMatches("token", "not-a-sha256-hash")).toBe(false);
  });
});
