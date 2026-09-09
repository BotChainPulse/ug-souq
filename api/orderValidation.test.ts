import { describe, expect, it } from "vitest";
import { getServerDeliveryQuote, validateRequestedItems } from "./orderValidation";

describe("order validation", () => {
  it("rejects duplicate item identifiers", () => {
    expect(() => validateRequestedItems([
      { itemType: "product", itemId: 4, qty: 1 },
      { itemType: "product", itemId: 4, qty: 2 },
    ])).toThrow(/Duplicate cart items/);
  });

  it("keeps product and seller listing identifiers separate", () => {
    expect(() => validateRequestedItems([
      { itemType: "product", itemId: 4, qty: 1 },
      { itemType: "listing", itemId: 4, qty: 1 },
    ])).not.toThrow();
  });

  it("calculates delivery fees from server-owned configuration", () => {
    expect(getServerDeliveryQuote({
      zoneId: "kampala",
      deliveryMethod: "door",
      address: "Ntinda, Kampala",
    })).toEqual({
      deliveryFee: 4600,
      address: "Ntinda, Kampala — Kampala Region, door delivery",
    });
  });

  it("rejects an unknown pickup station", () => {
    expect(() => getServerDeliveryQuote({
      zoneId: "kampala",
      deliveryMethod: "pickup",
      stationId: "not-real",
      address: "",
    })).toThrow(/valid pickup station/);
  });
});
