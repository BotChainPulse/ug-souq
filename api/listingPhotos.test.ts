import { beforeEach, describe, expect, it, vi } from 'vitest'
import { adminAuditLogs } from '../db/schema'
import { getDb } from './queries/connection'
import { accountDeletionTokenHash } from './accountDeletion'
import { photoRevision, validateListingPhotos } from './listingPhotos'
import { makeMainPhoto, readListingPhotos } from '../src/lib/listingPhotos'

vi.hoisted(() => { process.env.ADMIN_KEY = 'synthetic-photo-admin' })
vi.mock('./queries/connection', () => ({ getDb: vi.fn() }))
import { appRouter } from './router'

const token = 'synthetic-photo-owner-token-that-is-long-enough'
const phone = '0700000001'
const image = (index: number) => {
  const bytes = Buffer.alloc(30, index)
  Buffer.from([137,80,78,71,13,10,26,10]).copy(bytes)
  return `data:image/png;base64,${bytes.toString('base64')}`
}
const images = Array.from({ length: 6 }, (_, i) => image(i))
const before = { id: 5, sellerId: 1, name: 'Synthetic listing', category: 'home-living', stock: 4, status: 'approved', imageData: images[0], imageGallery: null as string | null }
const caller = (credential = '') => appRouter.createCaller({ req: new Request('https://example.test', { headers: credential ? { 'x-ugsouq-customer-credential': credential } : {} }), resHeaders: new Headers() })
const edit = { id: 5, phone, photos: images, expectedRevision: photoRevision(before.imageData, before.imageGallery) }

// Isolated transactional model: a failed audit/notification must roll back photos.
function database(options: { status?: string; sellerId?: number; sellerStatus?: string; failAudit?: boolean; failNotification?: boolean; gallery?: string; credential?: string } = {}) {
  let stored = { ...before, status: options.status ?? before.status, sellerId: options.sellerId ?? before.sellerId, imageGallery: options.gallery ?? null }
  let selects = 0
  const events: Record<string, unknown>[] = []
  const audits: Record<string, unknown>[] = []
  const outer = vi.fn(() => {
    const rows = selects++ === 0 ? [{ id: 9, phone, deletionTokenHash: accountDeletionTokenHash(options.credential ?? token) }] : [{ id: 1, phone, status: options.sellerStatus ?? 'approved' }]
    const chain: Record<string, unknown> = {}
    for (const key of ['from', 'where', 'limit']) chain[key] = () => chain
    chain.then = (resolve: (rows: unknown) => void) => Promise.resolve(rows).then(resolve)
    return chain
  })
  const update = vi.fn()
  const transaction = vi.fn(async (run: (tx: unknown) => Promise<unknown>) => {
    let staged = { ...stored }
    const pendingEvents: Record<string, unknown>[] = [], pendingAudits: Record<string, unknown>[] = []
    const tx = {
      select: () => ({ from: () => ({ where: () => ({ for: async () => [{ ...staged }] }) }) }),
      update: () => ({ set: (values: Partial<typeof stored>) => ({ where: async () => { update(values); staged = { ...staged, ...values } } }) }),
      insert: (table: unknown) => ({ values: async (values: Record<string, unknown>) => {
        if (table === adminAuditLogs) { if (options.failAudit) throw new Error('Synthetic audit failure'); pendingAudits.push(values) }
        else { if (options.failNotification) throw new Error('Synthetic notification failure'); pendingEvents.push(values) }
      } }),
    }
    const result = await run(tx)
    stored = staged; events.push(...pendingEvents); audits.push(...pendingAudits)
    return result
  })
  const db = { select: outer, transaction }
  vi.mocked(getDb).mockReturnValue(db as unknown as ReturnType<typeof getDb>)
  return { stored: () => stored, events, audits, outer, update, transaction }
}
beforeEach(() => vi.clearAllMocks())

describe('listing photo validation and compatibility', () => {
  it('stores one main photo and up to five extra photos without duplicating the main', () => {
    expect(validateListingPhotos(images)).toEqual({ imageData: images[0], imageGallery: JSON.stringify(images.slice(1)) })
    expect(validateListingPhotos([images[0]])).toEqual({ imageData: images[0], imageGallery: null })
  })
  it('round trips all six in the selected main-photo order', () => {
    const ordered = makeMainPhoto(images, 4), stored = validateListingPhotos(ordered)
    expect(readListingPhotos(stored.imageData, stored.imageGallery)).toEqual(ordered)
  })
  it.each([[], [...images, image(7)], [images[0], images[0]], ['https://example.test/photo.jpg'], ['data:image/svg+xml;base64,AAAA'], ['data:image/png;base64,AAAA'], ['data:image/jpeg;base64,' + Buffer.alloc(40).toString('base64')], ['data:image/png;base64,' + 'A'.repeat(350_000)]].map(photos => ({ photos })))('rejects invalid or excessive photos', ({ photos }) => {
    expect(() => validateListingPhotos(photos)).toThrow()
  })
  it('preserves the main photo on older listings and ignores malformed gallery storage', () => {
    expect(readListingPhotos('/images/item.png', null)).toEqual(['/images/item.png'])
    expect(readListingPhotos(images[0], 'broken JSON')).toEqual([images[0]])
    expect(readListingPhotos(images[0], JSON.stringify([images[0], 'javascript:alert(1)', null, images[1]]))).toEqual(images.slice(0, 2))
  })
  it('permits retaining and moving a previously accepted larger image', () => {
    const old = 'data:image/jpeg;base64,' + 'A'.repeat(500_000)
    expect(validateListingPhotos([images[0], old], [old]).imageGallery).toContain(old)
    expect(() => validateListingPhotos([old])).toThrow(/large/)
  })
})

