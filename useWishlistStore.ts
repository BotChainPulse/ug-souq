import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface WishlistItem {
  id: string | number
  name: string
  price: number
  image?: string
}

interface WishlistState {
  items: WishlistItem[]
  addItem: (product: WishlistItem) => void
  removeItem: (id: string | number) => void
  isInWishlist: (id: string | number) => boolean
  toggleItem: (product: WishlistItem) => void
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product) => {
        const { items } = get()
        if (!items.find((i) => i.id === product.id)) {
          set({ items: [...items, product] })
        }
      },

      removeItem: (id) => {
        set({ items: get().items.filter((i) => i.id !== id) })
      },

      isInWishlist: (id) => {
        return get().items.some((i) => i.id === id)
      },

      toggleItem: (product) => {
        const { items, addItem, removeItem } = get()
        if (items.find((i) => i.id === product.id)) {
          removeItem(product.id)
        } else {
          addItem(product)
        }
      },
    }),
    {
      name: 'ug-souq-wishlist',
    }
  )
)
