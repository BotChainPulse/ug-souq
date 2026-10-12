import { z } from 'zod'
import { and, eq, desc, gt } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { createRouter, publicQuery } from './middleware'
import { getDb } from './queries/connection'
import { requireCustomerOwnership } from './customerOwnership'
import { customers, adminAuditLogs } from '../db/schema'
import { healthcareProfessionals as professionals, prescriptionPhotos as photos } from '../db/healthcareSchema'
import { currentProfessional, validLicenceDate, HEALTHCARE_CONSENT_VERSION, PRESCRIPTION_CONSENT_VERSION, PRESCRIPTION_RETENTION_DAYS } from '../src/lib/healthcarePolicy'
import { prescriptionStorageReady, encryptPrescription, decryptPrescription } from './prescriptionStorage'
const accountInput = z.object({ phone: z.string().min(9).max(32) })
const licenceDate = z.string().refine(validLicenceDate, 'Enter a valid licence expiry date.')
function publicProfile(p: typeof professionals.$inferSelect) {
  return { id: p.id, name: p.name, profession: p.profession, district: p.district, facility: p.facility, specialty: p.specialty, businessPhone: p.businessPhone, verifiedAt: p.verifiedAt }
}
async function available(id: number) {
  const [row] = await getDb().select({ professional: professionals }).from(professionals).innerJoin(customers, eq(professionals.customerId, customers.id)).where(eq(professionals.id, id)).limit(1)
  if (!row || !currentProfessional(row.professional)) throw new TRPCError({ code: 'NOT_FOUND', message: 'This professional is not currently available with a current licence review.' })
  return row.professional
}
function uploadReady() {
  if (!prescriptionStorageReady()) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Prescription sharing is not active yet. Contact a licensed pharmacist directly. No photo has been uploaded.' })
}
export const healthcareRouter = createRouter({
  browse: publicQuery.query(async () => {
    const rows = await getDb().select({ professional: professionals }).from(professionals).innerJoin(customers, eq(professionals.customerId, customers.id)).where(eq(professionals.status, 'approved'))
    return { professionals: rows.filter(r => currentProfessional(r.professional)).map(r => publicProfile(r.professional)), prescriptionSharingAvailable: prescriptionStorageReady() }
  }),
  mine: publicQuery.input(accountInput).query(async ({ input, ctx }) => {
    const owner = await requireCustomerOwnership(ctx.req, input.phone)
    const [p] = await getDb().select().from(professionals).where(eq(professionals.customerId, owner.id)).limit(1)
    return p ? { ...publicProfile(p), status: p.status } : null
  }),
  registerProfessional: publicQuery.input(accountInput.extend({
    name: z.string().trim().min(3).max(128), profession: z.enum(['doctor','pharmacist']), district: z.string().trim().min(2).max(64), facility: z.string().trim().min(3).max(128), specialty: z.string().trim().min(3).max(128), businessPhone: z.string().trim().regex(/^\+?[0-9 ()-]{9,32}$/), registrationNumber: z.string().trim().min(3).max(64), licenceExpiresOn: licenceDate,
    facilityLicenceReference: z.string().trim().min(3).max(128), facilityLicenceExpiresOn: licenceDate,
    publicProfileConsent: z.literal(true), restrictionsAcknowledged: z.literal(true), consentVersion: z.literal(HEALTHCARE_CONSENT_VERSION),
  })).mutation(async ({ input, ctx }) => {
    const owner = await requireCustomerOwnership(ctx.req, input.phone); const db = getDb()
    const [existing] = await db.select().from(professionals).where(eq(professionals.customerId, owner.id)).limit(1)
    if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'Your professional application already exists. Contact support to update it and repeat the licence review.' })
    const fields = { name: input.name, profession: input.profession, district: input.district, facility: input.facility, specialty: input.specialty, businessPhone: input.businessPhone, registrationNumber: input.registrationNumber, licenceExpiresOn: input.licenceExpiresOn, facilityLicenceReference: input.facilityLicenceReference, facilityLicenceExpiresOn: input.facilityLicenceExpiresOn, consentVersion: input.consentVersion }
    const [created] = await db.insert(professionals).values({ ...fields, customerId: owner.id, status: 'pending', consentedAt: new Date() }).$returningId()
    return { id: created.id, status: 'pending' as const }
  }),
  submitPrescription: publicQuery.input(accountInput.extend({ professionalId: z.number().int().positive(), image: z.string().max(810_000), shareConsent: z.literal(true), consentVersion: z.literal(PRESCRIPTION_CONSENT_VERSION) })).mutation(async ({ input, ctx }) => {
    const patient = await requireCustomerOwnership(ctx.req, input.phone); uploadReady()
    const p = await available(input.professionalId)
    if (p.profession !== 'pharmacist' || p.customerId === patient.id) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Select a different, currently verified pharmacist.' })
    let encrypted: ReturnType<typeof encryptPrescription>
    try { encrypted = encryptPrescription(input.image) } catch { throw new TRPCError({ code: 'BAD_REQUEST', message: 'The image could not be safely stored. Choose a clear JPG or PNG photograph.' }) }
    const db = getDb()
    // Limit retained images per patient and protect concurrent submissions with the customer row lock.
    return db.transaction(async tx => {
      const [recipient] = await tx.select().from(professionals).where(eq(professionals.id, p.id)).for('update')
      if (!recipient || recipient.profession !== 'pharmacist' || !currentProfessional(recipient)) throw new TRPCError({ code: 'NOT_FOUND', message: 'The pharmacist is no longer available.' })
      await tx.select({ id: customers.id }).from(customers).where(eq(customers.id, patient.id)).for('update')
      const active = await tx.select({ id: photos.id }).from(photos).where(and(eq(photos.customerId, patient.id), gt(photos.expiresAt, new Date())))
      if (active.length >= 3) throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'You already have three active prescription photos. Withdraw an existing photo before sharing another.' })
      const expiresAt = new Date(Date.now() + PRESCRIPTION_RETENTION_DAYS * 86400_000)
      const [created] = await tx.insert(photos).values({ ...encrypted, customerId: patient.id, professionalId: p.id, consentVersion: input.consentVersion, expiresAt }).$returningId()
      return { id: created.id, expiresAt, status: 'received' as const }
    })
  }),
  myPrescriptions: publicQuery.input(accountInput).query(async ({ input, ctx }) => {
    const patient = await requireCustomerOwnership(ctx.req, input.phone)
    return getDb().select({ id: photos.id, professionalId: photos.professionalId, status: photos.status, createdAt: photos.createdAt, expiresAt: photos.expiresAt }).from(photos).where(and(eq(photos.customerId, patient.id), gt(photos.expiresAt, new Date()))).orderBy(desc(photos.createdAt))
  }),
  withdrawPrescription: publicQuery.input(accountInput.extend({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
    const patient = await requireCustomerOwnership(ctx.req, input.phone)
    await getDb().delete(photos).where(and(eq(photos.id, input.id), eq(photos.customerId, patient.id)))
    return { ok: true }
  }),
  pharmacistInbox: publicQuery.input(accountInput).query(async ({ input, ctx }) => {
    const owner = await requireCustomerOwnership(ctx.req, input.phone)
    const [p] = await getDb().select().from(professionals).where(eq(professionals.customerId, owner.id)).limit(1)
    if (!p || p.profession !== 'pharmacist' || !currentProfessional(p)) throw new TRPCError({ code: 'FORBIDDEN', message: 'Only a currently reviewed pharmacist can access the prescription inbox.' })
    return getDb().select({ id: photos.id, status: photos.status, createdAt: photos.createdAt, expiresAt: photos.expiresAt }).from(photos).where(and(eq(photos.professionalId, p.id), gt(photos.expiresAt, new Date()))).orderBy(desc(photos.createdAt)).limit(100)
  }),
  viewPrescription: publicQuery.input(accountInput.extend({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
    const owner = await requireCustomerOwnership(ctx.req, input.phone)
    const [photo] = await getDb().select().from(photos).where(and(eq(photos.id, input.id), gt(photos.expiresAt, new Date()))).limit(1)
    if (!photo) throw new TRPCError({ code: 'NOT_FOUND' })
    // Even a previous recipient loses access after suspension, expiry or withdrawal.
    if (photo.customerId !== owner.id) {
      const p = await available(photo.professionalId)
      if (p.profession !== 'pharmacist' || p.customerId !== owner.id) throw new TRPCError({ code: 'FORBIDDEN' })
    }
    let image: string
    try { image = decryptPrescription(photo) } catch { throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Private photo access is temporarily unavailable.' }) }
    await getDb().insert(adminAuditLogs).values({ actorTag: `account:${owner.id}`, action: 'prescription_photo_viewed', entityType: 'prescription_photo', entityId: String(photo.id) })
    return { image, expiresAt: photo.expiresAt }
  }),
  markReviewed: publicQuery.input(accountInput.extend({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
    const owner = await requireCustomerOwnership(ctx.req, input.phone)
    const [p] = await getDb().select().from(professionals).where(eq(professionals.customerId, owner.id)).limit(1)
    if (!p || p.profession !== 'pharmacist' || !currentProfessional(p)) throw new TRPCError({ code: 'FORBIDDEN' })
    await getDb().update(photos).set({ status: 'reviewed' }).where(and(eq(photos.id, input.id), eq(photos.professionalId, p.id), gt(photos.expiresAt, new Date())))
    return { ok: true }
  }),
})
export function healthcareAdminRouter(requireAdmin: (key: string) => void) {
  return createRouter({
    applications: publicQuery.input(z.object({ key: z.string() })).query(async ({ input }) => {
      requireAdmin(input.key)
      return getDb().select({ professional: professionals, owner: { name: customers.name, phone: customers.phone } }).from(professionals).innerJoin(customers, eq(professionals.customerId, customers.id)).orderBy(desc(professionals.createdAt))
    }),
    review: publicQuery.input(z.object({ key: z.string(), id: z.number().int().positive(), status: z.enum(['approved','rejected','suspended']), notes: z.string().trim().min(20).max(1000), identityChecked: z.boolean(), registryChecked: z.boolean(), facilityChecked: z.boolean() })).mutation(async ({ input }) => {
      requireAdmin(input.key)
      if (input.status === 'approved' && !(input.identityChecked && input.registryChecked && input.facilityChecked)) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Verify identity, current professional practising licence and facility licence before approval.' })
      return getDb().transaction(async tx => {
        const [p] = await tx.select().from(professionals).where(eq(professionals.id, input.id)).for('update')
        if (!p) throw new TRPCError({ code: 'NOT_FOUND' })
        const now = new Date()
        if (input.status === 'approved' && !currentProfessional({ ...p, status: 'approved', verifiedAt: now }, now)) throw new TRPCError({ code: 'BAD_REQUEST', message: 'The professional or facility licence has expired or has an invalid date. Ask for an updated application.' })
        await tx.update(professionals).set({ status: input.status, reviewNotes: input.notes, verifiedAt: input.status === 'approved' ? now : null }).where(eq(professionals.id, input.id))
        if (input.status !== 'approved') await tx.delete(photos).where(eq(photos.professionalId, input.id))
        await tx.insert(adminAuditLogs).values({ actorTag: 'authenticated_admin', action: 'healthcare_professional_review', entityType: 'healthcare_professional', entityId: String(p.id), beforeState: JSON.stringify({ status: p.status }), afterState: JSON.stringify({ status: input.status, identityChecked: input.identityChecked, registryChecked: input.registryChecked, facilityChecked: input.facilityChecked }) })
        return { ok: true }
      })
    }),
  })
}
