import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.hoisted(() => { process.env.ADMIN_KEY = 'synthetic-size-admin' })
const db = vi.hoisted(() => ({ rows: [] as unknown[][], select: vi.fn(), insert: vi.fn(), update: vi.fn(), transaction: vi.fn(), values: [] as unknown[], updates: [] as Record<string, unknown>[], locks: [] as string[] }))
vi.mock('./queries/connection', () => ({ getDb: () => db }))
vi.mock('./email', async original => ({ ...await original<typeof import('./email')>(), sendOrderPlacedEmail: vi.fn(async () => undefined), sendOrderStatusEmail: vi.fn(async () => undefined) }))
import { appRouter } from './router'
import { listingSizes, reserveSize, restoreItemStock } from './sizeStock'
import { validateRequestedItems } from './orderValidation'
import { readSizes } from '../src/lib/sizes'
import { sendOrderPlacedEmail } from './email'

const sizes = [{ label: 'S', stock: 2 }, { label: 'M', stock: 3 }, { label: 'XL', stock: 0 }]
const product = { id: 8, sellerId: 1, name: 'Synthetic underwear', category: 'mens-fashion', price: 20000, stock: 5, sizeOptions: JSON.stringify(sizes) }
const order = { customerName: 'Synthetic test', phone: '0700000001', email: 'size@example.test', address: 'Synthetic Kampala address', paymentMethod: 'cash' as const }
const caller = () => appRouter.createCaller({ req: new Request('https://example.test/api/trpc'), resHeaders: new Headers() })

beforeEach(() => {
  vi.clearAllMocks(); db.rows = []; db.values = []; db.updates = []; db.locks = []
  db.select.mockImplementation(() => {
    const rows = db.rows.shift() ?? []
    const chain: Record<string, unknown> = {}
    for (const method of ['from', 'innerJoin', 'where', 'orderBy', 'limit']) chain[method] = () => chain
    chain.for = (mode: string) => { db.locks.push(mode); return chain }
    chain.then = (resolve: (value: unknown) => void) => Promise.resolve(rows).then(resolve)
    return chain
  })
  db.insert.mockImplementation(() => ({ values: (value: unknown) => { db.values.push(value); return { $returningId: async () => [{ id: 90 }] } } }))
  db.update.mockImplementation(() => ({ set: (value: Record<string, unknown>) => { db.updates.push(value); return { where: async () => undefined } } }))
  db.transaction.mockImplementation(async action => action(db))
})

describe('size rules for clothing, underwear and shoes', () => {
  it.each(['mens-fashion', 'womens-fashion', 'shoes'])('requires real size stock for %s', category => {
    expect(() => listingSizes(category)).toThrow(/sizes/)
    expect(() => reserveSize({ ...product, category, sizeOptions: null }, undefined, 1)).toThrow(/not available/)
  })
  it('supports labelled underwear, numeric shoe and one-size stock without inventing defaults', () => {
    expect(listingSizes('womens-fashion', [{ label: ' uk 32b ', stock: 2 }, { label: 'One size', stock: 1 }])).toEqual([{ label: 'UK 32B', stock: 2 }, { label: 'ONE SIZE', stock: 1 }])
    expect(listingSizes('shoes', [{ label: 'EU 42', stock: 1 }])[0].label).toBe('EU 42')
  })
  it('rejects duplicate labels, invalid stock and malformed saved options', () => {
    expect(() => listingSizes('mens-fashion', [{ label: 'M', stock: 1 }, { label: ' m ', stock: 2 }])).toThrow(/once/)
    expect(() => listingSizes('mens-fashion', [{ label: 'M', stock: -1 }])).toThrow(/whole/)
    expect(() => reserveSize({ ...product, sizeOptions: '{bad' }, 'M', 1)).toThrow(/not available/)
  })
  it('allows two sizes of one product but rejects duplicate lines of the same normalized size', () => {
    expect(() => validateRequestedItems([{ itemType: 'product', itemId: 8, qty: 1, size: 'S' }, { itemType: 'product', itemId: 8, qty: 1, size: 'M' }])).not.toThrow()
    expect(() => validateRequestedItems([{ itemType: 'product', itemId: 8, qty: 1, size: 'M' }, { itemType: 'product', itemId: 8, qty: 1, size: ' m ' }])).toThrow(/Duplicate/)
  })
})