describe('seller and administrator photo edits', () => {
  it('rejects phone-only edits before accessing the database', async () => {
    const db = database()
    await expect(caller().sellers.updateListingPhotos(edit)).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    expect(db.outer).not.toHaveBeenCalled(); expect(db.transaction).not.toHaveBeenCalled()
  })
  it('rejects an invalid secured-account credential', async () => {
    const db = database()
    await expect(caller('a'.repeat(40)).sellers.updateListingPhotos(edit)).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    expect(db.transaction).not.toHaveBeenCalled()
  })
  it('saves all photos atomically and returns a live listing to moderation', async () => {
    const db = database()
    await caller(token).sellers.updateListingPhotos(edit)
    expect(db.stored()).toMatchObject({ imageData: images[0], imageGallery: JSON.stringify(images.slice(1)), status: 'pending', stock: 4 })
    expect(db.events).toHaveLength(1)
  })
  it('blocks changing another shop listing even with a valid account', async () => {
    const db = database({ sellerId: 2 })
    await expect(caller(token).sellers.updateListingPhotos(edit)).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(db.update).not.toHaveBeenCalled()
  })
  it.each(['suspended', 'terminated'])('does not revive a %s listing', async status => {
    const db = database({ status })
    await expect(caller(token).sellers.updateListingPhotos(edit)).rejects.toMatchObject({ code: 'FORBIDDEN' })
    expect(db.update).not.toHaveBeenCalled()
  })
  it('blocks edits from a suspended shop', async () => {
    const db = database({ sellerStatus: 'suspended' })
    await expect(caller(token).sellers.updateListingPhotos(edit)).rejects.toMatchObject({ code: 'FORBIDDEN' })
    expect(db.transaction).not.toHaveBeenCalled()
  })
  it('rejects a stale revision before updating', async () => {
    const db = database({ gallery: JSON.stringify([images[2]]) })
    await expect(caller(token).sellers.updateListingPhotos(edit)).rejects.toMatchObject({ code: 'CONFLICT' })
    expect(db.update).not.toHaveBeenCalled()
  })
  it('does not hide a live listing or create a review event when photos are unchanged', async () => {
    const db = database()
    expect(await caller(token).sellers.updateListingPhotos({ ...edit, photos: [images[0]] })).toMatchObject({ unchanged: true })
    expect(db.stored().status).toBe('approved'); expect(db.events).toHaveLength(0)
  })
  it('rolls back edits if the review notification fails', async () => {
    const db = database({ failNotification: true })
    await expect(caller(token).sellers.updateListingPhotos(edit)).rejects.toThrow()
    expect(db.stored()).toEqual(before)
  })
  it('requires the administrator key and never logs image data in the audit', async () => {
    const db = database()
    await expect(caller().admin.setListingPhotos({ ...edit, key: 'incorrect' })).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    expect(db.transaction).not.toHaveBeenCalled()
    await caller().admin.setListingPhotos({ ...edit, key: 'synthetic-photo-admin' })
    expect(db.audits).toHaveLength(1)
    expect(JSON.parse(db.audits[0].afterState as string)).toMatchObject({ count: 6 })
    expect(JSON.stringify(db.audits)).not.toContain('data:image')
  })
  it('approves the reviewed gallery without copying images into the audit', async () => {
    const db = database({ status: 'pending' })
    await caller().admin.setListingStatus({ key: 'synthetic-photo-admin', id: 5, status: 'approved', expectedPhotoRevision: edit.expectedRevision })
    expect(db.stored().status).toBe('approved')
    expect(db.audits).toHaveLength(1); expect(JSON.stringify(db.audits)).not.toContain('data:image')
  })
  it('rejects an outdated approval page when the gallery changed', async () => {
    const db = database({ gallery: JSON.stringify([images[2]]) })
    await expect(caller().admin.setListingStatus({ key: 'synthetic-photo-admin', id: 5, status: 'approved', expectedPhotoRevision: edit.expectedRevision })).rejects.toMatchObject({ code: 'CONFLICT' })
    expect(db.update).not.toHaveBeenCalled()
  })
  it('requires refreshing older approval clients that did not review the gallery revision', async () => {
    const db = database({ status: 'pending' })
    await expect(caller().admin.setListingStatus({ key: 'synthetic-photo-admin', id: 5, status: 'approved' })).rejects.toMatchObject({ code: 'CONFLICT' })
    expect(db.update).not.toHaveBeenCalled()
  })
  it('rolls back approval if the audit fails', async () => {
    const db = database({ status: 'pending', failAudit: true })
    await expect(caller().admin.setListingStatus({ key: 'synthetic-photo-admin', id: 5, status: 'approved', expectedPhotoRevision: edit.expectedRevision })).rejects.toThrow()
    expect(db.stored().status).toBe('pending')
  })
  it('rolls back photos and the review event if the admin audit fails', async () => {
    const db = database({ failAudit: true })
    await expect(caller().admin.setListingPhotos({ ...edit, key: 'synthetic-photo-admin' })).rejects.toThrow()
    expect(db.stored()).toEqual(before); expect(db.events).toHaveLength(0)
  })
})

