import { Link } from 'react-router'
import { FOOD_DELIVERY_FEE_NOTICE, FOOD_DELIVERY_TIMING } from '../lib/delivery'

export default function FoodDeliveryNotice({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return <div className="space-y-1 text-xs text-neutral-600">
      <p>{FOOD_DELIVERY_FEE_NOTICE}</p>
      <p>{FOOD_DELIVERY_TIMING}</p>
    </div>
  }

  return <aside aria-label="Food delivery information" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-neutral-800">
    <p className="font-bold">{FOOD_DELIVERY_FEE_NOTICE}</p>
    <p className="mt-2">Delivery fees use the region and delivery option you choose at checkout.</p>
    <p className="mt-2">Confirm food availability, the delivery area and timing with UGSouq before ordering. No fixed food delivery time is confirmed here.</p>
    <Link to="/support" className="mt-3 inline-block font-bold text-emerald-800 underline">Confirm food delivery with support</Link>
  </aside>
}
