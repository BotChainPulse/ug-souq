import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { customers, customerAddressBooks, customerAddressLinks } from "../db/schema";
import { validUgandanPhone, type CustomerAddress } from "../src/lib/addressBook";
import { accountDeletionTokenHash, accountDeletionTokenMatches, newAccountDeletionToken } from "./accountDeletion";
import { CUSTOMER_CREDENTIAL_HEADER } from "./customerOwnership";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";

const MAX_ADDRESSES = 10;
const codeLifetimeMs = 5 * 60_000;
const deviceLifetimeMs = 30 * 24 * 60 * 60_000;
const addressInput = z.object({
  label: z.enum(["Home", "Work", "Other"]),
  address: z.string().trim().min(5).max(500),
  phone: z.string().trim().max(32).regex(/^\+?[\d -]+$/).refine(validUgandanPhone, "Enter a valid Ugandan phone number."),
});
const accessInput = z.object({
  phone: z.string().trim().min(9).max(32).optional(),
  deviceToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/).optional(),
});
type AccessInput = z.infer<typeof accessInput>;
type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

function unauthorised() {
  return new TRPCError({
    code: "UNAUTHORIZED",
    message: "Use the original secured account device or link this device again.",
  });
}

async function withAccess<T>(
  request: Request,
  input: AccessInput,
  ownerOnly: boolean,
  operation: (tx: Tx, customerId: number) => Promise<T>,
) {
  const token = request.headers.get(CUSTOMER_CREDENTIAL_HEADER) ?? "";
  const owner = !!input.phone && token.length >= 32 && token.length <= 128;
  if (!owner && (ownerOnly || request.method !== "POST" || !input.deviceToken || input.phone || token)) throw unauthorised();
  return getDb().transaction(async tx => {
    let id: number;
    if (owner && input.phone) {
      const phone = input.phone.replace(/[\s-]+/g, "").trim();
      const [customer] = await tx.select().from(customers).where(eq(customers.phone, phone)).limit(1).for("update");
      if (!customer || !accountDeletionTokenMatches(token, customer.deletionTokenHash)) throw unauthorised();
      id = customer.id;
    } else {
      const deviceHash = accountDeletionTokenHash(input.deviceToken!);
      const [candidate] = await tx.select().from(customerAddressLinks).where(eq(customerAddressLinks.deviceHash, deviceHash)).limit(1);
      if (!candidate) throw unauthorised();
      const [customer] = await tx.select({ id: customers.id }).from(customers).where(eq(customers.id, candidate.customerId)).for("update");
      if (!customer) throw unauthorised();
      const [current] = await tx.select().from(customerAddressLinks).where(eq(customerAddressLinks.customerId, customer.id)).for("update");
      if (!current || current.deviceHash !== deviceHash || !current.deviceExpiresAt || current.deviceExpiresAt.getTime() <= Date.now()) throw unauthorised();
      id = customer.id;
    }
    return operation(tx, id);
  });
}

async function readBook(tx: Tx, customerId: number): Promise<CustomerAddress[]> {
  const [row] = await tx.select().from(customerAddressBooks).where(eq(customerAddressBooks.customerId, customerId)).for("update");
  return row ? JSON.parse(row.addresses) as CustomerAddress[] : [];
}

async function writeBook(tx: Tx, customerId: number, rows: CustomerAddress[]) {
  const addresses = JSON.stringify(rows);
  await tx.insert(customerAddressBooks).values({ customerId, addresses }).onDuplicateKeyUpdate({ set: { addresses } });
  return rows;
}

export async function deleteCustomerAddressData(tx: Pick<Tx, "delete">, customerId: number) {
  await tx.delete(customerAddressBooks).where(eq(customerAddressBooks.customerId, customerId));
  await tx.delete(customerAddressLinks).where(eq(customerAddressLinks.customerId, customerId));
}

