import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PackageSearch, Truck, Package, CheckCircle2, CircleDashed, XCircle } from 'lucide-react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { trpc } from '@/providers/trpc'
import { fmt } from '../lib/cart'
import { ORANGE } from '../lib/site'
import { paymentLabel } from '../lib/payStatus'

const STAGES = [
  { key: 'placed', label: 'Order placed', icon: Package },
  { key: 'confirmed', label: 'Confirmed by seller', icon: CheckCircle2 },
  { key: 'on_the_way', label: 'On the way (boda)', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle2 },
] as const

export default function TrackOrder() {
  const [code, setCode] = useState('')
  const [phone, setPhone] = useState('')
  const [search, setSearch] = useState<{ code: string; phone: string } | null>(null)
  const { data: order, isLoading, isFetched } = trpc.orders.track.useQuery(search ?? { code: '', phone: '' }, { enabled: !!search })

  const stageIndex = order ? STAGES.findIndex((s) => s.key === order.status) : -1

  return (
    <div className="min-h-screen bg-[#faf9f7] text-neutral-900 antialiased flex flex-col">
      <Header />
      <div className="mx-auto max-w-xl w-full px-4 py-12 flex-1">
        <h1 className="text-2xl font-extrabold flex items-center gap-2"><PackageSearch size={24} style={{ color: ORANGE }} /> Track your order</h1>
        <p className="text-sm text-neutral-600 mt-1">Enter the order code from checkout plus the phone number you ordered with.</p>

        <div className="mt-5 bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Order code (e.g. US-8F3K2)" className="w-full border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-neutral-500 font-mono tracking-widest" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number (07XX XXX XXX)" className="w-full border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-neutral-500" />
          <button
            disabled={code.length < 4 || phone.length < 9}
            onClick={() => setSearch({ code, phone })}
            className="w-full text-sm font-bold text-white py-3 rounded-full disabled:opacity-40"
            style={{ background: ORANGE }}>
            Track
          </button>
        </div>

        {isLoading && <p className="mt-6 text-center text-sm text-neutral-500">Looking up your order…</p>}

        {isFetched && search && !order && !isLoading && (
          <p className="mt-6 text-center text-sm text-red-600">No order found for that code and phone number. Check both and try again.</p>
        )}

        {order && (
          <div className="mt-6 bg-white rounded-2xl border border-neutral-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-extrabold font-mono tracking-widest">{order.code}</p>
                <p className="text-xs text-neutral-500 mt-0.5">{new Date(order.createdAt).toLocaleString('en-UG')}</p>
              </div>
              <div className="text-right">
                <p className="font-extrabold" style={{ color: ORANGE }}>{fmt(order.total)}</p>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${paymentLabel(order).cls}`}>{paymentLabel(order).text}</span>
              </div>
            </div>

            {order.status === 'cancelled' ? (
              <p className="mt-5 flex items-center gap-2 text-red-600 font-semibold text-sm"><XCircle size={18} /> This order was cancelled. Contact us on WhatsApp for help.</p>
            ) : (
              <div className="mt-6 space-y-4">
                {STAGES.map((s, i) => {
                  const done = i <= stageIndex
                  const Icon = done ? s.icon : CircleDashed
                  return (
                    <div key={s.key} className={`flex items-center gap-3 text-sm ${done ? 'font-semibold' : 'text-neutral-400'}`}>
                      <Icon size={18} className={done ? 'text-green-600' : 'text-neutral-300'} />
                      {s.label}
                      {i === stageIndex && <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full" style={{ background: ORANGE }}>NOW</span>}
                    </div>
                  )
                })}
              </div>
            )}

            <div className="mt-6 border-t border-neutral-100 pt-4 space-y-1.5 text-sm">
              {order.items.map((i) => (
                <div key={i.id} className="flex justify-between"><span className="text-neutral-600">{i.qty}× {i.name}</span><span className="font-medium">{fmt(i.price * i.qty)}</span></div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 bg-orange-50 border border-orange-100 rounded-2xl p-5 text-sm text-neutral-700">
          Lost your order code? <Link to="/account" className="font-bold" style={{ color: ORANGE }}>Open My Account</Link> — all your orders are saved there automatically.
        </div>
      </div>
      <Footer />
    </div>
  )
}
