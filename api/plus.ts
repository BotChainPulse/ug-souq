const PLUS_PRICE_UGX = Math.max(
  1,
  Number.parseInt(process.env.PLUS_MONTHLY_PRICE_UGX ?? "10000", 10) || 10000
);
const PLUS_DURATION_DAYS = Math.max(
  1,
  Number.parseInt(process.env.PLUS_DURATION_DAYS ?? "30", 10) || 30
);

export const plusPlan = {
  amount: PLUS_PRICE_UGX,
  currency: "UGX",
  durationDays: PLUS_DURATION_DAYS,
};
