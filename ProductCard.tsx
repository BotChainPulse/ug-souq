"use client"

import Image from "next/image"
import Link from "next/link"
import { Heart, ShoppingCart } from "lucide-react"
import { useCartStore } from "@/store/useCartStore"
import { useWishlistStore } from "@/store/useWishlistStore"

interface ProductCardProps {
  id: string | number
  name: string
  price: number
  image?: string
  slug?: string
}

export function ProductCard({ id, name, price, image, slug }: ProductCardProps) {
  const { addItem } = useCartStore()
  const { isInWishlist, toggleItem } = useWishlistStore()
  const inWishlist = isInWishlist(id)

  const handleAddToCart = () => {
    addItem({
      id,
      name,
      price: Number(price) || 0,
      image,
    })
  }

  return (
    <div className="group relative bg-white rounded-xl border border-neutral-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Wishlist Heart Button */}
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          toggleItem({ id, name, price: Number(price) || 0, image })
        }}
        className={`absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
          inWishlist
            ? "bg-red-500 text-white"
            : "bg-white/90 text-neutral-400 hover:text-red-500 hover:bg-white"
        }`}
        aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
      >
        <Heart size={18} fill={inWishlist ? "currentColor" : "none"} />
      </button>

      {/* Product Image */}
      <Link href={slug ? `/product/${slug}` : `#`} className="block">
        <div className="relative aspect-square bg-neutral-100">
          {image ? (
            <Image
              src={image}
              alt={name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-300">
              No Image
            </div>
          )}
        </div>
      </Link>

      {/* Product Info */}
      <div className="p-3">
        <Link href={slug ? `/product/${slug}` : `#`}>
          <h3 className="font-medium text-sm text-neutral-800 line-clamp-2 min-h-[2.5rem]">
            {name}
          </h3>
        </Link>
        <div className="flex items-center justify-between mt-2">
          <span className="text-orange-600 font-bold text-sm">
            UGX {Number(price).toLocaleString()}
          </span>
          <button
            onClick={handleAddToCart}
            className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center hover:bg-orange-100 transition-colors"
            aria-label="Add to cart"
          >
            <ShoppingCart size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
