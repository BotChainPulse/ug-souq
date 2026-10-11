import { describe, expect, it } from 'vitest'
import { promotionChoices, promotionPage, usablePromotions } from '../src/lib/promotionPopup'

describe('promotion placement boundaries', () => {
  it('keeps a truthful seller invitation available and distinct from paid campaigns', () => {
    const choices = promotionChoices([])
    expect(choices).toHaveLength(1)
    expect(choices[0]).toMatchObject({ placementType: 'seller_signup', targetPath: '/sell' })
    expect(promotionChoices(choices)).toHaveLength(1)
    const ad = { id: 1, placementType: 'paid', sellerName: 'Shop', headline: 'Offer', targetPath: '/product/listing-1' }
    expect(promotionChoices([ad]).map(choice => choice.placementType)).toEqual(['seller_signup', 'paid'])
  })
  it('allows shopping pages but excludes checkout, identity, legal and administrator flows', () => {
    for (const path of ['/', '/catalog', '/mall', '/search', '/promotions', '/food', '/product/samsung-a15', '/seller/2']) expect(promotionPage(path)).toBe(true)
    for (const path of ['/cart', '/checkout', '/pay', '/account', '/orders', '/orders/ABC', '/track', '/admin', '/admin/ads', '/payment-settings', '/privacy', '/delete-account', '/sell/listings']) expect(promotionPage(path)).toBe(false)
  })
  it('rejects expired campaigns and unsafe or unrelated destinations', () => {
    const ad = { id: 1, placementType: 'paid', sellerName: 'Example shop', headline: 'Product', image: '', message: null, targetPath: '/product/listing-1' }
    expect(usablePromotions([ad], 1000)).toHaveLength(1)
    expect(usablePromotions([{ ...ad, expiresAt: new Date(999).toISOString() }], 1000)).toEqual([])
    expect(usablePromotions([{ ...ad, expiresAt: 'invalid' }], 1000)).toEqual([])
    for (const targetPath of ['https://other.example', '//other.example', '/admin', '/cart', '/product/../admin']) expect(usablePromotions([{ ...ad, targetPath }])).toEqual([])
    expect(usablePromotions([null, {}, { ...ad, placementType: 'unapproved' }])).toEqual([])
  })
})
