"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react"
import { useCartStore } from "@/store/useCartStore"
import { api } from "@/lib/trpc"

export default function CartPage() {
  const { items, updateQuantity, removeItem, getSubtotal, clearCart } = useCartStore()
  const [deliveryMethod, setDeliveryMethod] = useState<"door" | "pickup">("door")
  const [paymentMethod, setPaymentMethod] = useState<"momo" | "airtel" | "cod">("cod")
  const [region, setRegion] = useState("Kampala Region")
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    address: "",
  })
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const placeOrder = api.order.place.useMutation({
    onSuccess: () => {
      clearCart()
      setError("")
      alert("Order placed successfully!")
    },
    onError: (err) => {
      setError(err.message || "Something went wrong — please try again.")
    },
  })

  const deliveryFee = deliveryMethod === "door" ? 4600 : 2900
  const subtotal = getSubtotal()
  const total = subtotal + deliveryFee

  const handlePlaceOrder = () => {
    setError("")
    if (!formData.fullName.trim() || !formData.phone.trim() || !formData.address.trim()) {
      setError("Please fill in all required fields.")
      return
    }
    if (items.length === 0) {
      setError("Your cart is empty.")
      return
    }
    if (total <= deliveryFee) {
      setError("Cart total is invalid. Please check your items.")
      return
    }

    setIsSubmitting(true)
    placeOrder.mutate({
      items: items.map((item) => ({
        productId: String(item.id),
        name: item.name,
        price: Number(item.price),
        quantity: Number(item.quantity),
      })),
      delivery: {
        method: deliveryMethod,
        region,
        address: formData.address,
        fee: deliveryFee,
      },
      payment: {
        method: paymentMethod,
      },
      customer: {
        name: formData.fullName,
        phone: formData.phone,
      },
      total,
    })
  }

  // Cart badge count for header
  const totalItems = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0)

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-6">
        <ShoppingBag size={64} className="text-neutral-300 mb-4" />
        <h2 className="text-xl font-bold text-neutral-700">Your cart is empty</h2>
        <p className="text-neutral-500 mt-1 mb-6">Add some products to get started.</p>
        <Link
          href="/"
          className="px-6 py-3 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 transition-colors"
        >
          Start Shopping
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 px-4 py-4 sticky top-0 z-20">
        <h1 className="text-xl font-bold">Cart ({totalItems})</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Cart Items */}
        <div className="space-y-3">
          {items.map((item) => {
            const qty = Number(item.quantity) || 1
            const price = Number(item.price) || 0
            const itemTotal = price * qty

            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-neutral-200 p-4 flex gap-3"
              >
                <div className="relative w-20 h-20 rounded-lg bg-neutral-100 flex-shrink-0 overflow-hidden">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-300 text-xs">
                      No Image
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm text-neutral-800 line-clamp-2">
                    {item.name}
                  </h3>
                  <p className="text-orange-600 font-bold text-sm mt-1">
                    UGX {price.toLocaleString()}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    {/* Quantity Controls — FIXED NaN */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, qty - 1)}
                        className="w-8 h-8 rounded-full border border-neutral-200 flex items-center justify-center text-neutral-600 hover:bg-neutral-50"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center font-medium text-sm tabular-nums">
                        {qty}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, qty + 1)}
                        className="w-8 h-8 rounded-full border border-neutral-200 flex items-center justify-center text-neutral-600 hover:bg-neutral-50"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-neutral-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    Total: UGX {itemTotal.toLocaleString()}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Checkout Form */}
        <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-4">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <span className="text-orange-600">🛒</span> Checkout
          </h2>

          <div>
            <label className="block text-sm font-medium mb-1">Full name *</label>
            <input
              value={formData.fullName}
              onChange={(e) => setFormData((p) => ({ ...p, fullName: e.target.value }))}
              placeholder="Your full name"
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Phone (MoMo/Airtel) *</label>
            <input
              value={formData.phone}
              onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
              placeholder="07XX..."
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Delivery address *</label>
            <input
              value={formData.address}
              onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
              placeholder="Your address"
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Delivery region *</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option>Kampala Region</option>
              <option>Central Region</option>
              <option>Eastern Region</option>
              <option>Western Region</option>
              <option>Northern Region</option>
            </select>
          </div>

          {/* Delivery Method */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setDeliveryMethod("door")}
              className={`p-3 rounded-xl border text-left text-sm transition-colors ${
                deliveryMethod === "door"
                  ? "border-orange-500 bg-orange-50 text-orange-700"
                  : "border-neutral-200 hover:bg-neutral-50"
              }`}
            >
              <div className="font-medium">🚚 Door delivery</div>
              <div className="text-xs opacity-70 mt-1">
                UGX 4,600 · Delivered today – tomorrow
              </div>
            </button>
            <button
              onClick={() => setDeliveryMethod("pickup")}
              className={`p-3 rounded-xl border text-left text-sm transition-colors ${
                deliveryMethod === "pickup"
                  ? "border-orange-500 bg-orange-50 text-orange-700"
                  : "border-neutral-200 hover:bg-neutral-50"
              }`}
            >
              <div className="font-medium">📦 Pickup station</div>
              <div className="text-xs opacity-70 mt-1">
                UGX 2,900 · Ready for pickup today – tomorrow
              </div>
            </button>
          </div>

          {/* Payment Method */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: "momo", label: "MTN MoMo" },
              { key: "airtel", label: "Airtel Money" },
              { key: "cod", label: "Cash on delivery" },
            ].map((m) => (
              <button
                key={m.key}
                onClick={() => setPaymentMethod(m.key as any)}
                className={`p-3 rounded-xl border text-xs font-medium transition-colors ${
                  paymentMethod === m.key
                    ? "border-orange-500 bg-orange-50 text-orange-700"
                    : "border-neutral-200 hover:bg-neutral-50"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-neutral-200 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600">Subtotal</span>
              <span className="font-medium">UGX {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600">
                Delivery ({region} · {deliveryMethod === "door" ? "door" : "pickup"})
              </span>
              <span className="font-medium">UGX {deliveryFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-orange-600">UGX {total.toLocaleString()}</span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-600 text-sm text-center font-medium">{error}</p>
          )}

          {/* Place Order */}
          <button
            onClick={handlePlaceOrder}
            disabled={isSubmitting || placeOrder.isLoading}
            className="w-full py-4 bg-orange-600 text-white rounded-xl font-bold text-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {placeOrder.isLoading ? "Placing order..." : `Place order — UGX ${total.toLocaleString()}`}
          </button>
        </div>
      </div>
    </div>
  )
}
