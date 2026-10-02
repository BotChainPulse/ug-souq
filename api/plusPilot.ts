// Plus membership is not commercially active yet. Keep the delivery-charge
// decision in one tested function so a stored pilot record cannot waive fees.
export function pilotDeliveryFee(quotedDeliveryFee: number) {
  if (!Number.isFinite(quotedDeliveryFee) || quotedDeliveryFee < 0) {
    throw new Error("Invalid delivery fee");
  }
  return quotedDeliveryFee;
}
