import { z } from 'zod'
import { eq, and, desc } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { createRouter, publicQuery } from './middleware'
import { getDb } from './queries/connection'
import { requireCustomerOwnership } from './customerOwnership'
import { customers, adminAuditLogs } from '../db/schema'
import { serviceNotifications, serviceProviders, serviceRequests } from '../db/serviceSchema'
import { kickServiceNotifications } from './serviceNotifications'
import { outboundEmailConfigured } from './email'
import { SERVICE_CATEGORIES, SERVICE_PROPOSAL_VERSION } from '../src/lib/servicePolicy'
const profile = z.object({
  phone: z.string().min(9).max(32), businessName: z.string().trim().min(3).max(128),
  category: z.enum(SERVICE_CATEGORIES), district: z.string().trim().min(2).max(64),
  description: z.string().trim().min(30).max(1500), experience: z.string().trim().min(10).max(1000),
  startingPrice: z.number().int().min(1000).max(2_000_000_000).optional(), priceUnit: z.enum(['job','hour','quote']),
  publicProfileConsent: z.literal(true), proposalAcknowledged: z.literal(true), proposalVersion: z.literal(SERVICE_PROPOSAL_VERSION),
}).refine(p => p.priceUnit === 'quote' || p.startingPrice !== undefined, { message: 'Enter a starting price or choose Request a quote.' })
function publicProfile(p: typeof serviceProviders.$inferSelect) {
  return { id: p.id, businessName: p.businessName, category: p.category, district: p.district, description: p.description, startingPrice: p.startingPrice, priceUnit: p.priceUnit }
}
export const servicesRouter = createRouter({
  browse: publicQuery.input(z.object({ category: z.enum(SERVICE_CATEGORIES).optional(), district: z.string().max(64).optional(), q: z.string().max(100).optional() })).query(async ({ input }) => {
    const rows = await getDb().select().from(serviceProviders).innerJoin(customers, eq(serviceProviders.customerId, customers.id)).where(eq(serviceProviders.status, 'approved'))
    return rows.map(r => publicProfile(r.service_providers)).filter(p => (!input.category || p.category === input.category) && (!input.district || p.district.toLowerCase().includes(input.district.toLowerCase())) && (!input.q || `${p.businessName} ${p.description}`.toLowerCase().includes(input.q.toLowerCase())))
  }),
  mine: publicQuery.input(z.object({ phone: z.string().min(9) })).query(async ({ input, ctx }) => {
    const customer = await requireCustomerOwnership(ctx.req, input.phone)
    const [provider] = await getDb().select().from(serviceProviders).where(eq(serviceProviders.customerId, customer.id)).limit(1)
    return provider ? { ...publicProfile(provider), status: provider.status, createdAt: provider.createdAt } : null
  }),
  inbox: publicQuery.input(z.object({ phone: z.string().min(9).max(32) })).query(async ({ input, ctx }) => {
    const customer = await requireCustomerOwnership(ctx.req, input.phone)
    const db = getDb()
    const [provider] = await db.select().from(serviceProviders).where(eq(serviceProviders.customerId, customer.id)).limit(1)
    if (!provider) return null
    const notifications = await db.select({ id: serviceNotifications.id, kind: serviceNotifications.kind, decision: serviceNotifications.decision, requestId: serviceNotifications.requestId, emailState: serviceNotifications.emailState, failureCode: serviceNotifications.failureCode, createdAt: serviceNotifications.createdAt }).from(serviceNotifications).where(eq(serviceNotifications.customerId, customer.id)).orderBy(desc(serviceNotifications.createdAt)).limit(30)
    const rows = provider.status === 'approved' ? await db.select({ request: serviceRequests, customer: { name: customers.name, phone: customers.phone } }).from(serviceRequests).innerJoin(customers, eq(serviceRequests.customerId, customers.id)).where(eq(serviceRequests.providerId, provider.id)).orderBy(desc(serviceRequests.createdAt)).limit(100) : []
    return { provider: { ...publicProfile(provider), status: provider.status }, emailConfigured: outboundEmailConfigured(), notifications,
      requests: rows.map(({ request, customer: requester }) => ({ id: request.id, reference: `SR-${request.id}`, brief: request.brief, district: request.district, preferredDate: request.preferredDate, status: request.status, createdAt: request.createdAt, contact: ['requested','contacted'].includes(request.status) ? requester : null })) }
  }),
  respond: publicQuery.input(z.object({ phone: z.string().min(9).max(32), id: z.number().int().positive(), status: z.enum(['contacted','closed','cancelled']) })).mutation(async ({ input, ctx }) => {
    const customer = await requireCustomerOwnership(ctx.req, input.phone)
    const db = getDb()
    return db.transaction(async tx => {
      const [provider] = await tx.select().from(serviceProviders).where(and(eq(serviceProviders.customerId, customer.id), eq(serviceProviders.status, 'approved'))).for('update')
      if (!provider) throw new TRPCError({ code: 'FORBIDDEN', message: 'An approved provider profile is required.' })
      const [request] = await tx.select().from(serviceRequests).where(and(eq(serviceRequests.id, input.id), eq(serviceRequests.providerId, provider.id))).for('update')
      if (!request) throw new TRPCError({ code: 'NOT_FOUND', message: 'Enquiry not found in your inbox.' })
      if (['closed','cancelled'].includes(request.status)) throw new TRPCError({ code: 'CONFLICT', message: 'This enquiry is already closed.' })
      await tx.update(serviceRequests).set({ status: input.status }).where(eq(serviceRequests.id, request.id))
      await tx.insert(adminAuditLogs).values({ actorTag: 'authenticated_service_provider', action: 'service_provider_response', entityType: 'service_request', entityId: String(request.id), beforeState: JSON.stringify({ status: request.status }), afterState: JSON.stringify({ status: input.status }) })
      return { ok: true }
    })
  }),
  registerProvider: publicQuery.input(profile).mutation(async ({ input, ctx }) => {
    const customer = await requireCustomerOwnership(ctx.req, input.phone)
    const db = getDb()
    const [existing] = await db.select().from(serviceProviders).where(eq(serviceProviders.customerId, customer.id)).limit(1)
    if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'Your provider application already exists. Contact support to update it; changes require review.' })
    const [created] = await db.insert(serviceProviders).values({ customerId: customer.id, businessName: input.businessName, category: input.category, district: input.district, description: input.description, experience: input.experience, startingPrice: input.priceUnit === 'quote' ? null : input.startingPrice, priceUnit: input.priceUnit, status: 'pending', proposalVersion: input.proposalVersion, consentedAt: new Date() }).$returningId()
    return { id: created.id, status: 'pending' as const }
  }),
  requestQuote: publicQuery.input(z.object({ phone: z.string().min(9).max(32), providerId: z.number().int().positive(), brief: z.string().trim().min(20).max(1000), district: z.string().trim().min(2).max(64), preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), contactConsent: z.literal(true) })).mutation(async ({ input, ctx }) => {
    const customer = await requireCustomerOwnership(ctx.req, input.phone)
    const db = getDb()
    const [provider] = await db.select({ provider: serviceProviders }).from(serviceProviders).innerJoin(customers, eq(serviceProviders.customerId, customers.id)).where(and(eq(serviceProviders.id, input.providerId), eq(serviceProviders.status, 'approved'))).limit(1)
    if (!provider) throw new TRPCError({ code: 'NOT_FOUND', message: 'This service provider is unavailable.' })
    if (provider.provider.customerId === customer.id) throw new TRPCError({ code: 'BAD_REQUEST', message: 'You cannot request your own service.' })
    const [recent] = await db.select().from(serviceRequests).where(and(eq(serviceRequests.customerId, customer.id), eq(serviceRequests.providerId, input.providerId), eq(serviceRequests.status, 'requested'))).limit(1)
    if (recent) throw new TRPCError({ code: 'CONFLICT', message: 'You already have an open request for this provider. Contact support with your request reference.' })
    const created = await db.transaction(async tx => {
      const [current] = await tx.select().from(serviceProviders).where(and(eq(serviceProviders.id, input.providerId), eq(serviceProviders.status, 'approved'))).for('update')
      if (!current) throw new TRPCError({ code: 'NOT_FOUND', message: 'This service provider is unavailable.' })
      // Lock the provider so concurrent duplicate requests cannot race this check.
      const [open] = await tx.select({ id: serviceRequests.id }).from(serviceRequests).where(and(eq(serviceRequests.customerId, customer.id), eq(serviceRequests.providerId, input.providerId), eq(serviceRequests.status, 'requested'))).limit(1)
      if (open) throw new TRPCError({ code: 'CONFLICT', message: 'You already have an open request for this provider.' })
      const [saved] = await tx.insert(serviceRequests).values({ customerId: customer.id, providerId: input.providerId, brief: input.brief, district: input.district, preferredDate: input.preferredDate ?? null }).$returningId()
      await tx.insert(serviceNotifications).values({ eventKey: `enquiry-${saved.id}`, customerId: current.customerId, providerId: current.id, requestId: saved.id, kind: 'enquiry' })
      return saved
    })
    kickServiceNotifications()
    return { reference: `SR-${created.id}`, status: 'requested' as const }
  }),
})
export function serviceAdminRouter(requireAdmin: (key: string) => void) {
  return createRouter({
    providers: publicQuery.input(z.object({ key: z.string() })).query(async ({ input }) => {
      requireAdmin(input.key)
      const rows = await getDb().select({ provider: serviceProviders, owner: { name: customers.name, phone: customers.phone, email: customers.email } }).from(serviceProviders).innerJoin(customers, eq(serviceProviders.customerId, customers.id)).orderBy(desc(serviceProviders.createdAt))
      return rows
    }),
    review: publicQuery.input(z.object({ key: z.string(), id: z.number().int().positive(), status: z.enum(['approved','rejected','suspended']), notes: z.string().trim().min(10).max(1000), checksCompleted: z.boolean() })).mutation(async ({ input }) => {
      requireAdmin(input.key)
      if (input.status === 'approved' && !input.checksCompleted) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Check provider identity, contact, capability and any required licences before approval.' })
      const db = getDb()
      const result = await db.transaction(async tx => {
        const [before] = await tx.select().from(serviceProviders).where(eq(serviceProviders.id, input.id)).for('update')
        if (!before) throw new TRPCError({ code: 'NOT_FOUND', message: 'Provider not found.' })
        const reviewedAt = new Date(Math.floor(Date.now() / 1000) * 1000)
        await tx.update(serviceProviders).set({ status: input.status, reviewNotes: input.notes, reviewedAt }).where(eq(serviceProviders.id, input.id))
        await tx.insert(adminAuditLogs).values({ actorTag: 'authenticated_admin', action: 'service_provider_review', entityType: 'service_provider', entityId: String(input.id), beforeState: JSON.stringify({ status: before.status }), afterState: JSON.stringify({ status: input.status, checksCompleted: input.checksCompleted }) })
        if (before.status !== input.status) await tx.insert(serviceNotifications).values({ eventKey: `review-${before.id}-${input.status}-${reviewedAt.getTime()}`, customerId: before.customerId, providerId: before.id, kind: 'review', decision: input.status })
        return { ok: true }
      })
      kickServiceNotifications()
      return result
    }),
    notifications: publicQuery.input(z.object({ key: z.string() })).query(async ({ input }) => {
      requireAdmin(input.key)
      const rows = await getDb().select({ id: serviceNotifications.id, providerId: serviceNotifications.providerId, businessName: serviceProviders.businessName, requestId: serviceNotifications.requestId, kind: serviceNotifications.kind, decision: serviceNotifications.decision, emailState: serviceNotifications.emailState, attempts: serviceNotifications.attempts, failureCode: serviceNotifications.failureCode, createdAt: serviceNotifications.createdAt }).from(serviceNotifications).innerJoin(serviceProviders, eq(serviceNotifications.providerId, serviceProviders.id)).orderBy(desc(serviceNotifications.createdAt)).limit(100)
      return { emailConfigured: outboundEmailConfigured(), rows }
    }),
    notificationStatus: publicQuery.input(z.object({ key: z.string(), id: z.number().int().positive() })).query(async ({ input }) => {
      requireAdmin(input.key)
      const [notification] = await getDb().select({ id: serviceNotifications.id, emailState: serviceNotifications.emailState, attempts: serviceNotifications.attempts, failureCode: serviceNotifications.failureCode }).from(serviceNotifications).where(eq(serviceNotifications.id, input.id)).limit(1)
      if (!notification) throw new TRPCError({ code: 'NOT_FOUND', message: 'Notification not found. Refresh Services and try again.' })
      return { ...notification, emailConfigured: outboundEmailConfigured() }
    }),
    notifyProvider: publicQuery.input(z.object({ key: z.string(), providerId: z.number().int().positive(), requestId: z.number().int().positive().optional() })).mutation(async ({ input }) => {
      requireAdmin(input.key)
      const result = await getDb().transaction(async tx => {
        const [provider] = await tx.select().from(serviceProviders).where(eq(serviceProviders.id, input.providerId)).for('update')
        if (!provider) throw new TRPCError({ code: 'NOT_FOUND', message: 'Provider not found.' })
        if (input.requestId) {
          const [request] = await tx.select().from(serviceRequests).where(and(eq(serviceRequests.id, input.requestId), eq(serviceRequests.providerId, provider.id))).limit(1)
          if (provider.status !== 'approved' || request?.status !== 'requested') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only an open enquiry for an approved provider can be notified.' })
        } else if (!provider.reviewedAt || provider.status === 'pending') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Review this provider before notifying a decision.' })
        const eventKey = input.requestId ? `enquiry-${input.requestId}` : `review-${provider.id}-${provider.status}-${provider.reviewedAt!.getTime()}`
        const [existing] = await tx.select({ id: serviceNotifications.id, emailState: serviceNotifications.emailState }).from(serviceNotifications).where(eq(serviceNotifications.eventKey, eventKey)).limit(1)
        if (existing) return { queued: false, notificationId: existing.id, emailState: existing.emailState }
        const [saved] = await tx.insert(serviceNotifications).values({ eventKey, customerId: provider.customerId, providerId: provider.id, requestId: input.requestId ?? null, kind: input.requestId ? 'enquiry' : 'review', decision: input.requestId ? null : provider.status }).$returningId()
        return { queued: true, notificationId: saved.id, emailState: 'pending' as const }
      })
      kickServiceNotifications()
      return result
    }),
    requests: publicQuery.input(z.object({ key: z.string() })).query(async ({ input }) => {
      requireAdmin(input.key)
      return getDb().select({ request: serviceRequests, provider: { businessName: serviceProviders.businessName }, customer: { name: customers.name, phone: customers.phone } }).from(serviceRequests).innerJoin(serviceProviders, eq(serviceRequests.providerId, serviceProviders.id)).innerJoin(customers, eq(serviceRequests.customerId, customers.id)).orderBy(desc(serviceRequests.createdAt)).limit(100)
    }),
    updateRequest: publicQuery.input(z.object({ key: z.string(), id: z.number().int().positive(), status: z.enum(['contacted','closed','cancelled']) })).mutation(async ({ input }) => {
      requireAdmin(input.key)
      const db = getDb()
      return db.transaction(async tx => {
        const [before] = await tx.select().from(serviceRequests).where(eq(serviceRequests.id, input.id)).for('update')
        if (!before) throw new TRPCError({ code: 'NOT_FOUND', message: 'Request not found.' })
        if (['closed','cancelled'].includes(before.status)) throw new TRPCError({ code: 'CONFLICT', message: 'This request is already closed.' })
        await tx.update(serviceRequests).set({ status: input.status }).where(eq(serviceRequests.id, input.id))
        await tx.insert(adminAuditLogs).values({ actorTag: 'authenticated_admin', action: 'service_request_status', entityType: 'service_request', entityId: String(input.id), beforeState: JSON.stringify({ status: before.status }), afterState: JSON.stringify({ status: input.status }) })
        return { ok: true }
      })
    }),
  })
}
