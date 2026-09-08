import { describe, expect, it } from 'vitest'
import { normalizeWishlist, toggleWishlist, wishlistKey } from '../src/lib/wishlist'

describe('wishlist storage', () => {
  it('migrates legacy product IDs and removes duplicates', () => {
    expect(normalizeWishlist(['4', 'product-4', 'listing-8', null])).toEqual([
      'product-4',
      'listing-8',
    ])
  })

  it('creates and toggles canonical item keys', () => {
    const key = wishlistKey('product', 6)
    expect(key).toBe('product-6')
    expect(toggleWishlist([], key)).toEqual(['product-6'])
    expect(toggleWishlist(['product-6'], key)).toEqual([])
  })
})
