import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MySqlDialect } from 'drizzle-orm/mysql-core'
import type { SQL } from 'drizzle-orm'
const db = vi.hoisted(() => ({ rows: [] as unknown[][], conditions: [] as unknown[], select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(), transaction: vi.fn(), values: [] as Record<string, unknown>[] }))
vi.mock('./queries/connection', () => ({ getDb: () => db }))
vi.mock('./serviceNotifications', () => ({ kickServiceNotifications: vi.fn() }))
import { servicesRouter, serviceAdminRouter } from './services'
import { accountDeletionTokenHash } from './accountDeletion'
import { deleteCustomerServiceData } from './servicePrivacy'
import { SERVICE_PROPOSAL_VERSION } from '../src/lib/servicePolicy'
import { TRPCError } from '@trpc/server'
const token = 'a'.repeat(43)
const customer = { id: 1, phone: '0700000001', deletionTokenHash: accountDeletionTokenHash(token) }
const form = { phone: customer.phone, businessName: 'Synthetic cleaner', category: 'Cleaning' as const, district: 'Wakiso', description: 'Synthetic cleaning service description for isolated tests.', experience: 'Synthetic experience statement', priceUnit: 'quote' as const, publicProfileConsent: true as const, proposalAcknowledged: true as const, proposalVersion: SERVICE_PROPOSAL_VERSION as typeof SERVICE_PROPOSAL_VERSION }
const context = (credential?: string) => ({ req: new Request('https://example.test/api/trpc', { headers: credential ? { 'x-ugsouq-customer-credential': credential } : {} }), resHeaders: new Headers() })
const admin = serviceAdminRouter(key => { if (key !== 'test-key') throw new TRPCError({ code: 'UNAUTHORIZED' }) })
beforeEach(() => {
  vi.clearAllMocks(); db.rows = []; db.values = []; db.conditions = []
  db.select.mockImplementation(() => {
    const rows = db.rows.shift() ?? []
    const chain: Record<string, unknown> = {}
    for (const name of ['from','where','innerJoin','for','limit','orderBy']) chain[name] = () => chain
    chain.where = (condition: unknown) => { db.conditions.push(condition); return chain }
    chain.then = (resolve: (v: unknown) => void) => Promise.resolve(rows).then(resolve)
    return chain
  })
  db.insert.mockImplementation(() => ({ values: (value: Record<string, unknown>) => { db.values.push(value); return { $returningId: async () => [{ id: 5 }] } } }))
  db.update.mockImplementation(() => ({ set: () => ({ where: async () => undefined }) }))
  db.delete.mockImplementation(() => ({ where: async () => undefined }))
  db.transaction.mockImplementation(async action => action(db))
})
describe('service applications and enquiries', () => {
  it('blocks phone-only registration before database access', async () => {
    await expect(servicesRouter.createCaller(context()).registerProvider(form)).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    expect(db.select).not.toHaveBeenCalled(); expect(db.insert).not.toHaveBeenCalled()
  })
  it('rejects a credential belonging to another customer', async () => {
    db.rows = [[{ ...customer, deletionTokenHash: accountDeletionTokenHash('b'.repeat(43)) }]]
    await expect(servicesRouter.createCaller(context(token)).registerProvider(form)).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    expect(db.insert).not.toHaveBeenCalled()
  })
  it('stores an owned provider application pending review with consent version', async () => {
    db.rows = [[customer], []]
    await servicesRouter.createCaller(context(token)).registerProvider(form)
    expect(db.values[0]).toMatchObject({ customerId: 1, status: 'pending', proposalVersion: SERVICE_PROPOSAL_VERSION, startingPrice: null })
    expect(db.values[0]).not.toHaveProperty('phone'); expect(db.values[0]).not.toHaveProperty('deletionTokenHash')
  })
  it('rejects a duplicate application', async () => {
    db.rows = [[customer], [{ id: 5 }]]
    await expect(servicesRouter.createCaller(context(token)).registerProvider(form)).rejects.toMatchObject({ code: 'CONFLICT' })
    expect(db.insert).not.toHaveBeenCalled()
  })
  it('rejects unpublished consent and missing priced-service amounts', async () => {
    await expect(servicesRouter.createCaller(context(token)).registerProvider({ ...form, publicProfileConsent: false as unknown as true })).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    await expect(servicesRouter.createCaller(context(token)).registerProvider({ ...form, priceUnit: 'hour' })).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    expect(db.insert).not.toHaveBeenCalled()
  })
  it('does not disclose private provider review or account fields in catalogue output', async () => {
    db.rows = [[{ service_providers: { id: 5, businessName: 'Test', category: 'Cleaning', district: 'Wakiso', description: 'Public description', startingPrice: null, priceUnit: 'quote', customerId: 1, reviewNotes: 'PRIVATE', experience: 'PRIVATE' }, customers: customer }]]
    const [result] = await servicesRouter.createCaller(context()).browse({})
    expect(result).not.toHaveProperty('customerId'); expect(result).not.toHaveProperty('reviewNotes'); expect(result).not.toHaveProperty('experience'); expect(result).not.toHaveProperty('phone')
  })
  it('blocks a quote request to an unavailable provider before writing', async () => {
    db.rows = [[customer], []]
    await expect(servicesRouter.createCaller(context(token)).requestQuote({ phone: customer.phone, providerId: 5, district: 'Wakiso', brief: 'Synthetic request for cleaning work', contactConsent: true })).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(db.insert).not.toHaveBeenCalled()
  })
  it('records an enquiry without creating a booking, payment or commission', async () => {
    db.rows = [[customer], [{ provider: { id: 5, customerId: 2 } }], [], [{ id: 5, customerId: 2, status: 'approved' }], []]
    const result = await servicesRouter.createCaller(context(token)).requestQuote({ phone: customer.phone, providerId: 5, district: 'Wakiso', brief: 'Synthetic request for cleaning work', contactConsent: true })
    expect(result).toEqual({ reference: 'SR-5', status: 'requested' }); expect(db.values).toHaveLength(2); expect(db.values[1]).toMatchObject({ eventKey: 'enquiry-5', customerId: 2, kind: 'enquiry', requestId: 5 }); expect(db.values[0]).not.toHaveProperty('amount')
  })
  it('blocks administrator queries without a valid key', async () => {
    await expect(admin.createCaller(context()).providers({ key: 'wrong' })).rejects.toMatchObject({ code: 'UNAUTHORIZED' }); expect(db.select).not.toHaveBeenCalled()
  })
  it('blocks approval without completed review checks', async () => {
    await expect(admin.createCaller(context()).review({ key: 'test-key', id: 5, status: 'approved', notes: 'Synthetic review note', checksCompleted: false })).rejects.toMatchObject({ code: 'BAD_REQUEST' }); expect(db.transaction).not.toHaveBeenCalled()
  })
  it('records the approval and a minimal decision audit', async () => {
    db.rows = [[{ id: 5, customerId: 2, status: 'pending' }]]
    await admin.createCaller(context()).review({ key: 'test-key', id: 5, status: 'approved', notes: 'Synthetic review note', checksCompleted: true })
    expect(db.update).toHaveBeenCalledOnce(); expect(db.values[0]).toMatchObject({ action: 'service_provider_review' }); expect(String(db.values[0].afterState)).not.toContain('Synthetic review note')
    expect(db.values[1]).toMatchObject({ customerId: 2, providerId: 5, kind: 'review', decision: 'approved' })
    expect(db.values[1]).not.toHaveProperty('notes')
  })
  it('blocks phone-only inbox access before loading private enquiries', async () => {
    await expect(servicesRouter.createCaller(context()).inbox({ phone: customer.phone })).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    expect(db.select).not.toHaveBeenCalled()
  })
  it('hides contacts for closed enquiries and never returns review notes or account credentials', async () => {
    const provider = { id: 5, customerId: 1, status: 'approved', businessName: 'Test', reviewNotes: 'PRIVATE' }
    db.rows = [[customer], [provider], [], [{ request: { id: 7, status: 'closed', brief: 'Test', district: 'Wakiso' }, customer: { name: 'Customer', phone: '0700000002' } }]]
    const result = await servicesRouter.createCaller(context(token)).inbox({ phone: customer.phone })
    expect(result?.requests[0].contact).toBeNull(); expect(result?.provider).not.toHaveProperty('reviewNotes')
    expect(JSON.stringify(result)).not.toContain('deletionTokenHash')
  })
  it('only shows customer contacts to the selected approved provider', async () => {
    db.rows = [[customer], [{ id: 5, customerId: 1, status: 'approved' }], [], [{ request: { id: 7, status: 'requested' }, customer: { name: 'Selected customer', phone: '0700000002' } }]]
    const result = await servicesRouter.createCaller(context(token)).inbox({ phone: customer.phone })
    expect(result?.requests[0].contact).toEqual({ name: 'Selected customer', phone: '0700000002' })
    expect(new MySqlDialect().sqlToQuery(db.conditions.at(-1) as SQL).params).toEqual([5])
  })
  it('does not query customer enquiries for a suspended profile', async () => {
    db.rows = [[customer], [{ id: 5, customerId: 1, status: 'suspended' }], []]
    const result = await servicesRouter.createCaller(context(token)).inbox({ phone: customer.phone })
    expect(result?.requests).toEqual([]); expect(db.select).toHaveBeenCalledTimes(3)
  })
  it('rejects updates to another provider’s enquiry', async () => {
    db.rows = [[customer], [{ id: 5, customerId: 1, status: 'approved' }], []]
    await expect(servicesRouter.createCaller(context(token)).respond({ phone: customer.phone, id: 999, status: 'contacted' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(db.update).not.toHaveBeenCalled()
    expect(new MySqlDialect().sqlToQuery(db.conditions.at(-1) as SQL).params).toEqual([999, 5])
  })
  it('rejects a provider response when its profile is not approved', async () => {
    db.rows = [[customer], []]
    await expect(servicesRouter.createCaller(context(token)).respond({ phone: customer.phone, id: 7, status: 'contacted' })).rejects.toMatchObject({ code: 'FORBIDDEN' })
    expect(db.update).not.toHaveBeenCalled()
  })
  it('records a provider response without setting payment or completion', async () => {
    db.rows = [[customer], [{ id: 5, customerId: 1, status: 'approved' }], [{ id: 7, status: 'requested' }]]
    await servicesRouter.createCaller(context(token)).respond({ phone: customer.phone, id: 7, status: 'contacted' })
    expect(db.values[0]).toMatchObject({ actorTag: 'authenticated_service_provider', action: 'service_provider_response' })
    expect(db.values[0]).not.toHaveProperty('amount')
  })
  it('avoids sending a duplicate legacy enquiry notification', async () => {
    db.rows = [[{ id: 5, customerId: 2, status: 'approved' }], [{ id: 7, status: 'requested' }], [{ id: 11, emailState: 'accepted' }]]
    const result = await admin.createCaller(context()).notifyProvider({ key: 'test-key', providerId: 5, requestId: 7 })
    expect(result).toEqual({ queued: false, notificationId: 11, emailState: 'accepted' }); expect(db.insert).not.toHaveBeenCalled()
  })
  it('queues a legacy review without changing the approval itself', async () => {
    db.rows = [[{ id: 5, customerId: 2, status: 'approved', reviewedAt: new Date('2026-10-13T10:00:00Z') }], []]
    const result = await admin.createCaller(context()).notifyProvider({ key: 'test-key', providerId: 5 })
    expect(result).toMatchObject({ queued: true, notificationId: 5 })
    expect(db.values[0]).toMatchObject({ eventKey: 'review-5-approved-1791885600000', kind: 'review' })
    expect(db.update).not.toHaveBeenCalled()
  })
  it('rejects unauthorised notification-status inspection', async () => {
    await expect(admin.createCaller(context()).notificationStatus({ key: 'wrong', id: 11 })).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    expect(db.select).not.toHaveBeenCalled()
  })
  it('returns status for the requested notification without email payload fields', async () => {
    db.rows = [[{ id: 11, emailState: 'failed', attempts: 1, failureCode: 'email_not_confirmed' }]]
    const result = await admin.createCaller(context()).notificationStatus({ key: 'test-key', id: 11 })
    expect(result).toMatchObject({ id: 11, emailState: 'failed', attempts: 1 })
    expect(new MySqlDialect().sqlToQuery(db.conditions.at(-1) as SQL).params).toEqual([11])
    expect(result).not.toHaveProperty('recipientEmail'); expect(result).not.toHaveProperty('emailHtml')
  })
  it('deletes owned provider and related enquiries on customer deletion', async () => {
    db.rows = [[{ id: 5 }]]
    await deleteCustomerServiceData(db as unknown as Parameters<typeof deleteCustomerServiceData>[0], 1)
    expect(db.delete).toHaveBeenCalledTimes(4)
  })
})
