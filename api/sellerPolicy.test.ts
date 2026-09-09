import { describe, expect, it } from "vitest";
import {
  FREE_LISTING_LIMIT,
  PRO_LISTING_LIMIT,
  commissionForLine,
  sellerPlan,
} from "./sellerPolicy";

describe("seller commercial policy", () => {
  it("gives a free seller five listing slots at seven percent commission", () => {
    expect(sellerPlan(null)).toMatchObject({ tier: "free", listingLimit: FREE_LISTING_LIMIT, commissionRate: 0.07 });
  });

  it("gives an active Pro seller fifty slots at five percent commission", () => {
    expect(sellerPlan({ tier: "premium", isActive: true, expiresAt: new Date("2099-01-01") }))
      .toMatchObject({ tier: "pro", listingLimit: PRO_LISTING_LIMIT, commissionRate: 0.05 });
  });

  it("does not honour an expired Pro subscription", () => {
    expect(sellerPlan({ tier: "premium", isActive: true, expiresAt: new Date("2020-01-01") }))
      .toMatchObject({ tier: "free", listingLimit: FREE_LISTING_LIMIT });
  });

  it("rounds commission independently for each seller line", () => {
    expect(commissionForLine(10_001, 3, 0.07)).toBe(2_100);
    expect(commissionForLine(10_001, 3, 0.05)).toBe(1_500);
  });
});
