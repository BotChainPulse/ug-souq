"use client"

import Link from "next/link"
import { ShoppingCart } from "lucide-react"
import { useCartStore } from "@/store/useCartStore"

export function CartBadge() {
  const items = useCartStore((state) => state.items)
  const count = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)

  return (
    <Link href="/cart" className="relative">
      <ShoppingCart size={24} className="text-neutral-700" />
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-orange-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  )
}
