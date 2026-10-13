import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({ rows: [] as unknown[][], changes: [] as Record<string, unknown>[], select: vi.fn(), update: vi.fn(), transaction: vi.fn(), send: vi.fn(), configured: vi.fn() }))
vi.mock('./queries/connection', () => ({ getDb: () => mock }))
vi.mock('./email', () => ({ outboundEmailConfigured: mock.configured, outboundFromAddress: () => 'UGSouq <info@example.test>', sendResendEmail: mock.send }))
import { dispatchServiceNotifications, serviceNotificationEmail } from './serviceNotifications'
import { notificationRetryAllowed } from './serviceNotificationPolicy'
import { serviceContactLinks } from '../src/lib/serviceContact'

const event = { id: 11, customerId: 2, providerId: 5, requestId: 7, kind: 'enquiry', decision: null, emailState: 'pending', attempts: 0, attemptedAt: null, firstAttemptAt: null, nextAttemptAt: new Date(0), recipientEmail: null, senderAddress: null, emailSubject: null, emailHtml: null }
const queued = () => [[{ id: 11 }], [event], [{ email: 'provider@example.test' }], [{ id: 5, customerId: 2, status: 'approved' }], [{ status: 'requested' }]]
beforeEach(() => {
  vi.clearAllMocks(); mock.rows = []; mock.changes = []
  mock.configured.mockReturnValue(true); mock.send.mockResolvedValue({ id: 'accepted_11' })
  mock.select.mockImplementation(() => {
    const rows = mock.rows.shift() ?? []; const chain: Record<string, unknown> = {}
    for (const method of ['from','where','for','limit','orderBy']) chain[method] = () => chain
    chain.then = (resolve: (value: unknown) => void) => Promise.resolve(rows).then(resolve)
    return chain
  })
  mock.update.mockImplementation(() => ({ set: (change: Record<string, unknown>) => { mock.changes.push(change); return { where: async () => undefined } } }))
  mock.transaction.mockImplementation(async fn => fn(mock))
})
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks() })
describe('service notification delivery', () => {
  it('persists a claimed payload before sending and records acceptance, not delivery', async () => {
    mock.rows = queued(); await dispatchServiceNotifications()
    expect(mock.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'provider@example.test', idempotencyKey: 'service-notification-11' }))
    expect(mock.changes[0]).toMatchObject({ emailState: 'sending', attempts: 1, recipientEmail: 'provider@example.test' })
    expect(mock.changes[1]).toMatchObject({ emailState: 'accepted', emailId: 'accepted_11' })
  })
  it('keeps a failed send for retry without disclosing email errors or deleting the enquiry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mock.rows = queued(); mock.send.mockRejectedValue(new Error('private provider diagnostic'))
    await dispatchServiceNotifications()
    expect(mock.changes[1]).toMatchObject({ emailState: 'failed', failureCode: 'email_not_confirmed' })
    expect(JSON.stringify(mock.changes)).not.toContain('private provider diagnostic')
  })
  it('reuses the stored payload if a retry happens after a deployment or contact change', async () => {
    mock.rows = queued(); mock.rows[1] = [{ ...event, attempts: 1, emailState: 'failed', recipientEmail: 'old@example.test', senderAddress: 'Original <oldsender@example.test>', emailSubject: 'Original subject', emailHtml: '<p>Original body</p>' }]
    await dispatchServiceNotifications()
    expect(mock.send).toHaveBeenCalledWith({ to: 'old@example.test', fromAddress: 'Original <oldsender@example.test>', subject: 'Original subject', html: '<p>Original body</p>', idempotencyKey: 'service-notification-11' })
  })
  it.each(['accepted','skipped','sending'])('does not resend a %s event with an active lease', async emailState => {
    mock.rows = [[{ id: 11 }], [{ ...event, emailState, attemptedAt: new Date() }]]
    await dispatchServiceNotifications(); expect(mock.send).not.toHaveBeenCalled()
  })
  it('does not notify a suspended provider about a customer enquiry', async () => {
    mock.rows = queued(); mock.rows[3] = [{ id: 5, customerId: 2, status: 'suspended' }]
    await dispatchServiceNotifications(); expect(mock.send).not.toHaveBeenCalled()
    expect(mock.changes[0]).toMatchObject({ emailState: 'skipped', failureCode: 'superseded' })
  })
  it('does not send without email configuration', async () => {
    mock.configured.mockReturnValue(false); await dispatchServiceNotifications()
    expect(mock.select).not.toHaveBeenCalled(); expect(mock.send).not.toHaveBeenCalled()
  })
  it('stops retrying an uncertain event after the idempotency window', async () => {
    mock.rows = [[{ id: 11 }], [{ ...event, attempts: 1, firstAttemptAt: new Date(Date.now() - 24 * 60 * 60 * 1000) }]]
    await dispatchServiceNotifications(); expect(mock.send).not.toHaveBeenCalled()
    expect(mock.changes[0]).toMatchObject({ emailState: 'skipped', failureCode: 'retry_window_expired' })
  })
  it('retains a visible reason when an account has no email address', async () => {
    mock.rows = queued(); mock.rows[2] = [{ email: null }]
    await dispatchServiceNotifications(); expect(mock.send).not.toHaveBeenCalled()
    expect(mock.changes[0]).toMatchObject({ emailState: 'skipped', failureCode: 'no_email' })
  })
  it('skips an enquiry that has already been closed', async () => {
    mock.rows = queued(); mock.rows[4] = [{ status: 'closed' }]
    await dispatchServiceNotifications(); expect(mock.send).not.toHaveBeenCalled()
  })
  it('skips an old approval alert after the provider status has changed', async () => {
    mock.rows = queued(); mock.rows[1] = [{ ...event, kind: 'review', decision: 'approved', requestId: null }]; mock.rows[3] = [{ id: 5, status: 'suspended' }]
    await dispatchServiceNotifications(); expect(mock.send).not.toHaveBeenCalled()
    expect(mock.changes[0]).toMatchObject({ emailState: 'skipped', failureCode: 'superseded' })
  })
  it('limits retries to three attempts within the email idempotency window', () => {
    expect(notificationRetryAllowed(2, new Date())).toBe(true)
    expect(notificationRetryAllowed(3, null)).toBe(false)
    expect(notificationRetryAllowed(1, new Date(Date.now() - 24 * 60 * 60 * 1000))).toBe(false)
  })
  it('email links require account access and contain no customer details or credential', () => {
    vi.stubEnv('APP_URL', 'https://pilot.example.com/')
    const result = serviceNotificationEmail({ id: 11, kind: 'enquiry', decision: null, requestId: 7 })
    expect(result.html).toContain('https://pilot.example.com/services/inbox')
    expect(result.html).toContain('SR-7'); expect(result.html).not.toContain('?')
    expect(result.html).not.toContain('customerEmail'); expect(result.html).not.toContain('reviewNotes')
  })
  it('normalises Uganda contact formats without creating links for malformed input', () => {
    expect(serviceContactLinks('0750 000 001')).toEqual({ call: 'tel:+256750000001', whatsapp: 'https://wa.me/256750000001' })
    expect(serviceContactLinks('750000001')).toEqual(serviceContactLinks('+256750000001'))
    expect(serviceContactLinks('javascript:alert(1)')).toBeNull()
  })
})
