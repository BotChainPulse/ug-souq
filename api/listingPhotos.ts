import { createHash } from 'node:crypto'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { MAX_LISTING_PHOTOS, MAX_NEW_PHOTO_LENGTH } from '../src/lib/listingPhotos'

export const listingPhotosInput = z.array(z.string().max(2_000_000)).min(1).max(MAX_LISTING_PHOTOS)

function invalid(message: string): never {
  throw new TRPCError({ code: 'BAD_REQUEST', message })
}

export function validateListingPhotos(photos: string[], existing: string[] = []) {
  if (!photos.length || photos.length > MAX_LISTING_PHOTOS) invalid('Choose between one and six item photos.')
  if (new Set(photos).size !== photos.length) invalid('Remove duplicate photos before saving.')
  for (const photo of photos) {
    // Previously accepted photos may be larger; permit retaining/reordering them.
    if (existing.includes(photo)) continue
    if (photo.length > MAX_NEW_PHOTO_LENGTH) invalid('A photo is too large. Upload it again to resize it.')
    const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(photo)
    if (!match) invalid('Use JPG, PNG or WebP item photos.')
    const bytes = Buffer.from(match[2], 'base64')
    if (bytes.toString('base64') !== match[2] || bytes.length < 24) invalid('A photo is invalid. Choose another image.')
    const type = match[1]
    const valid = type === 'jpeg' ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
      : type === 'png' ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
      : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
    if (!valid) invalid('A photo does not match its image format. Choose another image.')
  }
  return { imageData: photos[0], imageGallery: photos.length > 1 ? JSON.stringify(photos.slice(1)) : null }
}

export function photoRevision(main?: string | null, gallery?: string | null) {
  return createHash('sha256').update(JSON.stringify([main ?? null, gallery ?? null])).digest('hex')
}

export function photoAudit(photos: string[]) {
  return { count: photos.length, hashes: photos.map(photo => createHash('sha256').update(photo).digest('hex')) }
}
