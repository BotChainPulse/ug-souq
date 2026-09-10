export type SellerApprovalCandidate = {
  idType?: string | null;
  idNumber?: string | null;
  district?: string | null;
  landmark?: string | null;
  payoutMethod?: string | null;
  payoutNumber?: string | null;
  sellerContractAccepted?: boolean | null;
  commissionTermsAccepted?: boolean | null;
};

export function sellerApprovalMissingFields(seller: SellerApprovalCandidate): string[] {
  const missing: string[] = [];
  if (!seller.idType || !seller.idNumber) missing.push("identity details");
  if (!seller.district || !seller.landmark) missing.push("business location");
  if (!seller.payoutMethod || !seller.payoutNumber) missing.push("payout details");
  if (!seller.sellerContractAccepted) missing.push("seller agreement");
  if (!seller.commissionTermsAccepted) missing.push("commission terms");
  return missing;
}
