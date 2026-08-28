import { createContext, useContext, useState, ReactNode } from 'react'

export type CartItem = {
  itemType: string
  itemId: string | number
  name: string
  price: number
  qty: number
  image?: string
  sellerId?: number
  sellerName?: string
}

type CartContextType = {
  items: CartItem[]
  add: (item: Omit<CartItem, 'qty'> & { qty?: number }) => void
  setQty: (itemType: string, itemId: string | number, qty: number) => void
  remove: (itemType: string, itemId: string | number) => void
  clear: () => void
  subtotal: number
  count: number
}

const CartContext = createContext<CartContextType | null>(null)
const STORAGE_KEY = 'ugsouq_cart'

const sameKey = (a: { itemType: string; itemId: string | number }, b: { itemType: string; itemId: string | number }) =>
  a.itemType === b.itemType && String(a.itemId) === String(b.itemId)

const safeQty = (q: any) => {
  const n = Number(q)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1
}

const sanitize = (raw: any[]): CartItem[] => {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((i) => i && i.itemType != null && i.itemId != null)
    .map((i) => ({
      itemType: String(i.itemType),
      itemId: i.itemId,
      name: typeof i.name === 'string' ? i.name : 'Item',
      price: Number.isFinite(Number(i.price)) ? Number(i.price) : 0,
      qty: safeQty(i.qty),
      ...(i.image != null ? { image: i.image } : {}),
      ...(i.sellerId != null ? { sellerId: i.sellerId } : {}),
      ...(i.sellerName != null ? { sellerName: i.sellerName } : {}),
    }))
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return sanitize(raw ? JSON.parse(raw) : [])
    } catch {
      return []
    }
  })

  const persist = (next: CartItem[]) => {
    setItems(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
  }

  const add: CartContextType['add'] = (item) => {
    setItems((prev) => {
      const existing = prev.find((i) => sameKey(i, item))
      const qty = safeQty(item.qty ?? 1)
      const next = existing
        ? prev.map((i) => (sameKey(i, item) ? { ...i, qty: i.qty + qty } : i))
        : [...prev, { ...item, qty } as CartItem]
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  const setQty: CartContextType['setQty'] = (itemType, itemId, qty) => {
    setItems((prev) => {
      const n = Number(qty)
      const next =
        !Number.isFinite(n) || n <= 0
          ? prev.filter((i) => !(i.itemType === itemType && String(i.itemId) === String(itemId)))
          : prev.map((i) => (i.itemType === itemType && String(i.itemId) === String(itemId) ? { ...i, qty: Math.floor(n) } : i))
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  const remove: CartContextType['remove'] = (itemType, itemId) => {
    setItems((prev) => {
      const next = prev.filter((i) => !(i.itemType === itemType && String(i.itemId) === String(itemId)))
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  const clear = () => persist([])
  const subtotal = items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 0), 0)
  const count = items.reduce((s, i) => s + (Number(i.qty) || 0), 0)

  return (
    <CartContext.Provider value={{ items, add, setQty, remove, clear, subtotal, count }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be inside CartProvider')
  return ctx
}

export const fmt = (n: number | string | null | undefined) => {
  const val = typeof n === 'string' ? parseFloat(n) : Number(n)
  if (!Number.isFinite(val)) return 'UGX 0'
  return 'UGX ' + val.toLocaleString('en-UG')
}
