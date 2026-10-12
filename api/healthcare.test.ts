import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { TRPCError } from '@trpc/server'
const db = vi.hoisted(() => ({ rows: [] as unknown[][], select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(), transaction: vi.fn(), values: [] as Record<string,unknown>[] }))
vi.mock('./queries/connection', () => ({ getDb: () => db }))
import { healthcareRouter, healthcareAdminRouter } from './healthcare'
import { accountDeletionTokenHash } from './accountDeletion'
import { deleteCustomerHealthcareData, HEALTHCARE_RETENTION_SQL } from './healthcarePrivacy'
import { HEALTHCARE_CONSENT_VERSION, PRESCRIPTION_CONSENT_VERSION } from '../src/lib/healthcarePolicy'
import { encryptPrescription } from './prescriptionStorage'
const token = 'a'.repeat(43)
const patient = { id: 1, phone: '0700000001', deletionTokenHash: accountDeletionTokenHash(token) }
const professional = { id: 5, customerId: 2, status: 'approved', profession: 'pharmacist', verifiedAt: new Date(), licenceExpiresOn: '2099-12-31', facilityLicenceExpiresOn: '2099-12-31' }
const context = (credential?: string) => ({ req: new Request('https://example.test/api/trpc', { headers: credential ? { 'x-ugsouq-customer-credential': credential } : {} }), resHeaders: new Headers() })
const form = { phone: patient.phone, name: 'Synthetic Test Professional', profession: 'pharmacist' as const, district: 'Wakiso', facility: 'Synthetic facility', specialty: 'Pharmacy', businessPhone: '0700000002', registrationNumber: 'TEST-ONLY', licenceExpiresOn: '2099-12-31', facilityLicenceReference: 'TEST-ONLY-FACILITY', facilityLicenceExpiresOn: '2099-12-31', publicProfileConsent: true as const, restrictionsAcknowledged: true as const, consentVersion: HEALTHCARE_CONSENT_VERSION as typeof HEALTHCARE_CONSENT_VERSION }
const image = 'data:image/jpeg;base64,' + Buffer.concat([Buffer.from([255,216,255]), Buffer.alloc(1200,42), Buffer.from([255,217])]).toString('base64')
const upload = { phone: patient.phone, professionalId: 5, image, shareConsent: true as const, consentVersion: PRESCRIPTION_CONSENT_VERSION as typeof PRESCRIPTION_CONSENT_VERSION }
const admin = healthcareAdminRouter(key => { if (key !== 'test-key') throw new TRPCError({ code: 'UNAUTHORIZED' }) })
beforeEach(() => {
  vi.clearAllMocks(); db.rows = []; db.values = []
  db.select.mockImplementation(() => {
    const rows = db.rows.shift() ?? []; const chain: Record<string,unknown> = {}
    for (const name of ['from','where','innerJoin','for','limit','orderBy']) chain[name] = () => chain
    chain.then = (resolve: (v: unknown) => void) => Promise.resolve(rows).then(resolve)
    return chain
  })
  db.insert.mockImplementation(() => ({ values: (v: Record<string,unknown>) => { db.values.push(v); return { then: (resolve: (v: unknown) => void) => Promise.resolve(undefined).then(resolve), $returningId: async () => [{ id: 7 }] } } }))
  db.update.mockImplementation(() => ({ set: () => ({ where: async () => undefined }) }))
  db.delete.mockImplementation(() => ({ where: async () => undefined }))
  db.transaction.mockImplementation(async action => action(db))
  process.env.HEALTHCARE_DOCUMENT_ENCRYPTION_KEY = Buffer.alloc(32,7).toString('base64'); process.env.HEALTHCARE_PRESCRIPTION_ENABLED = 'true'
})
afterEach(() => { delete process.env.HEALTHCARE_DOCUMENT_ENCRYPTION_KEY; delete process.env.HEALTHCARE_PRESCRIPTION_ENABLED })
describe('private healthcare workflow', () => {
  it('does not allow phone-only applications or image access', async () => {
    const caller = healthcareRouter.createCaller(context())
    await expect(caller.registerProfessional(form)).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    await expect(caller.viewPrescription({ phone: patient.phone, id: 7 })).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    expect(db.select).not.toHaveBeenCalled()
  })
  it('rejects a credential belonging to a different account', async () => {
    db.rows = [[{ ...patient, deletionTokenHash: accountDeletionTokenHash('b'.repeat(43)) }]]
    await expect(healthcareRouter.createCaller(context(token)).submitPrescription(upload)).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    expect(db.insert).not.toHaveBeenCalled()
  })
  it('keeps professional applications pending and separate from ordinary 7% services', async () => {
    db.rows = [[patient], []]
    await healthcareRouter.createCaller(context(token)).registerProfessional(form)
    expect(db.values[0]).toMatchObject({ status: 'pending', customerId: patient.id, consentVersion: HEALTHCARE_CONSENT_VERSION })
    expect(db.values[0]).not.toHaveProperty('commission'); expect(db.values[0]).not.toHaveProperty('phone')
  })
  it('requires sharing consent and a configured activation gate', async () => {
    await expect(healthcareRouter.createCaller(context(token)).submitPrescription({ ...upload, shareConsent: false as unknown as true })).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    process.env.HEALTHCARE_PRESCRIPTION_ENABLED = 'false'; db.rows = [[patient]]
    await expect(healthcareRouter.createCaller(context(token)).submitPrescription(upload)).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' })
    expect(db.insert).not.toHaveBeenCalled()
  })
  it.each(['doctor','suspended','expired'])('refuses an ineligible recipient: %s', async mode => {
    const p = { ...professional, ...(mode === 'doctor' ? { profession: 'doctor' } : mode === 'suspended' ? { status: 'suspended' } : { licenceExpiresOn: '2020-01-01' }) }
    db.rows = [[patient], [{ professional: p }]]
    await expect(healthcareRouter.createCaller(context(token)).submitPrescription(upload)).rejects.toThrow()
    expect(db.insert).not.toHaveBeenCalled()
  })
  it('stores an encrypted photo, consent and seven-day expiry, without a payment', async () => {
    db.rows = [[patient], [{ professional }], [professional], [{ id: patient.id }], []]
    await healthcareRouter.createCaller(context(token)).submitPrescription(upload)
    expect(db.values).toHaveLength(1); expect(db.values[0]).toMatchObject({ customerId: 1, professionalId: 5, consentVersion: PRESCRIPTION_CONSENT_VERSION })
    expect(db.values[0].ciphertext).not.toBe(image); expect(db.values[0]).not.toHaveProperty('image'); expect(db.values[0]).not.toHaveProperty('amount')
    expect((db.values[0].expiresAt as Date).getTime() - Date.now()).toBeGreaterThan(6.99 * 86400_000)
  })
  it('rechecks the recipient under lock to prevent a concurrent suspension accepting a photo', async () => {
    db.rows = [[patient], [{ professional }], [{ ...professional, status: 'suspended' }]]
    await expect(healthcareRouter.createCaller(context(token)).submitPrescription(upload)).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(db.insert).not.toHaveBeenCalled()
  })
  it('caps active patient photos', async () => {
    db.rows = [[patient], [{ professional }], [professional], [{ id: 1 }], [{ id: 2 },{ id: 3 },{ id: 4 }]]
    await expect(healthcareRouter.createCaller(context(token)).submitPrescription(upload)).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' })
    expect(db.insert).not.toHaveBeenCalled()
  })
  it('denies unrelated accounts and doctors access to assigned patient images', async () => {
    const photo = { id: 7, customerId: 3, professionalId: 5, ...encryptPrescription(image) }
    db.rows = [[patient], [photo], [{ professional }]]
    await expect(healthcareRouter.createCaller(context(token)).viewPrescription({ phone: patient.phone, id: 7 })).rejects.toMatchObject({ code: 'FORBIDDEN' })
    db.rows = [[patient], [photo], [{ professional: { ...professional, customerId: 1, profession: 'doctor' } }]]
    await expect(healthcareRouter.createCaller(context(token)).viewPrescription({ phone: patient.phone, id: 7 })).rejects.toMatchObject({ code: 'FORBIDDEN' })
    expect(db.values).toHaveLength(0)
  })
  it('allows the patient to view a photo and logs no image, name or prescription text', async () => {
    db.rows = [[patient], [{ id: 7, customerId: 1, professionalId: 5, expiresAt: new Date(Date.now()+86400_000), ...encryptPrescription(image) }]]
    const result = await healthcareRouter.createCaller(context(token)).viewPrescription({ phone: patient.phone, id: 7 })
    expect(result.image).toBe(image); expect(db.values[0]).toMatchObject({ action: 'prescription_photo_viewed', entityId: '7' }); expect(JSON.stringify(db.values[0])).not.toContain(image)
  })
  it('allows only the assigned current pharmacist to open a retained photo', async () => {
    db.rows = [[{ ...patient, id: 2 }], [{ id: 7, customerId: 3, professionalId: 5, expiresAt: new Date(Date.now()+86400_000), ...encryptPrescription(image) }], [{ professional }]]
    const result = await healthcareRouter.createCaller(context(token)).viewPrescription({ phone: patient.phone, id: 7 })
    expect(result.image).toBe(image)
    db.rows = [[{ ...patient, id: 2 }], [{ id: 7, customerId: 3, professionalId: 5, ...encryptPrescription(image) }], [{ professional: { ...professional, status: 'suspended' } }]]
    await expect(healthcareRouter.createCaller(context(token)).viewPrescription({ phone: patient.phone, id: 7 })).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
  it('does not return a deleted or expired photo', async () => {
    db.rows = [[patient], []]
    await expect(healthcareRouter.createCaller(context(token)).viewPrescription({ phone: patient.phone, id: 7 })).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(db.insert).not.toHaveBeenCalled()
  })
  it('hides private licence/application fields from the public directory', async () => {
    db.rows = [[{ professional: { ...professional, name: 'Public', registrationNumber: 'PRIVATE', reviewNotes: 'PRIVATE', businessPhone: '0700000002' } }]]
    const result = await healthcareRouter.createCaller(context()).browse()
    expect(result.professionals[0]).not.toHaveProperty('registrationNumber'); expect(result.professionals[0]).not.toHaveProperty('reviewNotes'); expect(result.professionals[0]).not.toHaveProperty('customerId')
  })
  it('does not expose photos through any administrator procedure', async () => {
    expect(Object.keys(admin._def.procedures)).not.toContain('viewPrescription')
    await expect(admin.createCaller(context()).applications({ key: 'wrong' })).rejects.toMatchObject({ code: 'UNAUTHORIZED' }); expect(db.select).not.toHaveBeenCalled()
  })
  it('blocks approval without all independent checks or with an expired licence', async () => {
    const review = { key: 'test-key', id: 5, status: 'approved' as const, notes: 'Synthetic registry evidence note', identityChecked: true, registryChecked: true, facilityChecked: false }
    await expect(admin.createCaller(context()).review(review)).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    db.rows = [[{ ...professional, licenceExpiresOn: '2020-01-01' }]]
    await expect(admin.createCaller(context()).review({ ...review, facilityChecked: true })).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    expect(db.update).not.toHaveBeenCalled()
  })
  it('purges assigned photos on suspension and records the decision without patient data', async () => {
    db.rows = [[professional]]
    await admin.createCaller(context()).review({ key: 'test-key', id: 5, status: 'suspended', notes: 'Synthetic suspension reason', identityChecked: false, registryChecked: false, facilityChecked: false })
    expect(db.delete).toHaveBeenCalledOnce(); expect(db.values[0]).toMatchObject({ action: 'healthcare_professional_review' }); expect(db.values[0]).not.toHaveProperty('image')
  })
  it('deletes owned health profile and patient/recipient photos on account deletion', async () => {
    db.rows = [[{ id: 5 }]]
    await deleteCustomerHealthcareData(db as unknown as Parameters<typeof deleteCustomerHealthcareData>[0],1)
    expect(db.delete).toHaveBeenCalledTimes(3); expect(HEALTHCARE_RETENTION_SQL[0]).toContain('expires_at <= UTC_TIMESTAMP()')
  })
})
