export const MAX_LISTING_PHOTOS = 6
export const MAX_NEW_PHOTO_LENGTH = 350_000

// The first photo remains in image_data for older clients, cards, ads and carts.
// Only the remaining photos are stored in image_gallery.
export function readListingPhotos(main?: string | null, gallery?: unknown): string[] {
  let extra: unknown = gallery
  if (typeof extra === 'string') {
    try { extra = JSON.parse(extra) } catch { extra = [] }
  }
  const candidates = [main, ...(Array.isArray(extra) ? extra : [])]
  return [...new Set(candidates.filter((value): value is string =>
    typeof value === 'string' && /^(?:data:image\/(?:jpeg|png|webp);base64,|https:\/\/|\/(?!\/))/.test(value)
  ))].slice(0, MAX_LISTING_PHOTOS)
}

export function makeMainPhoto(photos: string[], index: number) {
  if (index < 0 || index >= photos.length) return photos
  return [photos[index], ...photos.filter((_, i) => i !== index)]
}
