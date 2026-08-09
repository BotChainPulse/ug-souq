import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Minus, Plus, Trash2, ShoppingCart, CircleCheckBig, Wallet, Truck, Package } from 'lucide-react'
import { DELIVERY_ZONES, PICKUP_POINTS } from '../lib/delivery'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { fmt, useCart } from '../lib/cart'
import { trpc } from '@/providers/trpc'
import { ORANGE } from '../lib/site'
import { getAccount, saveAccount } from '../lib/account'
import { MOMO_MERCHANT, AIRTEL_MERCHANT } from '../lib/site'

export default function Cart() {
  const { items, setQty, remove, clear, subtotal, count } = useCart()
  const acc = getAccount()
  const [form, setForm] = useState({ name: acc?.name ?? '', phone: acc?.phone ?? '', address: acc?.location ?? '', payment: 'mtn_momo' as 'mtn_momo' | 'airtel_money' | 'cash' })
  const createOrder = trpc.orders.create.useMutation()
  const submitPayment = trpc.orders.submitPayment.useMutation()
  const [placed, setPlaced] = useState<{ code: string; total: number; phone: string; payment: 'mtn_momo' | 'airtel_money' | 'cash' } | null>(null)
  const [payRef, setPayRef] = useState('')
  const [paySent, setPaySent] = useState(false)

  const [zoneId, setZoneId] = useState('kampala')
  const [shipMethod, setShipMethod] = useState<'door' | 'pickup'>('door')
  const [stationId, setStationId] = useState('')
  const zone = DELIVERY_ZONES.find((z) => z.id === zoneId) ?? DELIVERY_ZONES[0]
  const stations = PICKUP_POINTS[zone.id] ?? []
  const station = stations.find((s) => s.id === stationId)
  const deliveryFee = items.length ? (shipMethod === 'door' ? zone.doorFee : zone.pickupFee) : 0
  const total = subtotal + deliveryFee
  const valid =
    form.name.length >= 2 &&
    form.phone.length >= 9 &&
    (shipMethod === 'pickup' ? !!station : form.address.length >= 5)

  const submit = async () => {
    const delivery =
      shipMethod === 'pickup'
        ? `Pickup: ${station!.name} (${station!.detail}) — ${zone.label}`
        : `${form.address} — ${zone.label}, door delivery`
    const order = await createOrder.mutateAsync({
      customerName: form.name,
      phone: form.phone,
      address: delivery,
      paymentMethod: form.payment,
      items: items.map((i) => ({ itemType: i.itemType, itemId: i.itemId, name: i.name, price: i.price, qty: i.qty })),
      deliveryFee,
    })
    // The buyer owns an account: remember details on this device (server auto-saves too)
    saveAccount({ name: form.name.trim(), phone: form.phone.replace(/[\s-]+/g, ''), location: form.address.trim() })
    setPlaced({ code: order.code, total: order.total, phone: form.phone.replace(/[\s-]+/g, ''), payment: form.payment })
    clear()
  }

  return (
    <div className="min-h-screen bg-[#faf9f7] text-neutral-900 antialiased">
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-10">
        {placed ? (
        <>
          <div className="bg-white rounded-2xl border border-neutral-200 p-10 text-center">
            <CircleCheckBig size={52} className="mx-auto text-green-600" />
            <h1 className="mt-4 text-2xl font-extrabold">Order placed!</h1>
            <p className="mt-2 text-neutral-600">Your order code is</p>
            <p className="mt-1 text-3xl font-extrabold tracking-widest" style={{ color: ORANGE }}>{placed.code}</p>
            <p className="mt-3 text-sm text-neutral-600">Total: <b>{fmt(placed.total)}</b> · We'll confirm on WhatsApp/SMS shortly.</p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/account" className="px-6 py-3 rounded-full text-sm font-bold text-white" style={{ background: ORANGE }}>View my account & orders</Link>
              <Link to="/" className="px-6 py-3 rounded-full text-sm font-bold border border-neutral-300 hover:border-neutral-500">Continue shopping</Link>
            </div>
          </div>
        {placed.payment !== 'cash' && (
          <div className="mt-4 bg-white rounded-2xl border border-neutral-200 p-6 sm:p-8 text-left max-w-lg mx-auto">
            {(() => {
              const m = placed.payment === 'mtn_momo' ? MOMO_MERCHANT : AIRTEL_MERCHANT
              const label = placed.payment === 'mtn_momo' ? 'MTN MoMo' : 'Airtel Money'
              return paySent ? (
                <div className="text-center">
                  <CircleCheckBig size={40} className="mx-auto text-green-600" />
                  <h2 className="mt-3 font-extrabold text-lg">Payment received for confirmation</h2>
                  <p className="mt-1.5 text-sm text-neutral-600">We're verifying your {label} transaction ID. Once confirmed, your order moves to <b>Confirmed</b> and delivery starts. You can watch it in My Account.</p>
                </div>
              ) : (
                <>
                  <h2 className="font-extrabold text-lg">Pay {fmt(placed.total)} with {label}</h2>
                  <ol className="mt-3 space-y-2 text-sm text-neutral-700 list-decimal list-inside">
                    <li>Open {label} on your phone ({placed.payment === 'mtn_momo' ? '*165#' : '*185#'})</li>
                    <li>Send <b>{fmt(placed.total)}</b> to <b>{m.number}</b> ({m.name})</li>
                    <li>Use order code <b className="font-mono">{placed.code}</b> as the reason/reference</li>
                    <li>Copy the <b>transaction ID</b> from the confirmation SMS and paste it below</li>
                  </ol>
                  <input
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    placeholder="Transaction ID (from the SMS)"
                    className="mt-4 w-full border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-neutral-500 font-mono"
                  />
                  <button
                    disabled={payRef.trim().length < 6 || submitPayment.isPending}
                    onClick={async () => {
                      try {
                        await submitPayment.mutateAsync({ code: placed.code, phone: placed.phone, ref: payRef.trim() })
                        setPaySent(true)
                      } catch { /* error shown below */ }
                    }}
                    className="mt-3 w-full text-sm font-bold text-white py-3 rounded-full disabled:opacity-40"
                    style={{ background: ORANGE }}>
                    {submitPayment.isPending ? 'Submitting…' : "I've sent the money"}
                  </button>
                  {submitPayment.isError && <p className="mt-2 text-sm text-red-600 text-center">{submitPayment.error.message}</p>}
                  <p className="mt-3 text-xs text-neutral-500 text-center">Prefer to pay cash? Tell us on WhatsApp and we'll switch the order.</p>
                </>
              )
            })()}
          </div>
        )}
        </>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingCart size={44} className="mx-auto text-neutral-300" />
            <h1 className="mt-4 text-xl font-extrabold">Your cart is empty</h1>
            <p className="text-neutral-500 text-sm mt-1">Add products or order food to get started.</p>
            <div className="mt-5 flex justify-center gap-3">
              <Link to="/" className="text-sm font-bold text-white px-6 py-3 rounded-full" style={{ background: ORANGE }}>Shop Flash Sale</Link>
              <Link to="/food" className="text-sm font-bold px-6 py-3 rounded-full border border-neutral-300">Order food</Link>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold">Cart ({count})</h1>
            <div className="mt-5 space-y-3">
              {items.map((i) => (
                <div key={`${i.itemType}-${i.itemId}`} className="bg-white rounded-2xl border border-neutral-200 p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{i.name}</p>
                    <p className="text-sm font-extrabold mt-0.5" style={{ color: ORANGE }}>{fmt(i.price)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setQty(i.itemType, i.itemId, i.qty - 1)} className="w-8 h-8 rounded-full border border-neutral-300 grid place-items-center"><Minus size={14} /></button>
                    <span className="w-6 text-center font-bold text-sm">{i.qty}</span>
                    <button onClick={() => setQty(i.itemType, i.itemId, i.qty + 1)} className="w-8 h-8 rounded-full border border-neutral-300 grid place-items-center"><Plus size={14} /></button>
                  </div>
                  <button onClick={() => remove(i.itemType, i.itemId)} className="p-2 text-neutral-400 hover:text-red-600"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>

            {/* Checkout */}
            <div className="mt-8 bg-white rounded-2xl border border-neutral-200 p-6">
              <h2 className="font-extrabold text-lg flex items-center gap-2"><Wallet size={20} style={{ color: ORANGE }} /> Checkout</h2>
              <div className="mt-4 grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Full name *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-neutral-500" placeholder="Your name" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Phone (MoMo/Airtel) *</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-neutral-500" placeholder="07XX XXX XXX" />
                </div>
                {shipMethod === 'door' && (
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold mb-1.5">Delivery address *</label>
                    <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-neutral-500" placeholder="e.g. Ntinda, near Capital Shoppers" />
                  </div>
                )}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold mb-1.5">Delivery region *</label>
                  <select value={zoneId} onChange={(e) => { setZoneId(e.target.value); setStationId('') }} className="w-full border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-neutral-500 bg-white">
                    {DELIVERY_ZONES.map((z) => <option key={z.id} value={z.id}>{z.label}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setShipMethod('door')}
                    className={`rounded-xl border-2 p-3 text-left transition-all ${shipMethod === 'door' ? 'border-orange-500 bg-orange-50' : 'border-neutral-200 hover:border-neutral-300'}`}>
                    <p className="text-xs sm:text-sm font-bold flex items-center gap-1.5"><Truck size={15} /> Door delivery</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{fmt(zone.doorFee)} · {zone.doorEta}</p>
                  </button>
                  <button type="button" onClick={() => setShipMethod('pickup')}
                    className={`rounded-xl border-2 p-3 text-left transition-all ${shipMethod === 'pickup' ? 'border-orange-500 bg-orange-50' : 'border-neutral-200 hover:border-neutral-300'}`}>
                    <p className="text-xs sm:text-sm font-bold flex items-center gap-1.5"><Package size={15} /> Pickup station</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{fmt(zone.pickupFee)} · {zone.pickupEta}</p>
                  </button>
                </div>
                {shipMethod === 'pickup' && (
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold mb-1.5">Select pickup station *</label>
                    <div className="space-y-2">
                      {stations.map((s) => (
                        <button key={s.id} type="button" onClick={() => setStationId(s.id)}
                          className={`w-full rounded-xl border-2 p-3 text-left transition-all ${stationId === s.id ? 'border-orange-500 bg-orange-50' : 'border-neutral-200 hover:border-neutral-300'}`}>
                          <p className="text-sm font-bold flex items-center gap-1.5">
                            <span className={`w-3.5 h-3.5 rounded-full border-2 inline-block ${stationId === s.id ? 'border-orange-500 bg-orange-500' : 'border-neutral-300'}`} />
                            {s.name}
                          </p>
                          <p className="text-xs text-neutral-500 mt-0.5 ml-5">{s.detail}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {([['mtn_momo', 'MTN MoMo'], ['airtel_money', 'Airtel Money'], ['cash', 'Cash on delivery']] as const).map(([v, l]) => (
                  <button key={v} onClick={() => setForm({ ...form, payment: v })}
                    className={`rounded-xl border-2 py-3 text-xs sm:text-sm font-bold transition-all ${form.payment === v ? 'border-orange-500 bg-orange-50' : 'border-neutral-200 hover:border-neutral-300'}`}>
                    {l}
                  </button>
                ))}
              </div>
              <div className="mt-5 space-y-1.5 text-sm border-t border-neutral-100 pt-4">
                <div className="flex justify-between text-neutral-600"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
                <div className="flex justify-between text-neutral-600"><span>Delivery ({zone.label} · {shipMethod === 'door' ? 'door' : 'pickup'})</span><span>{fmt(deliveryFee)}</span></div>
                <div className="flex justify-between font-extrabold text-base"><span>Total</span><span style={{ color: ORANGE }}>{fmt(total)}</span></div>
              </div>
              <button
                disabled={!valid || createOrder.isPending}
                onClick={submit}
                className="mt-5 w-full text-sm font-bold text-white py-3.5 rounded-full disabled:opacity-40"
                style={{ background: ORANGE }}>
                {createOrder.isPending ? 'Placing order…' : `Place order — ${fmt(total)}`}
              </button>
              {createOrder.isError && <p className="mt-2 text-sm text-red-600 text-center">Something went wrong — please try again.</p>}
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  )
}
