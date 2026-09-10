import { describe, expect, it } from "vitest";
import { mapPesapalStatus, validatePesapalTransaction } from "./pesapalStatus";

describe("Pesapal status mapping", () => {
  it.each([
    ["COMPLETED", "completed"], ["Completed", "completed"], ["FAILED", "failed"],
    ["REVERSED", "reversed"], ["INVALID", "invalid"], ["", "pending"], [undefined, "pending"],
  ])("maps %s safely", (provider, expected) => expect(mapPesapalStatus(provider)).toBe(expected));
});

describe("Pesapal payment matching", () => {
  const expected = { merchantReference: "US-ABCDE-a1b2", amount: 45000, currency: "UGX" };
  it("accepts a completed exact match", () => {
    expect(validatePesapalTransaction(expected, { merchant_reference: expected.merchantReference, amount: 45000, currency: "UGX", payment_status_description: "COMPLETED" }).status).toBe("completed");
  });
  it.each([
    [{ merchant_reference: "wrong", amount: 45000, currency: "UGX", payment_status_description: "COMPLETED" }],
    [{ merchant_reference: expected.merchantReference, amount: 44000, currency: "UGX", payment_status_description: "COMPLETED" }],
    [{ merchant_reference: expected.merchantReference, amount: 45000, currency: "KES", payment_status_description: "COMPLETED" }],
  ])("rejects a mismatched completed notification", (response) => {
    expect(validatePesapalTransaction(expected, response).status).toBe("invalid");
  });
});
