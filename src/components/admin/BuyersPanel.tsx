import { sameRegistrationDay } from '../../lib/servicePolicy'
import { useState } from 'react'
import { trpc } from '../../providers/trpc'
import { fmt } from '../../lib/cart'
import { Search, Phone, MapPin, ShoppingBag, ChevronDown, ChevronUp, Package } from 'lucide-react'

export default function BuyersPanel({ adminKey }: { adminKey: string }) {
  const [todayOnly, setTodayOnly] = useState(false)
  const [search, setSearch] = useState('')
  const [expandedPhone, setExpandedPhone] = useState<string | null>(null)

  const { data, isLoading, error, refetch } = trpc.admin.customers.useQuery({ key: adminKey, search: search || undefined })
  const { data: customerOrders } = trpc.admin.customerOrders.useQuery(
    { key: adminKey, phone: expandedPhone ?? '' },
    { enabled: !!expandedPhone }
  )

  const allCustomers = data ?? []
  const customers = todayOnly ? allCustomers.filter(c => sameRegistrationDay(c.createdAt)) : allCustomers

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-neutral-200 p-4">
        <h2 className="font-bold text-lg">Buyers / Customers</h2>
        <p className="text-xs text-neutral-500 mt-1">{customers.length} registered buyer accounts. Includes buyers with zero orders; no administrator approval is needed.</p>
      </div>

      <div className="flex gap-2"><button onClick={() => setTodayOnly(!todayOnly)} aria-pressed={todayOnly} className="rounded-lg border px-4 py-2 bg-white">{todayOnly ? 'Show all registrations' : 'Registered today (Kampala)'}</button><button onClick={() => refetch()} className="rounded-lg border px-4 py-2 bg-white">Refresh</button></div>
      {error && <p role="alert" className="text-red-700">Customer records could not load: {error.message}</p>}
      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 pl-10 pr-4 py-2.5 text-sm outline-none focus:border-neutral-500"
        />
      </div>

      {isLoading && <p className="text-neutral-500">Loading customers...</p>}

      {customers.length === 0 && !isLoading && !error && (
        <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center">
          <p className="text-neutral-500">No customers found.</p>
        </div>
      )}

      <div className="space-y-3">
        {customers.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div
              className="p-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-neutral-50"
              onClick={() => setExpandedPhone(expandedPhone === c.phone ? null : c.phone)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neutral-200 grid place-items-center text-neutral-500">
                  <ShoppingBag size={18} />
                </div>
                <div>
                  <p className="font-bold">{c.name}</p>
                  <p className="text-xs text-neutral-500 flex items-center gap-1">
                    <Phone size={10} /> {c.phone}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">Registered {new Date(c.createdAt).toLocaleString('en-UG', { timeZone: 'Africa/Kampala' })} (Kampala time)</p>
                  {c.location && (
                    <p className="text-xs text-neutral-400 flex items-center gap-1 mt-0.5">
                      <MapPin size={10} /> {c.location}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-extrabold">{fmt(c.totalSpent)}</p>
                  <p className="text-xs text-neutral-500">{c.orderCount} order(s)</p>
                </div>
                {expandedPhone === c.phone ? <ChevronUp size={18} className="text-neutral-400" /> : <ChevronDown size={18} className="text-neutral-400" />}
              </div>
            </div>

            {expandedPhone === c.phone && customerOrders && (
              <div className="border-t border-neutral-100 p-4 bg-neutral-50">
                <h4 className="text-xs font-bold text-neutral-500 uppercase mb-2">Order History</h4>
                {customerOrders.length === 0 ? (
                  <p className="text-sm text-neutral-400">No orders found.</p>
                ) : (
                  <div className="space-y-2">
                    {customerOrders.map((o) => (
                      <div key={o.id} className="bg-white rounded-lg border border-neutral-200 p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Package size={14} className="text-neutral-400" />
                            <span className="font-mono text-xs font-bold">{o.code}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${o.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' : o.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                              {o.status}
                            </span>
                          </div>
                          <span className="font-bold text-sm">{fmt(o.total)}</span>
                        </div>
                        <p className="text-xs text-neutral-400 mt-1">{new Date(o.createdAt).toLocaleString('en-UG')}</p>
                        {o.items && o.items.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {o.items.map((it, idx: number) => (
                              <p key={idx} className="text-xs text-neutral-600">
                                {it.qty} × {it.name} — {fmt(it.price * it.qty)}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
