import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: string | number
  name: string
  price: number
  image?: string
  quantity: number
}

interface CartState {
  items: CartItem[]
  addItem: (product: Omit<CartItem, 'quantity'>) => void
  removeItem: (id: string | number) => void
  updateQuantity: (id: string | number, quantity: number) => void
  clearCart: () => void
  getTotalItems: () => number
  getSubtotal: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product) => {
        const { items } = get()
        const existing = items.find((i) => i.id === product.id)
        if (existing) {
          set({
            items: items.map((i) =>
              i.id === product.id
                ? { ...i, quantity: (Number(i.quantity) || 0) + 1 }
                : i
            ),
          })
        } else {
          set({
            items: [...items, { ...product, quantity: 1 }],
          })
        }
      },

      removeItem: (id) => {
        set({ items: get().items.filter((i) => i.id !== id) })
      },

      updateQuantity: (id, quantity) => {
        const qty = Number(quantity)
        if (!Number.isFinite(qty) || qty < 1) {
          // Remove item if quantity is invalid or zero
          set({ items: get().items.filter((i) => i.id !== id) })
          return
        }
        set({
          items: get().items.map((i) =>
            i.id === id ? { ...i, quantity: qty } : i
          ),
        })
      },

      clearCart: () => set({ items: [] }),

      getTotalItems: () => {
        return get().items.reduce(
          (sum, item) => sum + (Number(item.quantity) || 0),
          0
        )
      },

      getSubtotal: () => {
        return get().items.reduce((sum, item) => {
          const price = Number(item.price) || 0
          const qty = Number(item.quantity) || 0
          return sum + price * qty
        }, 0)
      },
    }),
    {
      name: 'ug-souq-cart',
    }
  )
)
