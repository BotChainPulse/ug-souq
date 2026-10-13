import { and, eq, lt, lte, or, asc } from 'drizzle-orm'
import { getDb } from './queries/connection'
import { customers } from '../db/schema'
import { serviceNotifications, serviceProviders, serviceRequests } from '../db/serviceSchema'
import { outboundEmailConfigured, outboundFromAddress, sendResendEmail } from './email'
import { notificationRetryAllowed } from './serviceNotificationPolicy'

type Notification = typeof serviceNotifications.$inferSelect
// Generic alerts contain no customer name, phone, brief, review notes or sign-in token.
export function serviceNotificationEmail(event: Pick<Notification, 'id' | 'kind' | 'decision' | 'requestId'>) {
  const base = new URL(process.env.APP_URL || 'https://www.ugsouq.com').origin
  const inbox = `${base}/services/inbox`
  const title = event.kind === 'enquiry' ? 'New service enquiry' : 'Service-provider status updated'
  const detail = event.kind === 'enquiry'
    ? `You have a new customer enquiry, SR-${event.requestId}. Open your protected provider inbox to review it and contact the customer who selected you.`
    : `Your provider application status is now ${['approved','rejected','suspended'].includes(event.decision || '') ? event.decision : 'updated'}. Open your protected provider inbox for the current status.`
  return { subject: `${title} — UGSouq`, html: `<html><body style="font-family:Arial,sans-serif;color:#153d2e"><h1>UGSouq · ${title}</h1><p>${detail}</p><p><a href="${inbox}">Open provider inbox</a></p><p>Use the device on which you registered your account. This is an enquiry or account update, not a confirmed booking or payment. Contact support through UGSouq if you cannot access your account.</p><p>Never share your password, PIN or OTP. This is a service notification, separate from marketing offers.</p></body></html>`, idempotencyKey: `service-notification-${event.id}` }
}

async function claimNotification(id: number) {
  const db = getDb()
  return db.transaction(async tx => {
    const [event] = await tx.select().from(serviceNotifications).where(eq(serviceNotifications.id, id)).for('update')
    const now = new Date()
    if (!event || ['accepted','skipped'].includes(event.emailState)) return null
    if (event.emailState === 'sending' && event.attemptedAt && now.getTime() - event.attemptedAt.getTime() < 120_000) return null
    if (!notificationRetryAllowed(event.attempts, event.firstAttemptAt, now)) {
      await tx.update(serviceNotifications).set({ emailState: 'skipped', failureCode: 'retry_window_expired' }).where(eq(serviceNotifications.id, id))
      return null
    }
    if (event.nextAttemptAt > now) return null
    const [owner] = await tx.select({ email: customers.email }).from(customers).where(eq(customers.id, event.customerId)).limit(1)
    const [provider] = await tx.select().from(serviceProviders).where(and(eq(serviceProviders.id, event.providerId), eq(serviceProviders.customerId, event.customerId))).limit(1)
    let reason: string | null = !owner || !provider ? 'account_unavailable' : !owner.email ? 'no_email' : null
    if (provider && event.kind === 'review' && provider.status !== event.decision) reason = 'superseded'
    if (provider && event.kind === 'enquiry') {
      const [request] = await tx.select({ status: serviceRequests.status }).from(serviceRequests).where(and(eq(serviceRequests.id, event.requestId!), eq(serviceRequests.providerId, provider.id))).limit(1)
      if (provider.status !== 'approved' || request?.status !== 'requested') reason = 'superseded'
    }
    if (reason) {
      await tx.update(serviceNotifications).set({ emailState: 'skipped', failureCode: reason }).where(eq(serviceNotifications.id, id))
      return null
    }
    const template = serviceNotificationEmail(event)
    const payload = { to: event.recipientEmail || owner!.email!, fromAddress: event.senderAddress || outboundFromAddress(), subject: event.emailSubject || template.subject, html: event.emailHtml || template.html, idempotencyKey: template.idempotencyKey }
    await tx.update(serviceNotifications).set({ emailState: 'sending', attempts: event.attempts + 1, attemptedAt: now, firstAttemptAt: event.firstAttemptAt ?? now, failureCode: null, recipientEmail: payload.to, senderAddress: payload.fromAddress, emailSubject: payload.subject, emailHtml: payload.html }).where(eq(serviceNotifications.id, id))
    return { payload }
  })
}

let draining = false
export async function dispatchServiceNotifications() {
  if (draining || !outboundEmailConfigured()) return
  draining = true
  try {
    const db = getDb(); const now = new Date()
    const rows = await db.select({ id: serviceNotifications.id }).from(serviceNotifications).where(and(
      lt(serviceNotifications.attempts, 3), lte(serviceNotifications.nextAttemptAt, now),
      or(eq(serviceNotifications.emailState, 'pending'), eq(serviceNotifications.emailState, 'failed'), and(eq(serviceNotifications.emailState, 'sending'), lt(serviceNotifications.attemptedAt, new Date(now.getTime() - 120_000)))),
    )).orderBy(asc(serviceNotifications.createdAt)).limit(10)
    for (const { id } of rows) {
      const claimed = await claimNotification(id)
      if (!claimed) continue
      try {
        const result = await sendResendEmail(claimed.payload)
        if (!result.id) throw new Error('Email provider did not return an acceptance reference')
        await db.update(serviceNotifications).set({ emailState: 'accepted', emailId: result.id, failureCode: null }).where(eq(serviceNotifications.id, id))
      } catch {
        await db.update(serviceNotifications).set({ emailState: 'failed', failureCode: 'email_not_confirmed', nextAttemptAt: new Date(Date.now() + 5 * 60_000) }).where(eq(serviceNotifications.id, id))
        console.error('[SERVICES] Email acceptance not confirmed; notification queued for retry.')
      }
    }
  } finally { draining = false }
}
export function kickServiceNotifications() {
  void dispatchServiceNotifications().catch(() => console.error('[SERVICES] Notification queue unavailable; saved enquiries remain in the inbox.'))
}
export function startServiceNotificationScheduler() {
  kickServiceNotifications()
  setInterval(kickServiceNotifications, 60_000).unref()
}
