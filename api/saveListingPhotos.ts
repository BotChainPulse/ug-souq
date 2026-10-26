import { TRPCError } from '@trpc/server'
import { eq } from 'drizzle-orm'
import { listings, notifications } from '../db/schema'
import { readListingPhotos } from '../src/lib/listingPhotos'
import { getDb } from './queries/connection'
import { photoAudit, photoRevision, validateListingPhotos } from './listingPhotos'

export async function saveListingPhotos(input: { id: number; photos: string[]; expectedRevision: string; sellerId?: number },
  audit?: (tx: Pick<ReturnType<typeof getDb>, 'insert'>, before: ReturnType<typeof photoAudit>, after: ReturnType<typeof photoAudit>) => Promise<void>) {
  return getDb().transaction(async tx => {
    const [listing] = await tx.select().from(listings).where(eq(listings.id, input.id)).for('update')
    if (!listing || (input.sellerId != null && listing.sellerId !== input.sellerId)) throw new TRPCError({ code: 'NOT_FOUND', message: 'Listing not found for this shop.' })
    if (listing.status === 'suspended' || listing.status === 'terminated') throw new TRPCError({ code: 'FORBIDDEN', message: 'Contact support before editing a suspended or terminated listing.' })
    if (photoRevision(listing.imageData, listing.imageGallery) !== input.expectedRevision) throw new TRPCError({ code: 'CONFLICT', message: 'The photos changed. Refresh your listings before saving.' })
    const before = readListingPhotos(listing.imageData, listing.imageGallery)
    const after = validateListingPhotos(input.photos, before)
    if (after.imageData === listing.imageData && after.imageGallery === listing.imageGallery) return { ok: true, unchanged: true }
    // Image edits never bypass moderation or reactivate a suspended listing.
    await tx.update(listings).set({ ...after, status: 'pending' }).where(eq(listings.id, listing.id))
    await tx.insert(notifications).values({ type: 'listing_pending', title: 'Updated listing photos need review', message: `Photos updated for ${listing.name}. Review every photo before publishing.`, entityType: 'listing', entityId: String(listing.id) })
    if (audit) await audit(tx, photoAudit(before), photoAudit(input.photos))
    return { ok: true, unchanged: false }
  })
}
