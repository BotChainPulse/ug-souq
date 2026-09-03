import { useState } from 'react'
import { Link } from 'react-router'
import { Minus, Plus, Trash2, ShoppingCart, Wallet, Truck, Package, BadgeCheck, LockKeyhole, ShieldCheck, ChevronRight } from 'lucide-react'
import { DELIVERY_ZONES, PICKUP_POINTS } from '../lib/delivery'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { fmt, useCart } from '../lib/cart'
import { trpc } from '@/providers/trpc'
import { ORANGE } from '../lib/site'
import { getAccount, saveAccount } from '../lib/account'
import OrderConfirmation from '../components/OrderConfirmation'

export default function Cart() {
  const { items, setQty, remove, clear, subtotal, count } = useCart()
  const acc = getAccount()
  const [form, setForm] = useState({
    name: acc?.name ?? '',
    phone: acc?.phone ?? '',
    email: '',
    address: acc?.location ?? '',
    payment: 'flutterwave' as 'flutterwave' | 'cash',
  })
  const createOrder = trpc.orders.create.useMutation()
  const [placed, setPlaced] = useState<{
    code: string
    total: number
    phone: string
    payment: 'cash'
  } | null>(null)

  const [zoneId, setZoneId] = useState('kampala')
  const [shipMethod, setShipMethod] = useState<'door' | 'pickup'>('door')
  const [stationId, setStationId] = useState('')
  const { data: plus } = trpc.plus.status.useQuery(
    { phone: acc?.phone ?? '' },
    { enabled: !!acc },
  )
  const zone = DELIVERY_ZONES.find((z) => z.id === zoneId) ?? DELIVERY_ZONES[0]
  const stations = PICKUP_POINTS[zone.id] ?? []
  const station = stations.find((s) => s.id === stationId)
  const standardDeliveryFee = items.length
    ? shipMethod === 'door'
      ? zone.doorFee
      : zone.pickupFee
    : 0
  const activePlusForCheckout = Boolean(
    plus?.membership &&
      acc &&
      form.phone.replace(/[\s-]+/g, '') === acc.phone.replace(/[\s-]+/g, ''),
  )
  const deliveryFee = activePlusForCheckout ? 0 : standardDeliveryFee
  const total = subtotal + deliveryFee
  const valid =
    form.name.length >= 2 &&
    form.phone.length >= 9 &&
    (form.payment === 'cash' || /^\S+@\S+\.\S+$/.test(form.email)) &&
    (shipMethod === 'pickup' ? !!station : form.address.length >= 5)

  const submit = async () => {
    const delivery =
      shipMethod === 'pickup'
        ? `Pickup: ${station!.name} (${station!.detail}) — ${zone.label}`
        : `${form.address} — ${zone.label}, door delivery`

    const order = await createOrder.mutateAsync({
      customerName: form.name,
      phone: form.phone,
      email: form.payment === 'flutterwave' ? form.email : undefined,
      address: delivery,
      paymentMethod: form.payment,
      deliveryZone: zoneId as 'kampala' | 'upcountry',
      deliveryMethod: shipMethod,
      items: items.map((i) => ({
        itemType: i.itemType === 'menu_item' ? 'menu_item' as const : i.itemType === 'listing' ? 'listing' as const : 'product' as const,
        itemId: Number(i.itemId),
        qty: i.qty,
      })),
    })

    saveAccount({
      name: form.name.trim(),
      phone: form.phone.replace(/[\s-]+/g, ''),
      location: form.address.trim(),
    })
    clear()
    if (order.checkoutUrl) {
      window.location.assign(order.checkoutUrl)
      return
    }
    setPlaced({
      code: order.order.code,
      total: order.order.total,
      phone: form.phone.replace(/[\s-]+/g, ''),
      payment: 'cash',
    })
  }

  return (
    <div className="min-h-screen bg-[#f7f7f8] text-neutral-900 antialiased">
      <Header />

      <main className="mx-auto max-w-6xl px-4 py-7 sm:py-10">
        {placed ? (
          <OrderConfirmation placed={placed} />
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <ShoppingCart size={44} className="mx-auto text-neutral-300" />
            <h1 className="mt-4 text-xl font-extrabold">Your cart is empty</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Add products or order food to get started.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <Link
                to="/"
                className="rounded-full px-6 py-3 text-sm font-bold text-white"
                style={{ background: ORANGE }}
              >
                Shop Flash Sale
              </Link>
              <Link
                to="/food"
                className="rounded-full border border-neutral-300 px-6 py-3 text-sm font-bold"
              >
                Order food
              </Link>
            </div>
          </div>
        ) : (
          <section>
            <div className="flex items-end justify-between gap-4 border-b border-neutral-200 pb-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-600">
                  Secure checkout
                </p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
                  Your shopping bag <span className="text-neutral-400">({count})</span>
                </h1>
              </div>
              <Link to="/catalog" className="text-sm font-bold text-orange-600">
                Continue shopping
              </Link>
            </div>

            <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-xl border border-neutral-200 bg-white text-center text-xs font-bold sm:text-sm">
              <div className="bg-orange-50 py-3 text-orange-700">1. Bag</div>
              <div className="py-3 text-neutral-400">2. Delivery & payment</div>
              <div className="py-3 text-neutral-400">3. Confirmation</div>
            </div>

            <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="space-y-5">
                <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
                  <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
                    <h2 className="font-extrabold">Items in your bag</h2>
                    <span className="text-xs text-neutral-500">
                      Prices include VAT where applicable
                    </span>
                  </div>

                  <div className="divide-y divide-neutral-100">
                    {items.map((i) => (
                      <div
                        key={`${i.itemType}-${i.itemId}`}
                        className="flex items-center gap-4 p-4 sm:p-5"
                      >
                        <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-neutral-50">
                          {i.image ? (
                            <img
                              src={i.image}
                              alt=""
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <Package size={25} className="text-neutral-300" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-bold">{i.name}</p>
                          {i.sellerName && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-neutral-500">
                              <BadgeCheck size={13} className="text-sky-600" /> Sold by{' '}
                              {i.sellerName}
                            </p>
                          )}
                          <p className="mt-2 text-base font-extrabold" style={{ color: ORANGE }}>
                            {fmt(i.price)}
                          </p>
                          <p className="text-[11px] text-neutral-400">Price per item</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setQty(i.itemType, i.itemId, i.qty - 1)}
                            className="grid h-8 w-8 place-items-center rounded-full border border-neutral-300"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-6 text-center text-sm font-bold">{i.qty}</span>
                          <button
                            type="button"
                            onClick={() => setQty(i.itemType, i.itemId, i.qty + 1)}
                            className="grid h-8 w-8 place-items-center rounded-full border border-neutral-300"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => remove(i.itemType, i.itemId)}
                          className="p-2 text-neutral-400 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
                  <h2 className="flex items-center gap-2 text-lg font-extrabold">
                    <Wallet size={20} style={{ color: ORANGE }} /> Checkout
                  </h2>
                  <p className="mt-1 text-xs text-neutral-500">
                    Choose where to receive your order, then confirm how you would like to pay.
                  </p>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold">Full name *</label>
                      <input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-neutral-500"
                        placeholder="Your name"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold">
                        Phone (MoMo/Airtel) *
                      </label>
                      <input
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-neutral-500"
                        placeholder="07XX XXX XXX"
                      />
                    </div>

                    {form.payment === 'flutterwave' && (
                      <div className="sm:col-span-2">
                        <label className="mb-1.5 block text-sm font-semibold">Email for payment receipt *</label>
                        <input
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          className="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-neutral-500"
                          placeholder="you@example.com"
                          autoComplete="email"
                        />
                      </div>
                    )}

                    {shipMethod === 'door' && (
                      <div className="sm:col-span-2">
                        <label className="mb-1.5 block text-sm font-semibold">
                          Delivery address *
                        </label>
                        <input
                          value={form.address}
                          onChange={(e) => setForm({ ...form, address: e.target.value })}
                          className="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-neutral-500"
                          placeholder="e.g. Ntinda, near Capital Shoppers"
                        />
                      </div>
                    )}

                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-sm font-semibold">Delivery region *</label>
                      <select
                        value={zoneId}
                        onChange={(e) => {
                          setZoneId(e.target.value)
                          setStationId('')
                        }}
                        className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-neutral-500"
                      >
                        {DELIVERY_ZONES.map((z) => (
                          <option key={z.id} value={z.id}>
                            {z.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                      <button
                        type="button"
                        onClick={() => setShipMethod('door')}
                        className={`rounded-xl border-2 p-3 text-left transition-all ${
                          shipMethod === 'door'
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <p className="flex items-center gap-1.5 text-xs font-bold sm:text-sm">
                          <Truck size={15} /> Door delivery
                        </p>
                        <p className="mt-0.5 text-xs text-neutral-500">
                          {activePlusForCheckout ? 'Free with Plus' : fmt(zone.doorFee)} ·{' '}
                          {zone.doorEta}
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShipMethod('pickup')}
                        className={`rounded-xl border-2 p-3 text-left transition-all ${
                          shipMethod === 'pickup'
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <p className="flex items-center gap-1.5 text-xs font-bold sm:text-sm">
                          <Package size={15} /> Pickup station
                        </p>
                        <p className="mt-0.5 text-xs text-neutral-500">
                          {activePlusForCheckout ? 'Free with Plus' : fmt(zone.pickupFee)} ·{' '}
                          {zone.pickupEta}
                        </p>
                      </button>
                    </div>

                    {shipMethod === 'pickup' && (
                      <div className="sm:col-span-2">
                        <label className="mb-1.5 block text-sm font-semibold">
                          Select pickup station *
                        </label>
                        <div className="space-y-2">
                          {stations.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setStationId(s.id)}
                              className={`w-full rounded-xl border-2 p-3 text-left transition-all ${
                                stationId === s.id
                                  ? 'border-orange-500 bg-orange-50'
                                  : 'border-neutral-200 hover:border-neutral-300'
                              }`}
                            >
                              <p className="flex items-center gap-1.5 text-sm font-bold">
                                <span
                                  className={`inline-block h-3.5 w-3.5 rounded-full border-2 ${
                                    stationId === s.id
                                      ? 'border-orange-500 bg-orange-500'
                                      : 'border-neutral-300'
                                  }`}
                                />
                                {s.name}
                              </p>
                              <p className="ml-5 mt-0.5 text-xs text-neutral-500">{s.detail}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 border-t border-neutral-100 pt-5">
                    <h3 className="text-sm font-extrabold">Choose payment method</h3>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {(
                        [
                          ['flutterwave', 'Mobile money / card'],
                          ['cash', 'Cash on delivery'],
                        ] as const
                      ).map(([v, l]) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setForm({ ...form, payment: v })}
                          className={`rounded-xl border-2 p-3 text-left text-xs font-bold transition-all sm:text-sm ${
                            form.payment === v
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-neutral-200 hover:border-neutral-300'
                          }`}
                        >
                          <span className="block">{l}</span>
                          <span className="mt-1 block text-[10px] font-medium text-neutral-500">
                            {v === 'cash' ? 'Pay on arrival' : 'MTN, Airtel or card via Flutterwave'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <aside className="lg:sticky lg:top-5">
                <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
                  <div className="border-b border-neutral-100 p-5">
                    <h2 className="font-extrabold">Order summary</h2>
                    <p className="mt-1 text-xs text-neutral-500">
                      Review your order before placing it.
                    </p>
                  </div>

                  <div className="space-y-2 p-5 text-sm">
                    <div className="flex justify-between text-neutral-600">
                      <span>Subtotal</span>
                      <span>{fmt(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-neutral-600">
                      <span>
                        Delivery ({zone.label} · {shipMethod === 'door' ? 'door' : 'pickup'})
                      </span>
                      <span>{activePlusForCheckout ? 'Free with Plus' : fmt(deliveryFee)}</span>
                    </div>
                    {activePlusForCheckout && (
                      <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                        Plus saved you {fmt(standardDeliveryFee)} on delivery.
                      </div>
                    )}
                    <div className="flex justify-between border-t border-dashed border-neutral-200 pt-4 text-lg font-extrabold">
                      <span>Total</span>
                      <span style={{ color: ORANGE }}>{fmt(total)}</span>
                    </div>
                  </div>

                  <div className="border-t border-neutral-100 p-5">
                    <button
                      type="button"
                      disabled={!valid || createOrder.isPending}
                      onClick={submit}
                      className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white disabled:opacity-40"
                      style={{ background: ORANGE }}
                    >
                      {createOrder.isPending ? (
                        'Placing order…'
                      ) : (
                        <>
                          {form.payment === 'flutterwave' ? 'Continue to secure payment' : 'Place order'} — {fmt(total)} <ChevronRight size={17} />
                        </>
                      )}
                    </button>
                    {createOrder.isError && (
                      <p className="mt-2 text-center text-sm text-red-600">
                        {createOrder.error.message || 'Something went wrong — please try again.'}
                      </p>
                    )}
                    <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-neutral-500">
                      <LockKeyhole size={12} /> Your delivery details are protected.
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-xs text-neutral-600">
                  <ShieldCheck size={18} className="text-emerald-600" /> Buyer protection on every
                  eligible order.
                </div>
              </aside>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  )
}
