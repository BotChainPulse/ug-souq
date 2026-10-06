import { z } from "zod";
import { createHash } from "crypto";

const DAY = 86_400_000;
export const PARTNERSHIP_TABLE_SQL = `CREATE TABLE IF NOT EXISTS seller_partnerships (
 id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY, seller_id bigint unsigned NOT NULL,
 reference varchar(100) NOT NULL, version varchar(32) NOT NULL,
 status enum('draft','active','ended') NOT NULL DEFAULT 'draft',
 commission_rate decimal(5,4) NOT NULL, listing_limit int NOT NULL,
 starts_at timestamp NOT NULL, ends_at timestamp NOT NULL, promotion_ends_at timestamp NULL,
 seller_signatory varchar(180) NOT NULL, platform_signatory varchar(180) NOT NULL, signed_at timestamp NULL,
 terms_text text NOT NULL, document_name varchar(255), document_hash varchar(64),
 document_ciphertext mediumtext, document_iv varchar(32), document_tag varchar(32),
 created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_partner_seller (seller_id, status)
)`;

export const partnershipInput = z.object({
 sellerId: z.number().int().positive(), reference: z.string().trim().min(3).max(100),
 version: z.string().trim().min(1).max(32), status: z.enum(["draft", "active"]),
 commissionRate: z.number().min(0).max(1), listingLimit: z.number().int().min(20).max(50),
 startsAt: z.coerce.date(), endsAt: z.coerce.date(), promotionEndsAt: z.coerce.date().nullable(),
 sellerSignatory: z.string().trim().max(180), platformSignatory: z.string().trim().max(180),
 signedAt: z.coerce.date().nullable(), termsText: z.string().trim().min(40).max(20_000),
 documentData: z.string().max(2_800_000).optional(), documentName: z.string().max(255).optional(),
 signaturesVerified: z.boolean().default(false),
}).superRefine((value, ctx) => {
 const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
 const duration = value.endsAt.getTime() - value.startsAt.getTime();
 if (duration <= 0 || duration > 90 * DAY) issue("endsAt", "A pilot must last between one moment and 90 days.");
 if (value.promotionEndsAt && (value.promotionEndsAt <= value.startsAt || value.promotionEndsAt > value.endsAt || value.promotionEndsAt.getTime() - value.startsAt.getTime() > 30 * DAY)) issue("promotionEndsAt", "Promotion must fall within the pilot and last no more than 30 days.");
 if (value.signedAt && value.signedAt > value.startsAt) issue("signedAt", "The agreement must be signed before the pilot starts.");
 if (value.status === "active" && (!value.signedAt || !value.sellerSignatory || !value.platformSignatory || !value.documentData || !value.signaturesVerified)) issue("status", "Activation requires a signed PDF, both signatories, signing date and signature verification.");
});

export type PartnershipSnapshot = {
 status: string; commissionRate: string | number; listingLimit: number;
 startsAt: Date; endsAt: Date; signedAt: Date | null; documentHash: string | null;
 sellerSignatory?: string; platformSignatory?: string;
};
export function activePartnership(partnership: PartnershipSnapshot | null | undefined, now = new Date()) {
 return Boolean(partnership?.status === "active" && partnership.signedAt && partnership.documentHash &&
 partnership.sellerSignatory && partnership.platformSignatory &&
 partnership.startsAt <= now && now < partnership.endsAt &&
 Number.isFinite(Number(partnership.commissionRate)) && Number(partnership.commissionRate) >= 0 && Number(partnership.commissionRate) <= 1 &&
 partnership.listingLimit >= 20 && partnership.listingLimit <= 50);
}
export function parseAgreementPdf(data: string) {
 const match = /^data:application\/pdf;base64,([A-Za-z0-9+/=]+)$/.exec(data);
 if (!match) throw new Error("Upload a PDF agreement.");
 const bytes = Buffer.from(match[1], "base64");
 if (bytes.length < 20 || bytes.length > 2_000_000 || bytes.subarray(0, 5).toString() !== "%PDF-") throw new Error("Upload a valid PDF up to 2 MB.");
 return { data: `data:application/pdf;base64,${bytes.toString("base64")}`, hash: createHash("sha256").update(bytes).digest("hex") };
}