export const addressBookRouter = createRouter({
  list: publicQuery.input(accessInput).query(({ ctx, input }) =>
    withAccess(ctx.req, input, false, readBook)),
  add: publicQuery.input(accessInput.extend({ entry: addressInput })).mutation(({ ctx, input }) =>
    withAccess(ctx.req, input, false, async (tx, id) => {
      const rows = await readBook(tx, id);
      if (rows.some(row => sameAddress(row, input.entry))) return rows;
      if (rows.length >= MAX_ADDRESSES) throw fullBook();
      return writeBook(tx, id, [...rows, { ...input.entry, id: randomUUID(), isDefault: rows.length === 0 }]);
    })),
  importFromDevice: publicQuery.input(accessInput.extend({ entries: z.array(addressInput).min(1).max(MAX_ADDRESSES) }))
    .mutation(({ ctx, input }) =>
      withAccess(ctx.req, input, true, async (tx, id) => {
        const rows = await readBook(tx, id);
        for (const entry of input.entries) {
          if (rows.some(row => sameAddress(row, entry))) continue;
          if (rows.length >= MAX_ADDRESSES) throw fullBook();
          rows.push({ ...entry, id: randomUUID(), isDefault: rows.length === 0 });
        }
        return writeBook(tx, id, rows);
      })),
  remove: publicQuery.input(accessInput.extend({ id: z.uuid() })).mutation(({ ctx, input }) =>
    withAccess(ctx.req, input, false, async (tx, id) => {
      const rows = (await readBook(tx, id)).filter(row => row.id !== input.id);
      if (rows.length && !rows.some(row => row.isDefault)) rows[0] = { ...rows[0], isDefault: true };
      return writeBook(tx, id, rows);
    })),
  issueLink: publicQuery.input(accessInput).mutation(({ ctx, input }) =>
    withAccess(ctx.req, input, true, async (tx, customerId) => {
      const code = newAccountDeletionToken();
      const pairingHash = accountDeletionTokenHash(code);
      const pairingExpiresAt = new Date(Date.now() + codeLifetimeMs);
      await tx.insert(customerAddressLinks).values({ customerId, pairingHash, pairingExpiresAt })
        .onDuplicateKeyUpdate({ set: { pairingHash, pairingExpiresAt } });
      return { code };
    })),
  redeemLink: publicQuery.input(z.object({ code: z.string().trim().regex(/^[A-Za-z0-9_-]{43}$/) }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.req.headers.has(CUSTOMER_CREDENTIAL_HEADER)) throw unauthorised();
      const pairingHash = accountDeletionTokenHash(input.code);
      return getDb().transaction(async tx => {
        const [candidate] = await tx.select().from(customerAddressLinks).where(eq(customerAddressLinks.pairingHash, pairingHash)).limit(1);
        if (!candidate) throw invalidCode();
        const [customer] = await tx.select({ id: customers.id }).from(customers).where(eq(customers.id, candidate.customerId)).for("update");
        if (!customer) throw invalidCode();
        const [link] = await tx.select().from(customerAddressLinks).where(eq(customerAddressLinks.customerId, customer.id)).for("update");
        if (!link || link.pairingHash !== pairingHash || !link.pairingExpiresAt || link.pairingExpiresAt.getTime() <= Date.now()) throw invalidCode();
        const deviceToken = newAccountDeletionToken();
        await tx.update(customerAddressLinks).set({
          pairingHash: null, pairingExpiresAt: null,
          deviceHash: accountDeletionTokenHash(deviceToken),
          deviceExpiresAt: new Date(Date.now() + deviceLifetimeMs),
        }).where(eq(customerAddressLinks.customerId, customer.id));
        return { deviceToken };
      });
    }),
  revokeLink: publicQuery.input(accessInput).mutation(({ ctx, input }) =>
    withAccess(ctx.req, input, true, async (tx, id) => {
      await tx.delete(customerAddressLinks).where(eq(customerAddressLinks.customerId, id));
      return { ok: true };
    })),
});

function sameAddress(row: CustomerAddress, entry: z.infer<typeof addressInput>) {
  return row.label === entry.label && row.address === entry.address &&
    row.phone.replace(/\D/g, "").replace(/^(?:256|0)/, "") === entry.phone.replace(/\D/g, "").replace(/^(?:256|0)/, "");
}

function fullBook() {
  return new TRPCError({ code: "BAD_REQUEST", message: "You can save up to 10 addresses. Remove an address before adding more." });
}

function invalidCode() {
  return new TRPCError({ code: "BAD_REQUEST", message: "That link code is invalid, expired or already used. Create a new code on your original device." });
}
