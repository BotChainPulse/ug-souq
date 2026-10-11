export const POPUP_SESSION_KEY = 'ugsouq.promotion.seen.v1'
export const POPUP_ROTATION_KEY = 'ugsouq.promotion.next.v1'

export function promotionPage(pathname: string): boolean {
  return /^\/(?:catalog|mall|search|promotions|food|product\/[^/]+|seller\/[^/]+)?\/?$/.test(pathname)
}

export type Promotion = {
  id: string | number
  placementType: 'paid' | 'launch'
  sellerName: string
  image: string
  headline: string
  message: string | null
  targetPath: string
  expiresAt?: string | null
}

export function usablePromotions(data: unknown, now = Date.now()): Promotion[] {
  if (!Array.isArray(data)) return []
  return data.filter((ad): ad is Promotion => Boolean(ad &&
    (typeof ad.id === 'string' || typeof ad.id === 'number') &&
    (ad.placementType === 'paid' || ad.placementType === 'launch') &&
    typeof ad.headline === 'string' && ad.headline.trim() &&
    typeof ad.sellerName === 'string' &&
    typeof ad.targetPath === 'string' && /^\/(product|seller)\/[a-zA-Z0-9_-]+$/.test(ad.targetPath) &&
    (!ad.expiresAt || Date.parse(ad.expiresAt) > now)))
}
