// Whole UGX prices; UTC instants are shared by catalogue, checkout and ads.
export function discountedPrice(regularPrice: number, percent: number) {
  return Math.round(regularPrice * (100 - percent) / 100)
}

type OfferListing = {
  price: number
  oldPrice?: number | null
  offerPercent?: number | null
  offerStartsAt?: Date | string | null
  offerEndsAt?: Date | string | null
}

export function listingPrice(listing: OfferListing, now = new Date()) {
  const percent = listing.offerPercent ?? 0
  const start = listing.offerStartsAt ? new Date(listing.offerStartsAt).getTime() : NaN
  const end = listing.offerEndsAt ? new Date(listing.offerEndsAt).getTime() : NaN
  // Legacy, undated "old price" offers must be reviewed with an actual window.
  const regularPrice = !percent && Number(listing.oldPrice) > listing.price
    ? Number(listing.oldPrice) : listing.price
  const active = Number.isInteger(percent) && percent > 0 && percent < 100 &&
    Number.isFinite(start) && Number.isFinite(end) && start < end &&
    start <= now.getTime() && now.getTime() < end
  return {
    price: active ? discountedPrice(regularPrice, percent) : regularPrice,
    oldPrice: active ? regularPrice : null,
    discount: active ? percent : 0,
    offerActive: active,
    offerEndsAt: active ? new Date(end).toISOString() : null,
  }
}

export function validateListingOffer(input: {
  price: number; offerPercent?: number; offerStartsAt?: string; offerEndsAt?: string
}, now = new Date()) {
  const percent = input.offerPercent ?? 0
  if (!percent) {
    if (input.offerStartsAt || input.offerEndsAt) throw new Error('Choose a discount percentage for the offer dates.')
    return { offerPercent: null, offerStartsAt: null, offerEndsAt: null }
  }
  if (!Number.isInteger(percent) || percent < 1 || percent > 99 || discountedPrice(input.price, percent) < 100) {
    throw new Error('Choose a whole discount from 1–99% with a final price of at least UGX 100.')
  }
  const start = new Date(input.offerStartsAt ?? '')
  const end = new Date(input.offerEndsAt ?? '')
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start || end <= now) {
    throw new Error('Enter an offer start and a later end date that has not passed.')
  }
  return { offerPercent: percent, offerStartsAt: start, offerEndsAt: end }
}
