import { describe, expect, it } from "vitest";
import { pilotDeliveryFee } from "./plusPilot";

describe("Plus pilot delivery policy", () => {
  it("keeps the quoted delivery fee during the pilot", () => {
    expect(pilotDeliveryFee(4600)).toBe(4600);
  });

  it("rejects an invalid quoted fee", () => {
    expect(() => pilotDeliveryFee(-1)).toThrow(/Invalid delivery fee/);
  });
});
