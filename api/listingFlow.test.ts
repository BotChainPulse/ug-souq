import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({ rows: [] as unknown[][], select: vi.fn(), insert: vi.fn(), update: vi.fn(), transaction: vi.fn(), values: [] as Record<string, unknown>[] }))
vi.mock('./queries/connection', () => ({ getDb: () => db }))
vi.mock('./email', async (original) => ({ ...await original<typeof import('./email')>(), sendOrderPlacedEmail: vi.fn(async () => undefined) }))
import { configurationOf } from '../src/lib/productDetails'
import { appRouter } from './router'

const specifications = ['Model', 'RAM', 'Storage', 'Network', 'Colour'].map(label => ({ label, value: `Confirmed ${label}` }))
const listing = { id: 5, sellerId: 1, status: 'approved', name: 'Synthetic test item', category: 'phones', specifications, price: 10000, oldPrice: null, offerPercent: 10, offerStartsAt: new Date('2026-10-12T00:00:00Z'), offerEndsAt: new Date('2026-10-13T00:00:00Z'), stock: 3 }
const seller = { id: 1, shopName: 'Synthetic shop', status: 'approved', rating: 0, verified: false }
const input = { phone: '0700000001', name: 'Synthetic test item', category: 'phones', specifications, price: 10000, stock: 3, condition: 'new' as const, warrantyMonths: 0, imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1cAAAAASUVORK5CYII=', offerPercent: 10, offerStartsAt: '2026-10-12T00:00:00Z', offerEndsAt: '2026-10-13T00:00:00Z' }
const caller = () => appRouter.createCaller({ req: new Request('https://example.test/api/trpc'), resHeaders: new Headers() })

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-12T12:00:00Z'))
  vi.clearAllMocks(); db.rows = []; db.values = []
  db.select.mockImplementation(() => {
    const rows = db.rows.shift() ?? []
    const chain: Record<string, unknown> = {}
    for (const method of ['from', 'innerJoin', 'where', 'for', 'orderBy', 'limit']) chain[method] = () => chain
    chain.then = (resolve: (value: unknown) => void) => Promise.resolve(rows).then(resolve)
    return chain
  })
  db.insert.mockImplementation(() => ({ values: (value: Record<string, unknown>) => {
    db.values.push(value)
    return { $returningId: async () => [{ id: 5 }] }
  } }))
  db.update.mockImplementation(() => ({ set: () => ({ where: async () => undefined }) }))
  db.transaction.mockImplementation(async (action) => action(db))
})
afterEach(() => vi.useRealTimers())

describe('seller listings through the public API, isolated from production', () => {
  it('stores the regular price and offer window, pending administrator review', async () => {
    db.rows = [[seller], [], [], []]
    await caller().sellers.addListing(input)
    expect(db.values[0]).toMatchObject({ price: 10000, oldPrice: null, offerPercent: 10, status: 'pending' })
    expect(db.values[0].offerEndsAt).toEqual(new Date(input.offerEndsAt))
  })
  it('persists extra photos with the main photo on a new listing', async () => {
    db.rows = [[seller], [], [], []]
    const extra = 'data:image/jpeg;base64,' + Buffer.from([255, 216, 255, ...Array(27).fill(0)]).toString('base64')
    await caller().sellers.addListing({ ...input, additionalImages: [extra] })
    expect(db.values[0]).toMatchObject({ imageData: input.imageData, imageGallery: JSON.stringify([extra]), status: 'pending' })
  })
  it('returns the full ordered gallery only in approved product details', async () => {
    const extra = '/images/synthetic-extra.png'
    db.rows = [[{ listing: { ...listing, imageData: '/images/synthetic-main.png', imageGallery: JSON.stringify([extra]) }, seller }]]
    expect(await caller().products.bySlug({ slug: 'listing-5' })).toMatchObject({ image: '/images/synthetic-main.png', images: ['/images/synthetic-main.png', extra] })
  })
  it('does not add gallery payloads to search and browse cards', async () => {
    db.rows = [[], [{ listing: { ...listing, imageData: '/images/synthetic-main.png', imageGallery: JSON.stringify(['/images/extra.png']) }, seller }]]
    const result = await caller().products.browse({})
    expect(result[0]).not.toHaveProperty('imageGallery')
    expect(result[0]).not.toHaveProperty('images')
  })
  it('rejects legacy comparison-price submissions before database access', async () => {
    await expect(caller().sellers.addListing({ ...input, oldPrice: 20000 })).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    expect(db.select).not.toHaveBeenCalled()
    expect(db.insert).not.toHaveBeenCalled()
  })
  it('rejects expired offers before database access', async () => {
    vi.setSystemTime(listing.offerEndsAt)
    await expect(caller().sellers.addListing(input)).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    expect(db.select).not.toHaveBeenCalled()
  })
  it('blocks listing submissions from suspended sellers', async () => {
    db.rows = [[{ ...seller, status: 'suspended' }]]
    await expect(caller().sellers.addListing(input)).rejects.toThrow(/approved/)
    expect(db.insert).not.toHaveBeenCalled()
  })
  it.each(['pending', 'rejected', 'suspended'])('hides %s listings from product details', async (status) => {
    db.rows = [[{ listing: { ...listing, status }, seller }]]
    expect(await caller().products.bySlug({ slug: 'listing-5' })).toBeNull()
  })
  it('hides approved listings when the seller is suspended', async () => {
    db.rows = [[{ listing, seller: { ...seller, status: 'suspended' } }]]
    expect(await caller().products.bySlug({ slug: 'listing-5' })).toBeNull()
  })
  it('includes approved seller listings in search with distinct cart identifiers', async () => {
    db.rows = [[], [{ listing, seller }]]
    expect(await caller().products.search({ q: 'Synthetic' })).toMatchObject([{ kind: 'listing', slug: 'listing-5', price: 9000, discount: 10 }])
  })
  it('removes an expired listing from Deals and restores its regular price in details', async () => {
    vi.setSystemTime(listing.offerEndsAt)
    db.rows = [[], [{ listing, seller }], [{ listing, seller }]]
    expect(await caller().products.browse({ deals: true })).toEqual([])
    expect(await caller().products.bySlug({ slug: 'listing-5' })).toMatchObject({ price: 10000, oldPrice: null, discount: 0 })
  })
  it('uses the current discount for the order, commission and seller proceeds', async () => {
    db.rows = [[{ item: listing }], [], [], [{ id: 5, code: 'US-TEST' }]]
    await caller().orders.create({ customerName: 'Synthetic customer', phone: input.phone, email: 'test@example.test', address: 'Ntinda Kampala', paymentMethod: 'cash', items: [{ itemType: 'listing', itemId: 5, qty: 1, price: 9000, configuration: configurationOf(listing) }] })
    expect(db.values[0]).toMatchObject({ subtotal: 9000, commissionFee: 630 })
    expect(db.values[1]).toMatchObject([{ itemType: 'listing', price: 9000, commissionFee: 630, sellerNet: 8370 }])
  })
  it('rejects a stale discount at checkout before changing stock or inserting an order', async () => {
    vi.setSystemTime(listing.offerEndsAt)
    db.rows = [[{ item: listing }]]
    await expect(caller().orders.create({ customerName: 'Synthetic customer', phone: input.phone, email: 'test@example.test', address: 'Ntinda Kampala', paymentMethod: 'cash', items: [{ itemType: 'listing', itemId: 5, qty: 1, price: 9000, configuration: configurationOf(listing) }] })).rejects.toMatchObject({ code: 'CONFLICT' })
    expect(db.update).not.toHaveBeenCalled()
    expect(db.insert).not.toHaveBeenCalled()
  })
})
