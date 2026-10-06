import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { createHash } from "crypto";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { adminAuditLogs, sellers, sellerPartnerships } from "../db/schema";
import { decryptIdentity, encryptIdentity } from "./identity";
import { partnershipInput, parseAgreementPdf } from "./partnershipPolicy";

function summary(row: typeof sellerPartnerships.$inferSelect) {
 const { documentCiphertext, documentIv, documentTag, ...metadata } = row;
 return { ...metadata, hasDocument: Boolean(documentCiphertext && documentIv && documentTag) };
}

export function partnershipRouter(requireAdmin: (key: string) => void) {
 return createRouter({
  list: publicQuery.input(z.object({ key: z.string(), sellerId: z.number().int().positive() })).query(async ({ input }) => {
   requireAdmin(input.key);
   return (await getDb().select().from(sellerPartnerships).where(eq(sellerPartnerships.sellerId, input.sellerId)).orderBy(desc(sellerPartnerships.id))).map(summary);
  }),
  create: publicQuery.input(partnershipInput.safeExtend({ key: z.string() })).mutation(async ({ input }) => {
   requireAdmin(input.key);
   const now = new Date();
   if (input.status === "active" && (input.endsAt <= now || input.signedAt! > now)) throw new TRPCError({ code: "BAD_REQUEST", message: "The signed pilot must not have expired or have a future signing date." });
   const pdf = input.documentData ? parseAgreementPdf(input.documentData) : null;
   const encrypted = pdf ? encryptIdentity(pdf.data) : null;
   const db = getDb();
   return db.transaction(async (tx) => {
    const [seller] = await tx.select().from(sellers).where(eq(sellers.id, input.sellerId)).for("update");
    if (!seller) throw new TRPCError({ code: "NOT_FOUND", message: "Seller not found." });
    if (input.status === "active" && seller.status !== "approved") throw new TRPCError({ code: "BAD_REQUEST", message: "Approve the seller before activating a pilot agreement." });
    const existing = await tx.select().from(sellerPartnerships).where(and(eq(sellerPartnerships.sellerId, seller.id), eq(sellerPartnerships.status, "active")));
    if (input.status === "active" && existing.some(row => row.endsAt > input.startsAt && row.startsAt < input.endsAt)) throw new TRPCError({ code: "CONFLICT", message: "An active agreement overlaps this pilot. End it or choose non-overlapping dates." });
    const [created] = await tx.insert(sellerPartnerships).values({
     sellerId: seller.id, reference: input.reference, version: input.version, status: input.status,
     commissionRate: input.commissionRate.toFixed(4), listingLimit: input.listingLimit,
     startsAt: input.startsAt, endsAt: input.endsAt, promotionEndsAt: input.promotionEndsAt,
     sellerSignatory: input.sellerSignatory, platformSignatory: input.platformSignatory,
     signedAt: input.signedAt, termsText: input.termsText,
     documentName: pdf ? (input.documentName || "signed-agreement.pdf").replace(/[^a-zA-Z0-9._ -]/g, "_") : null,
     documentHash: pdf?.hash ?? null, documentCiphertext: encrypted?.ciphertext ?? null,
     documentIv: encrypted?.iv ?? null, documentTag: encrypted?.tag ?? null,
    }).$returningId();
    await tx.insert(adminAuditLogs).values({
     actorTag: createHash("sha256").update(input.key).digest("hex").slice(0, 12),
     action: `seller.partnership.${input.status === "active" ? "activated" : "drafted"}`,
     entityType: "seller", entityId: String(seller.id),
     meta: JSON.stringify({ agreementId: created.id, reference: input.reference, version: input.version, commissionRate: input.commissionRate, listingLimit: input.listingLimit, startsAt: input.startsAt, endsAt: input.endsAt, documentHash: pdf?.hash, signaturesVerified: input.signaturesVerified }),
    });
    return { id: created.id };
   });
  }),
  end: publicQuery.input(z.object({ key: z.string(), id: z.number().int().positive(), reason: z.string().trim().min(5).max(1000) })).mutation(async ({ input }) => {
   requireAdmin(input.key);
   return getDb().transaction(async (tx) => {
    const [record] = await tx.select().from(sellerPartnerships).where(eq(sellerPartnerships.id, input.id)).for("update");
    if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Agreement not found." });
    await tx.update(sellerPartnerships).set({ status: "ended" }).where(eq(sellerPartnerships.id, record.id));
    await tx.insert(adminAuditLogs).values({ actorTag: createHash("sha256").update(input.key).digest("hex").slice(0, 12), action: "seller.partnership.ended", entityType: "seller", entityId: String(record.sellerId), meta: JSON.stringify({ agreementId: record.id, reason: input.reason }) });
    return { ok: true };
   });
  }),
  document: publicQuery.input(z.object({ key: z.string(), id: z.number().int().positive() })).mutation(async ({ input }) => {
   requireAdmin(input.key);
   const db = getDb();
   const [row] = await db.select().from(sellerPartnerships).where(eq(sellerPartnerships.id, input.id));
   if (!row?.documentCiphertext || !row.documentIv || !row.documentTag) throw new TRPCError({ code: "NOT_FOUND", message: "No agreement document is attached." });
   await db.insert(adminAuditLogs).values({ actorTag: createHash("sha256").update(input.key).digest("hex").slice(0, 12), action: "seller.partnership.document_viewed", entityType: "seller", entityId: String(row.sellerId), meta: JSON.stringify({ agreementId: row.id, documentHash: row.documentHash }) });
   return { name: row.documentName || "signed-agreement.pdf", data: decryptIdentity({ ciphertext: row.documentCiphertext, iv: row.documentIv, tag: row.documentTag }) };
  }),
 });
}
