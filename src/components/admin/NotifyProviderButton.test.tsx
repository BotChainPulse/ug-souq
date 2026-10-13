import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
const mocks = vi.hoisted(() => ({ mutation: {} as Record<string, unknown>, query: {} as Record<string, unknown>, useQuery: vi.fn(), mutate: vi.fn() }))
vi.mock('../../providers/trpc', () => ({ trpc: { admin: { services: { notifyProvider: { useMutation: () => mocks.mutation }, notificationStatus: { useQuery: mocks.useQuery } } } } }))
import NotifyProviderButton from './NotifyProviderButton'
const render = () => renderToStaticMarkup(<NotifyProviderButton adminKey="synthetic-key" providerId={5} requestId={7} onQueued={() => undefined} />)
beforeEach(() => { vi.clearAllMocks(); mocks.mutation = { isPending: false, mutate: mocks.mutate }; mocks.query = {}; mocks.useQuery.mockImplementation(() => mocks.query) })
describe('notify provider feedback', () => {
  it('starts enabled without querying an unrelated notification', () => {
    const html = render(); expect(html).toContain('Notify provider of enquiry'); expect(html).not.toContain('disabled=')
    expect(mocks.useQuery).toHaveBeenCalledWith({ key: 'synthetic-key', id: 0 }, expect.objectContaining({ enabled: false }))
  })
  it('shows pending text beside the button while saving', () => {
    mocks.mutation.isPending = true
    const html = render(); expect(html).toContain('Queuing alert'); expect(html).toContain('Saving this notification'); expect(html).toContain('disabled=')
  })
  it('shows a failed queue request and retry beside that button', () => {
    mocks.mutation.error = { message: 'Synthetic failure' }
    const html = render(); expect(html).toContain('Could not queue the alert: Synthetic failure'); expect(html).toContain('Try again')
  })
  it('tracks the exact returned notification and explains existing accepted alerts', () => {
    mocks.mutation.data = { queued: false, notificationId: 11, emailState: 'accepted' }
    mocks.query = { data: { emailState: 'accepted', attempts: 1, emailConfigured: true } }
    const html = render(); expect(html).toContain('no duplicate created'); expect(html).toContain('email provider accepted'); expect(html).toContain('Mailbox delivery is not confirmed')
    expect(mocks.useQuery).toHaveBeenCalledWith({ key: 'synthetic-key', id: 11 }, expect.objectContaining({ enabled: true }))
  })
  it('explains an unconfigured sender instead of claiming the alert was sent', () => {
    mocks.mutation.data = { queued: true, notificationId: 11, emailState: 'pending' }
    mocks.query = { data: { emailState: 'pending', attempts: 0, emailConfigured: false } }
    expect(render()).toContain('email sender is not configured')
  })
})
