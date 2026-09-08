export type WishlistKind = 'product' | 'listing'

const STORAGE_KEY = 'wishlist'

export function wishlistKey(kind: WishlistKind, id: string | number) {
  return `${kind}-${id}`
}

export function normalizeWishlist(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return Array.from(new Set(value.flatMap((entry) => {
    const key = String(entry).trim()
    if (/^\d+$/.test(key)) return [wishlistKey('product', key)]
    if (/^(product|listing)-\d+$/.test(key)) return [key]
    return []
  })))
}

export function loadWishlist(): string[] {
  try {
    const normalized = normalizeWishlist(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
    return normalized
  } catch {
    return []
  }
}

export function saveWishlist(items: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function toggleWishlist(items: string[], key: string) {
  return items.includes(key) ? items.filter((item) => item !== key) : [...items, key]
}
