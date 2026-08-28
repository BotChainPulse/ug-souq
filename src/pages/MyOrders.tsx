import { useState } from 'react'
import { Link } from 'react-router'
import { Package, Smartphone, Truck, CircleCheckBig, Clock, XCircle, ShoppingCart } from 'lucide-react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { trpc } from '@/providers/trpc'
import { fmt } from '../lib/cart'
import { ORANGE } from '../lib/site'
import { getAccount } from '../lib/account'

const SAVED_PHONE_KEY = 'ugsouq_myphone'

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
    placed: { cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Clock size={12} />, label: 'Placed' },
    confirmed: { cls: 'bg-sky-50 text-sky-700 border-sky-200', icon: <CircleCheckBig size={12} />, label: 'Confirmed' },
    on_the_way: { cls: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: <Truck size={12} />, label: 'On the way' },
    delivered: { cls: 'bg-green-50 text-green-700 border-green-200', icon: <CircleCheckBig size={12} />, label: 'Delivered' },
    cancelled: { cls: 'bg-red-50 text-red-700 border-red-200', icon: <XCircle size={12} />, label: 'Cancelled' },
  }
  const m = map[status] ?? map.placed
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${m.cls}`}>
      {m.icon} {m.label}
    </span>
  )
}

export default function MyOrders() {
  const savedPhone = localStorage.getItem(SAVED_PHONE_KEY) ?? getAccount()?.phone ?? ''
  const [phone, setPhone] = useState(savedPhone)
  const [searched, setSearched] = useState(savedPhone)
  const orders = trpc.orders.byPhone.useQuery(
    { phone: searched },
    { enabled: searched.trim().length >= 9, retry: false },
  )

  const search = () => {
    const p = phone.trim()
    setSearched(p)
    if (p.length >= 9) localStorage.setItem(SAVED_PHONE_KEY, p)
  }

  return (
    <div className="min-h-screen bg-[#faf9f7] text-neutral-900 antialiased">
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
          <Package size={26} style={{ color: ORANGE }} /> My Orders
        </h1>
        <p className="mt-2 text-neutral-600">
          Enter the phone number you order with — we'll remember it on this device and show all your orders here.
        </p>

        <div className="mt-6 flex gap-2">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder="07XX XXX XXX"
            className="flex-1 h-12 rounded-xl border border-neutral-300 px-4 text-sm outline-none focus:border-orange-500 bg-white"
          />
          <button
            onClick={search}
            disabled={phone.trim().length < 9}
            className="h-12 px-6 rounded-xl text-sm font-bold text-white disabled:opacity-40 inline-flex items-center gap-2"
            style={{ background: ORANGE }}
          >
            <Smartphone size={16} /> View my orders
          </button>
        </div>

        {searched && orders.isLoading && <p className="mt-6 text-sm text-neutral-500">Loading your orders…</p>}

        {searched && orders.data && orders.data.length === 0 && (
          <div className="mt-8 bg-white rounded-2xl border border-neutral-200 p-10 text-center">
            <ShoppingCart size={28} className="mx-auto text-neutral-300" />
            <h3 className="mt-3 font-extrabold">No orders yet for {searched}</h3>
            <p className="mt-1 text-sm text-neutral-500">
              When you place an order with this number, it will appear here.{' '}
              <Link to="/" className="font-bold underline" style={{ color: ORANGE }}>Start shopping →</Link>
            </p>
          </div>
        )}

        {orders.data && orders.data.length > 0 && (
          <div className="mt-6 space-y-4">
            {orders.data.map((o) => (
              <div key={o.id} className="bg-white rounded-2xl border border-neutral-200 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-extrabold tracking-widest" style={{ color: ORANGE }}>{o.code}</span>
                    <span className="ml-3 text-xs text-neutral-500">
                      {o.createdAt ? new Date(o.createdAt).toLocaleString('en-UG', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}
                    </span>
                  </div>
                  <StatusPill status={o.status} />
                </div>
                <div className="mt-3 divide-y divide-neutral-100 text-sm">
                  {Array.isArray(o.items) && o.items.map((i) => (
                    <div key={i.id} className="py-1.5 flex justify-between gap-3">
                      <span className="text-neutral-700">{i.qty} × {i.name}</span>
                      <span className="font-semibold whitespace-nowrap">{fmt(i.price * i.qty)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-neutral-100 flex justify-between text-sm">
                  <span className="text-neutral-500">Delivery: {fmt(o.deliveryFee)} · {o.paymentMethod === 'mtn_momo' ? 'MTN MoMo' : o.paymentMethod === 'airtel_money' ? 'Airtel Money' : 'Cash on delivery'}</span>
                  <span className="font-extrabold">{fmt(o.total)}</span>
                </div>
                <p className="mt-2 text-xs text-neutral-500">Deliver to: {o.address}</p>
              </div>
            ))}
          </div>
        )}

        <p className="mt-8 text-center text-sm text-neutral-500">
          Have your order code instead? <Link to="/track" className="font-bold underline" style={{ color: ORANGE }}>Track a specific order →</Link>
        </p>
      </div>
      <Footer />
    </div>
  )
}
