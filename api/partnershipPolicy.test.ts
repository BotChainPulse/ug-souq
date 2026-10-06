import { describe, expect, it } from 'vitest';
import { activePartnership, parseAgreementPdf, partnershipInput } from './partnershipPolicy';
import { commissionForLine, sellerPlan } from './sellerPolicy';

const pilot = {
 status: 'active' as const, commissionRate: '0.0300', listingLimit: 30,
 startsAt: new Date('2026-10-01'), endsAt: new Date('2026-12-30'),
 signedAt: new Date('2026-09-30'), documentHash: 'verified-hash',
 sellerSignatory: 'Partner representative', platformSignatory: 'UGSouq representative',
};
const now = new Date('2026-10-06');
const pdf = 'data:application/pdf;base64,' + Buffer.from('%PDF-1.7\nSigned test fixture\n%%EOF').toString('base64');
const input = { ...pilot, sellerId: 1, reference: 'PILOT-001', version: '1.0', commissionRate: .03,
 promotionEndsAt: new Date('2026-10-31'), termsText: 'Test agreement containing agreed commission, fulfilment, settlement and termination terms.',
 documentData: pdf, documentName: 'signed.pdf', signaturesVerified: true };

describe('signed partnership commercial policy', () => {
 it('uses negotiated terms at checkout, overriding Free and Pro during the pilot', () => {
  for (const subscription of [null, { tier: 'premium', isActive: true }]) {
   const terms = sellerPlan(subscription, now, pilot);
   expect(terms).toMatchObject({ tier: 'partner', listingLimit: 30, commissionRate: .03, monthlyFee: 0 });
   expect(commissionForLine(100_000, 2, terms.commissionRate)).toBe(6000);
  }
 });
 it('uses an inclusive start and exclusive end and restores the underlying plan', () => {
  expect(sellerPlan(null, pilot.startsAt, pilot).tier).toBe('partner');
  expect(sellerPlan(null, new Date('2026-09-30'), pilot).tier).toBe('free');
  expect(sellerPlan(null, pilot.endsAt, pilot)).toMatchObject({ tier: 'free', commissionRate: .07 });
  expect(sellerPlan({ tier: 'premium', isActive: true }, pilot.endsAt, pilot)).toMatchObject({ tier: 'pro', commissionRate: .05 });
 });
 it.each([{ status: 'draft' }, { status: 'ended' }, { signedAt: null }, { documentHash: null }, { sellerSignatory: '' }, { platformSignatory: '' }, { commissionRate: 'NaN' }, { listingLimit: 1001 }])('does not honour incomplete or inactive terms %j', change => {
  expect(activePartnership({ ...pilot, ...change }, now)).toBe(false);
  expect(sellerPlan(null, now, { ...pilot, ...change }).tier).toBe('free');
 });
 it('supports a negotiated large-company catalogue without bypassing signed evidence', () => {
  expect(partnershipInput.parse({ ...input, listingLimit: 500 }).listingLimit).toBe(500);
  expect(sellerPlan(null, now, { ...pilot, listingLimit: 500 })).toMatchObject({ listingLimit: 500, tier: 'partner' });
 });
 it('validates a 90-day signed pilot and 30-day promotion', () => {
  expect(partnershipInput.parse(input).commissionRate).toBe(.03);
 });
 it.each([
  { endsAt: new Date('2026-12-31') }, { endsAt: pilot.startsAt }, { promotionEndsAt: new Date('2026-11-01') },
  { signedAt: new Date('2026-10-02') }, { signaturesVerified: false }, { documentData: undefined }, { sellerSignatory: '' }, { listingLimit: 19 },
 ])('rejects invalid activation %j', change => {
  expect(partnershipInput.safeParse({ ...input, ...change }).success).toBe(false);
 });
 it('allows an unsigned draft without changing commercial rules', () => {
  expect(partnershipInput.safeParse({ ...input, status: 'draft', signedAt: null, documentData: undefined, signaturesVerified: false }).success).toBe(true);
 });
 it('accepts PDF bytes and fingerprints the signed document', () => {
  expect(parseAgreementPdf(pdf)).toMatchObject({ data: pdf, hash: expect.stringMatching(/^[a-f0-9]{64}$/) });
 });
 it.each(['data:application/pdf;base64,' + Buffer.from('not a PDF document at all').toString('base64'), 'data:text/html;base64,AAAA', 'data:application/pdf;base64,AAAA'])('rejects invalid document bytes %s', data => {
  expect(() => parseAgreementPdf(data)).toThrow();
 });
});
