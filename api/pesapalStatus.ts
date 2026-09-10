export type PesapalStatus = "pending" | "completed" | "failed" | "reversed" | "invalid";

export function mapPesapalStatus(value: unknown): PesapalStatus {
  switch (String(value ?? "").trim().toUpperCase()) {
    case "COMPLETED": return "completed";
    case "FAILED": return "failed";
    case "REVERSED": return "reversed";
    case "INVALID": return "invalid";
    default: return "pending";
  }
}

export function validatePesapalTransaction(expected: { merchantReference: string; amount: number; currency: string }, response: any) {
  const providerReference = String(response?.merchant_reference ?? "");
  const amount = Number(response?.amount);
  const currency = String(response?.currency ?? "").toUpperCase();
  const matches = providerReference === expected.merchantReference && amount === expected.amount && currency === expected.currency.toUpperCase();
  return { providerReference, amount, currency, status: matches ? mapPesapalStatus(response?.payment_status_description) : "invalid" as PesapalStatus };
}
