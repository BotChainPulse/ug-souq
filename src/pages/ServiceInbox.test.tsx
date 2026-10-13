import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
const mocks = vi.hoisted(() => ({ getAccount: vi.fn(), query: vi.fn() }))
vi.mock('../lib/account', () => ({ getAccount: mocks.getAccount }))
vi.mock('../components/Header', () => ({ default: () => null }))
vi.mock('../components/Footer', () => ({ default: () => null }))
vi.mock('../providers/trpc', () => ({ trpc: { services: { inbox: { useQuery: mocks.query }, respond: { useMutation: () => ({ isPending: false }) } } } }))
import ServiceInbox from './ServiceInbox'
const render = () => renderToStaticMarkup(<MemoryRouter><ServiceInbox /></MemoryRouter>)
afterEach(() => vi.clearAllMocks())
describe('provider inbox', () => {
  it('requires a secured account and never invites phone-only lookup', () => {
    mocks.getAccount.mockReturnValue(null); mocks.query.mockReturnValue({})
    const html = render()
    expect(html).toContain('Open your protected account'); expect(html).not.toContain('Call customer')
    expect(mocks.query).toHaveBeenCalledWith({ phone: '' }, expect.objectContaining({ enabled: false }))
  })
  it('offers contact actions for a consenting customer’s active enquiry', () => {
    mocks.getAccount.mockReturnValue({ phone: '0700000001', deletionToken: 'synthetic-test-only' })
    mocks.query.mockReturnValue({ data: { provider: { businessName: 'Synthetic provider', status: 'approved' }, emailConfigured: true, notifications: [], requests: [{ id: 7, reference: 'SR-7', district: 'Wakiso', status: 'requested', brief: 'Synthetic enquiry', createdAt: new Date(), contact: { name: 'Synthetic customer', phone: '0750000001' } }] } })
    const html = render()
    expect(html).toContain('href="tel:+256750000001"'); expect(html).toContain('href="https://wa.me/256750000001"')
    expect(html).toContain('Mark contacted'); expect(html).toContain('1 awaiting contact')
  })
  it('does not render contact actions for a closed enquiry', () => {
    mocks.getAccount.mockReturnValue({ phone: '0700000001', deletionToken: 'synthetic-test-only' })
    mocks.query.mockReturnValue({ data: { provider: { businessName: 'Synthetic provider', status: 'approved' }, emailConfigured: true, notifications: [], requests: [{ id: 7, reference: 'SR-7', status: 'closed', createdAt: new Date(), contact: null }] } })
    expect(render()).not.toContain('Call customer')
  })
})
