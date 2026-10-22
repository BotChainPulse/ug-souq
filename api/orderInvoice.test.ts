import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { accountDeletionTokenHash } from './accountDeletion'
import { createOrderInvoicePdf, invoicePaymentLabel, loadOrderInvoice } from './orderInvoice'
import type { OrderInvoice } from './orderInvoice'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter } from './router'
import { createContext } from './context'

const state = vi.hoisted(() => ({ rows: [] as unknown[][], select: vi.fn(), update: vi.fn(), insert: vi.fn(), transaction: vi.fn() }))
vi.mock('./queries/connection', () => ({ getDb: () => state }))

const token = 'a'.repeat(43)
const buyer = { id: 1, phone: '0700000001', name: 'Synthetic buyer', deletionTokenHash: accountDeletionTokenHash(token) }
const order = { id: 11, code: 'US-TESTA', phone: buyer.phone, customerName: 'Synthetic buyer', customerEmail: 'private@example.test', address: 'Synthetic address, Kampala', paymentRef: 'PRIVATE-PAYMENT', payoutRef: 'PRIVATE-PAYOUT', deliveryNotes: 'PRIVATE-NOTE', status: 'delivered' as const, paymentStatus: 'paid' as const, paymentMethod: 'cash' as const, total: 105000, subtotal: 100000, deliveryFee: 5000, createdAt: new Date('2026-10-22T10:00:00Z') }
const item = { name: 'Cotton shirt', qty: 2, price: 50000, size: 'L', configuration: 'Colour: Navy; Material: Cotton', sellerId: 5 }
const request = (credential?: string) => new Request('https://example.test/api/trpc/orders.invoice', { headers: credential ? { 'x-ugsouq-customer-credential': credential } : {} })

beforeEach(() => {
  vi.clearAllMocks()
  state.rows = []
  state.select.mockImplementation(() => {
    const rows = state.rows.shift() ?? []
    const chain: Record<string, unknown> = {}
    for (const method of ['from', 'where', 'limit']) chain[method] = () => chain
    chain.then = (resolve: (value: unknown[]) => unknown) => Promise.resolve(rows).then(resolve)
    return chain
  })
})

describe('customer invoice access', () => {
  it('rejects order code and phone without an account credential before any data read', async () => {
    await expect(loadOrderInvoice(request(), order.code, buyer.phone)).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    expect(state.select).not.toHaveBeenCalled()
  })

  it('rejects another customer credential before looking up the order', async () => {
    state.rows = [[buyer]]
    await expect(loadOrderInvoice(request('b'.repeat(43)), order.code, buyer.phone)).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    expect(state.select).toHaveBeenCalledTimes(1)
  })

  it('does not expose another phone owner order', async () => {
    state.rows = [[buyer], [{ ...order, phone: '0700000002' }]]
    await expect(loadOrderInvoice(request(token), order.code, buyer.phone)).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(state.select).toHaveBeenCalledTimes(2)
  })

  it('returns saved prices and configurations without leaking internal or payment fields or writing data', async () => {
    state.rows = [[buyer], [order], [item], [{ id: 5, shopName: 'Synthetic shop' }], [{ status: 'closed', adminNotes: 'PRIVATE REFUND NOTE' }]]
    const result = await loadOrderInvoice(request(token), order.code, '0700 000-001')
    expect(result.items[0]).toEqual({ ...item, sellerName: 'Synthetic shop' })
    expect(result.order).toMatchObject({ total: 105000, subtotal: 100000, customerName: buyer.name })
    expect(result.returnCases).toEqual([{ status: 'closed' }])
    expect(JSON.stringify(result)).not.toMatch(/PRIVATE|customerEmail|paymentRef|payoutRef|deliveryNotes|deletionTokenHash/)
    expect(state.update).not.toHaveBeenCalled()
    expect(state.insert).not.toHaveBeenCalled()
    expect(state.transaction).not.toHaveBeenCalled()
  })

  it('returns not found without guessing a seller from a current product', async () => {
    state.rows = [[buyer], []]
    await expect(loadOrderInvoice(request(token), 'US-MISSING', buyer.phone)).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('serves a private PDF through the real HTTP procedure without accepting client-supplied prices', async () => {
    state.rows = [[buyer], [order], [item], [{ id: 5, shopName: 'Synthetic shop' }], []]
    const req = new Request('https://example.test/api/trpc/orders.invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-ugsouq-customer-credential': token },
      body: JSON.stringify({ json: { code: order.code, phone: buyer.phone, total: 1, paymentStatus: 'unpaid' } }),
    })
    const response = await fetchRequestHandler({ endpoint: '/api/trpc', allowMethodOverride: true, req, router: appRouter, createContext })
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    const body = await response.json()
    const result = body.result.data.json
    expect(result.filename).toBe('UGSouq-Invoice-US-TESTA.pdf')
    expect(result.mimeType).toBe('application/pdf')
    const pdf = await PDFDocument.load(Buffer.from(result.data, 'base64'))
    expect(pdf.getPageCount()).toBe(1)
    expect(state.update).not.toHaveBeenCalled()
    expect(state.insert).not.toHaveBeenCalled()
  })
})

describe('invoice payment truth and PDF generation', () => {
  it('does not infer payment from delivery, cash-on-delivery or a pending confirmation', () => {
    expect(invoicePaymentLabel({ status: 'delivered', paymentStatus: 'unpaid' })).toBe('Unpaid')
    expect(invoicePaymentLabel({ status: 'delivered', paymentStatus: 'pending_confirmation' })).toBe('Awaiting payment verification')
    expect(invoicePaymentLabel({ status: 'cancelled', paymentStatus: 'unpaid' })).toBe('No payment recorded')
    expect(invoicePaymentLabel({ status: 'cancelled', paymentStatus: 'paid' })).toBe('Payment confirmed')
  })

  it('creates a readable single-page document with Unicode buyer and product names', async () => {
    const bytes = await createOrderInvoicePdf({ order: { ...order, customerName: 'Nambi Ŋŋaali' }, items: [{ ...item, name: 'Cotton shirt – édition', sellerName: 'Synthetic shop' }], returnCases: [] })
    expect(Buffer.from(bytes).subarray(0, 5).toString()).toBe('%PDF-')
    const pdf = await PDFDocument.load(bytes)
    expect(pdf.getTitle()).toBe('UGSouq order invoice US-TESTA')
    expect(pdf.getPageCount()).toBe(1)
  })

  it('paginates long multi-item orders and never crops a long configuration into the totals', async () => {
    const items = Array.from({ length: 50 }, (_, index) => ({ ...item, name: `Item ${index + 1}: a long product name`, configuration: 'Storage: 256 GB; Memory: 16 GB; Processor: Confirmed model; ' + 'X'.repeat(100), qty: 1, price: 1000, sellerName: 'Synthetic shop' }))
    const bytes = await createOrderInvoicePdf({ order: { ...order, subtotal: 50000, total: 55000 }, items, returnCases: [{ status: 'refunded' }] })
    const pdf = await PDFDocument.load(bytes)
    expect(pdf.getPageCount()).toBeGreaterThan(2)
    expect(pdf.getPageCount()).toBeLessThan(20)
  })

  it('refuses invalid saved amounts rather than manufacturing a zero invoice', async () => {
    const invoice: OrderInvoice = { order: { ...order, total: Number.NaN }, items: [item], returnCases: [] }
    await expect(createOrderInvoicePdf(invoice)).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' })
  })
})
