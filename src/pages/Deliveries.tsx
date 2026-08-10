import { Link } from 'react-router-dom'
import {
  ArrowLeft, Truck, Package, MapPin, CheckCircle2,
  CircleDashed, Clock, Loader2, AlertCircle
} from 'lucide-react'
import { trpc } from '@/providers/trpc'
import { ORANGE } from '../lib/site'
import { getAccount } from '../lib/account'

const statusSteps = [
  { key: 'placed', label: 'Order Placed', icon: Package },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: MapPin },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle2 },
]

function getStatusIndex(status: string) {
  const map: Record<string, number> = {
    placed: 0,
    confirming_payment: 0,
    awaiting_payment: 0,
    paid: 1,
    confirmed: 1,
    processing: 1,
    shipped: 2,
    out_for_delivery: 3,
    delivered: 4,
    cancelled: -1,
  }
  return map[status?.toLowerCase()] ?? 0
}

export default function DeliveriesPage() {
  const account = getAccount()

  const { data: ordersData, isLoading } = trpc.orders.myOrders.useQuery(
    { phone: account?.phone ?? '' },
    { enabled: !!account?.phone },
  )

  const orders = (ordersData as any)?.orders ?? ordersData ?? []

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: ORANGE }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <Link to="/account">
          <ArrowLeft size={24} className="text-gray-700" />
        </Link>
        <h1 className="text-lg font-bold text-gray-900">My Deliveries</h1>
      </div>

      {!account ? (
        <div className="flex flex-col items-center justify-center mt-20 text-gray-400 px-4">
          <Truck size={64} className="mb-4 text-gray-300" />
          <p className="text-lg font-medium">Sign in to see deliveries</p>
          <Link to="/account">
            <button
              className="mt-6 px-6 py-2.5 rounded-full font-bold text-white"
              style={{ backgroundColor: ORANGE }}
            >
              Go to Account
            </button>
          </Link>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-20 text-gray-400 px-4">
          <Truck size={64} className="mb-4 text-gray-300" />
          <p className="text-lg font-medium">No deliveries yet</p>
          <p className="text-sm">Your active orders will appear here</p>
          <Link to="/">
            <button
              className="mt-6 px-6 py-2.5 rounded-full font-bold text-white"
              style={{ backgroundColor: ORANGE }}
            >
              Start Shopping
            </button>
          </Link>
        </div>
      ) : (
        <div className="px-3 mt-3 space-y-3">
          {orders.map((order: any) => {
            const currentStep = getStatusIndex(order.status)
            const isCancelled = order.status?.toLowerCase() === 'cancelled'

            return (
              <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm">
                {/* Order Header */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {order.code || `US-${order.id?.toString().slice(-6).toUpperCase()}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleDateString('en-GB')
                        : ''}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      isCancelled
                        ? 'bg-red-100 text-red-600'
                        : currentStep >= 4
                        ? 'bg-green-100 text-green-600'
                        : 'bg-orange-100 text-orange-600'
                    }`}
                  >
                    {isCancelled
                      ? 'Cancelled'
                      : currentStep >= 4
                      ? 'Delivered'
                      : order.status?.replace(/_/g, ' ') || 'Processing'}
                  </span>
                </div>

                {/* Item */}
                <div className="flex items-center gap-3 mb-4 bg-gray-50 rounded-xl p-3">
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-xl">
                    📦
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {order.items?.[0]?.name || 'Order Item'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {order.items?.length > 1
                        ? `+${order.items.length - 1} more items`
                        : '1 item'}
                    </p>
                  </div>
                  <p className="text-sm font-bold" style={{ color: ORANGE }}>
                    UGX {Number(order.total || 0).toLocaleString()}
                  </p>
                </div>

                {/* Tracking Timeline */}
                {!isCancelled && (
                  <div className="relative px-1">
                    <div className="flex justify-between relative z-10">
                      {statusSteps.map((step, idx) => {
                        const StepIcon = step.icon
                        const isActive = idx <= currentStep
                        const isCurrent = idx === currentStep

                        return (
                          <div key={step.key} className="flex flex-col items-center flex-1">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                                isActive
                                  ? 'text-white border-orange-500'
                                  : 'bg-white border-gray-300 text-gray-300'
                              } ${isCurrent ? 'ring-4 ring-orange-100' : ''}`}
                              style={isActive ? { backgroundColor: ORANGE } : {}}
                            >
                              <StepIcon size={16} />
                            </div>
                            <p
                              className={`text-[10px] mt-1 font-medium text-center leading-tight ${
                                isActive ? 'text-orange-600' : 'text-gray-400'
                              }`}
                            >
                              {step.label}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                    {/* Progress Bar */}
                    <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200 -z-0">
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${Math.min((currentStep / (statusSteps.length - 1)) * 100, 100)}%`,
                          backgroundColor: ORANGE,
                        }}
                      />
                    </div>
                  </div>
                )}

                {isCancelled && (
                  <div className="flex items-center gap-2 text-red-500 bg-red-50 rounded-xl p-3">
                    <AlertCircle size={16} />
                    <p className="text-xs font-medium">This order was cancelled</p>
                  </div>
                )}

                {/* Track Button */}
                <Link to={`/track-order?code=${order.code}`}>
                  <button
                    className="w-full mt-3 py-2.5 text-sm font-bold border rounded-xl hover:bg-orange-50"
                    style={{ color: ORANGE, borderColor: '#fed7aa' }}
                  >
                    Track this order →
                  </button>
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
