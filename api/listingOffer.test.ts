import { describe, expect, it } from 'vitest'
import { listingPrice, validateListingOffer } from '../src/lib/listingOffer'

const start = '2026-10-12T06:00:00Z'
const end = '2026-10-13T06:00:00Z'
const offer = { price: 10001, offerPercent: 10, offerStartsAt: start, offerEndsAt: end }

describe('seller offer lifecycle', () => {
  it.each([
    ['2026-10-12T05:59:59Z', 10001, 0],
    [start, 9001, 10],
    ['2026-10-13T05:59:59Z', 9001, 10],
    [end, 10001, 0],
    ['2026-10-14T06:00:00Z', 10001, 0],
  ])('prices the offer at %s consistently for browsing and checkout', (at, price, discount) => {
    const result = listingPrice(offer, new Date(at))
    expect(result.price).toBe(price)
    expect(result.discount).toBe(discount)
    expect(result.oldPrice).toBe(discount ? 10001 : null)
  })
  it('does not advertise an undated legacy comparison price', () => {
    expect(listingPrice({ price: 9000, oldPrice: 10000 })).toMatchObject({ price: 10000, oldPrice: null, discount: 0 })
  })
  it('keeps ordinary prices without inventing a discount', () => {
    expect(listingPrice({ price: 9000 })).toMatchObject({ price: 9000, oldPrice: null, discount: 0 })
  })
  it.each([{}, { offerStartsAt: 'bad', offerEndsAt: end }, { offerStartsAt: end, offerEndsAt: start }])('fails closed for malformed stored dates', (dates) => {
    expect(listingPrice({ price: 10000, offerPercent: 10, ...dates }).discount).toBe(0)
  })
  it.each([0.5, 100, -1, NaN])('rejects invalid percentages %s', (offerPercent) => {
    expect(() => validateListingOffer({ price: 10000, offerPercent, offerStartsAt: start, offerEndsAt: end }, new Date(start))).toThrow()
  })
  it('rejects a discount that reduces the price below the minimum', () => {
    expect(() => validateListingOffer({ price: 100, offerPercent: 50, offerStartsAt: start, offerEndsAt: end }, new Date(start))).toThrow(/at least UGX 100/)
  })
  it('rejects expired and reversed windows', () => {
    expect(() => validateListingOffer({ price: 10000, offerPercent: 10, offerStartsAt: start, offerEndsAt: end }, new Date(end))).toThrow()
    expect(() => validateListingOffer({ price: 10000, offerPercent: 10, offerStartsAt: end, offerEndsAt: start }, new Date(start))).toThrow()
  })
  it('accepts future scheduling and preserves UTC instants', () => {
    const result = validateListingOffer({ price: 10000, offerPercent: 10, offerStartsAt: start, offerEndsAt: end }, new Date('2026-10-11T00:00:00Z'))
    expect(result.offerStartsAt?.toISOString()).toBe('2026-10-12T06:00:00.000Z')
    expect(result.offerEndsAt?.toISOString()).toBe('2026-10-13T06:00:00.000Z')
  })
  it('allows a listing without an offer but rejects orphaned dates', () => {
    expect(validateListingOffer({ price: 10000 })).toEqual({ offerPercent: null, offerStartsAt: null, offerEndsAt: null })
    expect(() => validateListingOffer({ price: 10000, offerStartsAt: start })).toThrow()
  })
})
