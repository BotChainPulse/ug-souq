import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { customers } from "../db/schema";
import { getDb } from "./queries/connection";
import { accountDeletionTokenMatches } from "./accountDeletion";

export const CUSTOMER_CREDENTIAL_HEADER = "x-ugsouq-customer-credential";

// Reuse the credential already issued to the account's original device. Never
// accept a phone number, local profile or order code as an account credential.
export async function requireCustomerOwnership(req: Request, phone: string) {
  const token = req.headers.get(CUSTOMER_CREDENTIAL_HEADER) ?? "";
  if (token.length < 32 || token.length > 128) throw unauthorised();
  const [customer] = await getDb().select().from(customers)
    .where(eq(customers.phone, phone.replace(/[\s-]+/g, "").trim())).limit(1);
  if (!customer || !accountDeletionTokenMatches(token, customer.deletionTokenHash)) throw unauthorised();
  return customer;
}

function unauthorised() {
  return new TRPCError({ code: "UNAUTHORIZED", message: "Use the original secured account device or verified account recovery to access these orders." });
}

// Account order lists do not need payment references, payout details or internal
// delivery notes. Keep a deliberate allowlist rather than spreading DB rows.
export function customerOrderSummary(order: typeof import("../db/schema").orders.$inferSelect) {
  return {
    id: order.id, code: order.code, address: order.address,
    paymentMethod: order.paymentMethod, paymentStatus: order.paymentStatus,
    subtotal: order.subtotal, deliveryFee: order.deliveryFee, total: order.total,
    status: order.status, createdAt: order.createdAt, deliveredAt: order.deliveredAt,
  };
}
