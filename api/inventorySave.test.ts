import { beforeEach, describe, expect, it, vi } from 'vitest'
import { adminAuditLogs } from '../db/schema'
import { getDb } from './queries/connection'
import { inventoryAuditState } from './inventoryAudit'

vi.hoisted(() => { process.env.ADMIN_KEY = 'synthetic-inventory-admin' })
vi.mock('./queries/connection', () => ({ getDb: vi.fn() }))
import { adminRouter } from './admin'

const caller = () => adminRouter.createCaller({ req: new Request('https://example.test'), resHeaders: new Headers() })
const before = {
  id: 1, sellerId: 10, name: 'Hand made Kitenge', category: 'womens-fashion',
  stock: 7, sizeOptions: null as string | null, productType: null as string | null,
  requiresSize: null as boolean | null, specifications: null as string | null,
  imageData: 'data:image/jpeg;base64,' + 'A'.repeat(200000),
}
const expected = { stock: before.stock, sizeOptions: null, productType: null, requiresSize: null, specifications: null }
const edit = { key: 'synthetic-inventory-admin', itemType: 'listing' as const, id: 1, expected, productType: 'general' as const, requiresSize: true, stock: 4, sizes: [{ label: 'M', stock: 4 }], specifications: [] }

// Model the commit boundary, including MySQL TEXT size enforcement. A write on
// the outer connection cannot be rolled back with a stock transaction.
function database(failAudit = false) {
  let stored = { ...before }
  const audits: Record<string, unknown>[] = []
  const outsideInsert = vi.fn(() => { throw new Error('Audit must use the stock transaction') })
  const db = {
    insert: outsideInsert,
    transaction: async (run: (tx: unknown) => Promise<unknown>) => {
      let staged = { ...stored }
      const pending: Record<string, unknown>[] = []
      const tx = {
        select: () => ({ from: () => ({ where: () => ({ for: async () => [{ ...staged }] }) }) }),
        update: () => ({ set: (values: Partial<typeof before>) => ({ where: async () => { staged = { ...staged, ...values } } }) }),
        insert: (table: unknown) => ({ values: async (value: Record<string, unknown>) => {
          expect(table).toBe(adminAuditLogs)
          for (const field of ['beforeState', 'afterState', 'meta']) {
            if (typeof value[field] === 'string' && Buffer.byteLength(value[field], 'utf8') > 65535) throw new Error('Data too long for audit TEXT')
          }
          if (failAudit) throw new Error('Synthetic audit storage failure')
          pending.push(value)
        } }),
      }
      const result = await run(tx)
      stored = staged
      audits.push(...pending)
      return result
    },
  }
  vi.mocked(getDb).mockReturnValue(db as unknown as ReturnType<typeof getDb>)
  return { stored: () => stored, audits, outsideInsert }
}

beforeEach(() => vi.clearAllMocks())

describe('inventory save audit regression', () => {
  it('saves M/4 on a listing with a large photo without copying the image into the audit', async () => {
    const db = database()
    await expect(caller().setItemDetails(edit)).resolves.toEqual({ ok: true })
    expect(db.stored()).toMatchObject({ stock: 4, sizeOptions: '[{"label":"M","stock":4}]', imageData: before.imageData })
    expect(db.audits).toHaveLength(1)
    expect(JSON.parse(db.audits[0].beforeState as string)).toEqual(expected)
    expect(JSON.parse(db.audits[0].afterState as string)).toMatchObject({ stock: 4, sizeOptions: '[{"label":"M","stock":4}]' })
    expect(JSON.stringify(db.audits)).not.toContain('imageData')
    expect(JSON.stringify(db.audits)).not.toContain('data:image')
    expect(db.outsideInsert).not.toHaveBeenCalled()
  })
  it.each(['listing', 'product'] as const)('rolls back the %s inventory if its audit cannot save', async itemType => {
    const db = database(true)
    await expect(caller().setItemDetails({ ...edit, itemType })).rejects.toThrow('Synthetic audit storage failure')
    expect(db.stored()).toEqual(before)
    expect(db.audits).toEqual([])
  })
  it('rolls back the older size-only edit if audit storage fails', async () => {
    const db = database(true)
    await expect(caller().setItemSizes({ key: edit.key, itemType: edit.itemType, id: edit.id, expectedStock: before.stock, expectedSizes: null, sizes: edit.sizes })).rejects.toThrow('Synthetic audit storage failure')
    expect(db.stored()).toEqual(before)
    expect(db.audits).toEqual([])
  })
  it('retains stale-stock protection before any write', async () => {
    const db = database()
    await expect(caller().setItemDetails({ ...edit, expected: { ...expected, stock: 3 } })).rejects.toMatchObject({ code: 'CONFLICT' })
    expect(db.stored()).toEqual(before)
    expect(db.audits).toEqual([])
  })
  it('keeps oversized legacy size/specification evidence bounded with fingerprints', () => {
    const state = inventoryAuditState({ ...before, sizeOptions: '"'.repeat(65000), specifications: '😀'.repeat(16000) })
    expect(state.sizeOptions).toMatchObject({ omitted: true, bytes: 65000, sha256: expect.stringMatching(/^[a-f0-9]{64}$/) })
    expect(state.specifications).toMatchObject({ omitted: true, bytes: 64000 })
    expect(Buffer.byteLength(JSON.stringify(state), 'utf8')).toBeLessThan(65535)
  })
})
