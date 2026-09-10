import { describe, expect, it } from "vitest";
import { sellerApprovalMissingFields } from "./sellerApproval";

const completeSeller = {
  idType: "national_id",
  idNumber: "CM00000000",
  district: "Kampala",
  landmark: "Central Division",
  payoutMethod: "mtn_momo",
  payoutNumber: "0700000000",
  sellerContractAccepted: true,
  commissionTermsAccepted: true,
};

describe("seller approval requirements", () => {
  it("accepts a complete seller application", () => {
    expect(sellerApprovalMissingFields(completeSeller)).toEqual([]);
  });

  it("requires agreements accepted by the seller", () => {
    expect(sellerApprovalMissingFields({
      ...completeSeller,
      sellerContractAccepted: false,
      commissionTermsAccepted: false,
    })).toEqual(["seller agreement", "commission terms"]);
  });

  it("reports missing identity, location, and payout information", () => {
    expect(sellerApprovalMissingFields({
      ...completeSeller,
      idNumber: null,
      landmark: null,
      payoutNumber: null,
    })).toEqual(["identity details", "business location", "payout details"]);
  });
});
