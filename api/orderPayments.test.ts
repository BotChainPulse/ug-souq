import { describe, expect, it } from "vitest";
import { isVerifiedOrderPayment, serverDeliveryFee } from "./orderPayments";

describe("serverDeliveryFee", () => {
  it("uses server-owned Uganda delivery prices", () => {
    expect(serverDeliveryFee("kampala", "door", false)).toBe(4600);
    expect(serverDeliveryFee("kampala", "pickup", false)).toBe(2900);
    expect(serverDeliveryFee("upcountry", "door", false)).toBe(9000);
    expect(serverDeliveryFee("upcountry", "pickup", false)).toBe(5000);
  });

  it("allows free delivery only for an active Plus membership", () => {
    expect(serverDeliveryFee("upcountry", "door", true)).toBe(0);
  });
});

describe("isVerifiedOrderPayment", () => {
  const expected = {
    reference: "ORDER-US-ABCDE-1",
    amount: 12500,
    currency: "UGX",
  };

  it("accepts an exact successful payment", () => {
    expect(
      isVerifiedOrderPayment(
        {
          status: "successful",
          tx_ref: expected.reference,
          amount: 12500,
          currency: "UGX",
        },
        expected
      )
    ).toBe(true);
  });

  it.each([
    [
      {
        status: "failed",
        tx_ref: expected.reference,
        amount: 12500,
        currency: "UGX",
      },
    ],
    [
      {
        status: "successful",
        tx_ref: "ORDER-WRONG",
        amount: 12500,
        currency: "UGX",
      },
    ],
    [
      {
        status: "successful",
        tx_ref: expected.reference,
        amount: 12000,
        currency: "UGX",
      },
    ],
    [
      {
        status: "successful",
        tx_ref: expected.reference,
        amount: 12500,
        currency: "USD",
      },
    ],
  ])("rejects mismatched or unsuccessful provider data", data => {
    expect(isVerifiedOrderPayment(data, expected)).toBe(false);
  });
});
