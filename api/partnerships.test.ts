import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TRPCError } from '@trpc/server';
import { partnershipRouter } from './partnerships';
import { getDb } from './queries/connection';
import { adminAuditLogs, sellers, sellerPartnerships } from '../db/schema';
import { decryptIdentity } from './identity';

vi.mock('./queries/connection', () => ({ getDb: vi.fn() }));
const context = { req: new Request('https://example.com'), resHeaders: new Headers() };
const caller = partnershipRouter(key => { if (key !== 'test-admin') throw new TRPCError({ code: 'UNAUTHORIZED' }); }).createCaller(context);
const pdf = 'data:application/pdf;base64,' + Buffer.from('%PDF-1.7\nSigned test fixture\n%%EOF').toString('base64');
const active = { key: 'test-admin', sellerId: 1, reference: 'PILOT-001', version: '1.0', status: 'active' as const, commissionRate: .03, listingLimit: 30, startsAt: new Date('2090-01-01'), endsAt: new Date('2090-04-01'), promotionEndsAt: null, signedAt: new Date('2020-01-01'), sellerSignatory: 'Seller representative', platformSignatory: 'Platform representative', termsText: 'Both parties agree to the recorded commission, fulfilment, settlement and termination terms.', documentData: pdf, documentName: 'signed.pdf', signaturesVerified: true };

beforeEach(() => { vi.clearAllMocks(); vi.stubEnv('SELLER_DOCUMENT_ENCRYPTION_KEY', Buffer.alloc(32, 7).toString('base64')); });

function database(sellerStatus = 'approved', agreements: any[] = []) {
 const inserts: Array<{ table: unknown; values: any }> = [];
 const db: any = {
  select: () => ({ from: (table: unknown) => {
   const rows = table === sellers ? [{ id: 1, status: sellerStatus }] : agreements;
   const query: any = { where: () => query, for: async () => rows, orderBy: async () => rows, then: (resolve: any, reject: any) => Promise.resolve(rows).then(resolve, reject) };
   return query;
  } }),
  insert: (table: unknown) => ({ values: (values: unknown) => { inserts.push({ table, values }); return { $returningId: async () => [{ id: 5 }] }; } }),
  transaction: async (run: (tx: any) => unknown) => run(db),
 };
 vi.mocked(getDb).mockReturnValue(db);
 return { inserts };
}

describe('administrator partnership endpoints', () => {
 it('rejects unauthorised access before reading agreements', async () => {
  await expect(caller.list({ key: 'bad', sellerId: 1 })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  expect(getDb).not.toHaveBeenCalled();
 });
 it('requires signed evidence before activation and makes no database write', async () => {
  await expect(caller.create({ ...active, documentData: undefined })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  expect(getDb).not.toHaveBeenCalled();
 });
 it('blocks pilot activation for an unapproved shop', async () => {
  const { inserts } = database('pending');
  await expect(caller.create(active)).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  expect(inserts).toHaveLength(0);
 });
 it('prevents overlapping active agreements', async () => {
  const { inserts } = database('approved', [{ startsAt: active.startsAt, endsAt: active.endsAt }]);
  await expect(caller.create(active)).rejects.toMatchObject({ code: 'CONFLICT' });
  expect(inserts).toHaveLength(0);
 });
 it('stores an encrypted PDF and commercial metadata with a transaction audit record', async () => {
  const { inserts } = database();
  await expect(caller.create(active)).resolves.toEqual({ id: 5 });
  const stored = inserts.find(item => item.table === sellerPartnerships)!.values;
  expect(stored.commissionRate).toBe('0.0300');
  expect(stored.documentCiphertext).not.toContain('PDF');
  expect(decryptIdentity({ ciphertext: stored.documentCiphertext, iv: stored.documentIv, tag: stored.documentTag })).toBe(pdf);
  const audit = inserts.find(item => item.table === adminAuditLogs)!.values;
  expect(audit.action).toBe('seller.partnership.activated');
  expect(audit.meta).not.toContain(pdf);
 });
 it('returns document metadata without ciphertext or decrypted content in general lists', async () => {
  database('approved', [{ id: 5, reference: 'PILOT-001', documentCiphertext: 'private', documentIv: 'private', documentTag: 'private' }]);
  const records = await caller.list({ key: 'test-admin', sellerId: 1 });
  expect(records[0]).toMatchObject({ hasDocument: true, reference: 'PILOT-001' });
  expect(JSON.stringify(records)).not.toContain('private');
 });
});
