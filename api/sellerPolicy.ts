export const FREE_LISTING_LIMIT = 5;
export const PRO_LISTING_LIMIT = 50;
export const PRO_MONTHLY_FEE = 30_000;
export const FREE_COMMISSION_RATE = 0.07;
export const PRO_COMMISSION_RATE = 0.05;

export type SellerSubscriptionSnapshot = {
  tier?: string | null;
  isActive?: boolean | null;
  expiresAt?: Date | null;
};

export function isActiveSellerPro(
  subscription: SellerSubscriptionSnapshot | null | undefined,
  now = new Date(),
) {
  return Boolean(
    subscription?.tier === "premium" &&
    subscription.isActive &&
    (!subscription.expiresAt || subscription.expiresAt > now),
  );
}

export function sellerPlan(subscription: SellerSubscriptionSnapshot | null | undefined, now = new Date()) {
  const pro = isActiveSellerPro(subscription, now);
  return {
    tier: pro ? "pro" as const : "free" as const,
    listingLimit: pro ? PRO_LISTING_LIMIT : FREE_LISTING_LIMIT,
    commissionRate: pro ? PRO_COMMISSION_RATE : FREE_COMMISSION_RATE,
    monthlyFee: pro ? PRO_MONTHLY_FEE : 0,
    expiresAt: pro ? subscription?.expiresAt ?? null : null,
  };
}

export function commissionForLine(price: number, qty: number, rate: number) {
  return Math.round(price * qty * rate);
}