describe('checkout uses the recorded size and server inventory', () => {
  it.each([undefined, 'XXL', 'XL'])('rejects absent, unknown or sold-out size %s before stock/order writes', async size => {
    db.rows = [[{ item: product }]]
    await expect(caller().orders.create({ ...order, items: [{ itemType: 'product', itemId: 8, qty: 1, size }] })).rejects.toThrow(/size|stock/)
    expect(db.update).not.toHaveBeenCalled(); expect(db.insert).not.toHaveBeenCalled()
  })
  it('prevents overselling a size even when total stock is sufficient', async () => {
    db.rows = [[{ item: product }]]
    await expect(caller().orders.create({ ...order, items: [{ itemType: 'product', itemId: 8, qty: 3, size: 'S' }] })).rejects.toMatchObject({ code: 'CONFLICT' })
    expect(db.update).not.toHaveBeenCalled()
  })
  it('reserves only the chosen size under a row lock and records it in the order and email', async () => {
    db.rows = [[{ item: product }], [], [], [{ id: 1 }], [{ id: 90, code: 'US-SIZE' }]]
    await caller().orders.create({ ...order, items: [{ itemType: 'product', itemId: 8, qty: 2, size: ' m ', price: 1, name: 'Forged name' }] })
    expect(db.locks).toContain('update')
    expect(readSizes(db.updates[0].sizeOptions)).toEqual([{ label: 'S', stock: 2 }, { label: 'M', stock: 1 }, { label: 'XL', stock: 0 }])
    expect(db.updates[0].stock).toBe(3)
    expect(db.values[0]).toMatchObject({ subtotal: 40000 })
    expect(db.values[1]).toMatchObject([{ name: product.name, price: 20000, size: 'M', qty: 2 }])
    expect(sendOrderPlacedEmail).toHaveBeenCalledWith(expect.anything(), expect.arrayContaining([expect.objectContaining({ size: 'M' })]))
  })
  it('continues accepting ordinary non-size items without a size', () => {
    expect(reserveSize({ name: 'Phone', category: 'phones', stock: 2 }, undefined, 1)).toEqual({ size: null, stock: 1, sizeOptions: null })
  })
})

describe('cancellation and administrator stock edits', () => {
  it('restores the cancelled size and leaves other sizes untouched', async () => {
    db.rows = [{ ...product, stock: 4, sizeOptions: JSON.stringify([{ label: 'S', stock: 2 }, { label: 'M', stock: 2 }]) }].map(row => [row])
    await restoreItemStock(db as unknown as Parameters<typeof restoreItemStock>[0], { itemType: 'product', itemId: 8, qty: 1, size: 'M' })
    expect(db.locks).toEqual(['update'])
    expect(readSizes(db.updates[0].sizeOptions)).toEqual([{ label: 'S', stock: 2 }, { label: 'M', stock: 3 }])
    expect(db.updates[0].stock).toBe(5)
  })
  it('does not guess a size when cancelling a legacy unsized clothing order', async () => {
    db.rows = [[product]]
    await restoreItemStock(db as unknown as Parameters<typeof restoreItemStock>[0], { itemType: 'product', itemId: 8, qty: 1 })
    expect(db.update).not.toHaveBeenCalled()
  })
  it('denies size inventory without an administrator key', async () => {
    await expect(caller().admin.sizeInventory({ key: '' })).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    expect(db.select).not.toHaveBeenCalled()
  })
  it('rejects stale administrator stock without overwriting purchases', async () => {
    db.rows = [[product]]
    await expect(caller().admin.setItemSizes({ key: 'synthetic-size-admin', itemType: 'product', id: 8, expectedStock: 6, expectedSizes: product.sizeOptions, sizes })).rejects.toMatchObject({ code: 'CONFLICT' })
    expect(db.update).not.toHaveBeenCalled()
  })
  it('does not approve a clothing listing with missing sizes', async () => {
    db.rows = [[{ ...product, sizeOptions: null }]]
    await expect(caller().admin.setListingStatus({ key: 'synthetic-size-admin', id: 8, status: 'approved' })).rejects.toThrow(/sizes/)
    expect(db.update).not.toHaveBeenCalled()
  })
})

describe('seller size configuration', () => {
  const listing = { phone: '0700000001', name: 'Synthetic underwear', category: 'mens-fashion', price: 20000, stock: 999, condition: 'new' as const, warrantyMonths: 0, imageData: 'x'.repeat(100) }
  it('derives stock from confirmed sizes and retains pending review', async () => {
    db.rows = [[{ id: 1, shopName: 'Synthetic shop', status: 'approved' }], [], [], []]
    await caller().sellers.addListing({ ...listing, sizeOptions: sizes })
    expect(db.values[0]).toMatchObject({ stock: 5, sizeOptions: JSON.stringify(sizes), status: 'pending' })
  })
  it('rejects a clothing submission without sizes before database access', async () => {
    await expect(caller().sellers.addListing(listing)).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    expect(db.select).not.toHaveBeenCalled(); expect(db.insert).not.toHaveBeenCalled()
  })
  it('fails closed if aggregate and per-size stock disagree', () => {
    expect(() => reserveSize({ ...product, stock: 10 }, 'S', 1)).toThrow(/reconciled/)
  })
  it('keeps two sizes in one checkout distinct and decrements the shared product safely', async () => {
    const afterFirst = { ...product, stock: 4, sizeOptions: JSON.stringify([{ label: 'S', stock: 1 }, { label: 'M', stock: 3 }, { label: 'XL', stock: 0 }]) }
    db.rows = [[{ item: product }], [], [], [{ item: afterFirst }], [], [], [{ id: 1 }], [{ id: 90, code: 'US-SIZE' }]]
    await caller().orders.create({ ...order, items: [{ itemType: 'product', itemId: 8, qty: 1, size: 'S' }, { itemType: 'product', itemId: 8, qty: 2, size: 'M' }] })
    expect(db.locks).toEqual(['update', 'update'])
    expect(db.values[0]).toMatchObject({ subtotal: 60000 })
    expect(db.values[1]).toMatchObject([{ size: 'S', qty: 1 }, { size: 'M', qty: 2 }])
    expect(readSizes(db.updates[1].sizeOptions)).toEqual([{ label: 'S', stock: 1 }, { label: 'M', stock: 1 }, { label: 'XL', stock: 0 }])
  })
})
