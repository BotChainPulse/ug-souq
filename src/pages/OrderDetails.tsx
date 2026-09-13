import { Component, useState } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { AlertTriangle, ArrowLeft, CheckCircle2, CircleDashed, MapPin, Package, ReceiptText, Truck, XCircle } from 'lucide-react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { trpc } from '@/providers/trpc'
import { fmt } from '../lib/cart'
import { getAccount } from '../lib/account'
import { ORANGE } from '../lib/site'
import { paymentLabel } from '../lib/payStatus'

const SAVED_PHONE_KEY = 'ugsouq_myphone'
const STAGES = [
  { key: 'placed', label: 'Order placed', icon: Package },
  { key: 'confirmed', label: 'Confirmed by seller', icon: CheckCircle2 },
  { key: 'pending_delivery', label: 'Preparing for delivery', icon: Package },
  { key: 'on_the_way', label: 'On the way', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle2 },
] as const

const CANCEL_REASONS = [
  'Ordered by mistake',
  'Wrong item or quantity',
  'Duplicate order',
  'Wrong delivery address',
  'Changed my mind',
  'Other',
]

function paymentMethodLabel(method: string) {
  if (method === 'mtn_momo') return 'MTN MoMo'
  if (method === 'airtel_money') return 'Airtel Money'
  return 'Cash on delivery'
}

function safeOrderDate(value: unknown) {
  const date = new Date(value as string | number | Date)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  try {
    return date.toLocaleString('en-UG', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return date.toLocaleString()
  }
}

function safeAmount(value: unknown) {
  const amount = Number(value)
  return fmt(Number.isFinite(amount) ? amount : 0)
}

function cleanDeliveryAddress(value: unknown) {
  const text = String(value ?? '').trim()
  if (!text) return 'Address unavailable'
  const parts = text.split(/\s+—\s+/).map((part) => part.trim()).filter(Boolean)
  const cleaned = parts.filter((part, index) => index === 0 || part !== parts[index - 1])
  return cleaned.join(' — ')
}

class OrderDetailsBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Order details render failed', error, info) }
  render() {
    if (this.state.failed) {
      return (
        <div className="flex min-h-screen flex-col bg-[#faf9f7]">
          <Header />
          <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
              <ReceiptText className="mx-auto text-amber-700" />
              <h1 className="mt-3 text-xl font-extrabold text-amber-950">We couldn't display this order</h1>
              <p className="mt-2 text-sm text-amber-800">The order is still saved. Return to My Orders and try opening it again.</p>
              <Link to="/orders" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-amber-900 px-4 text-sm font-bold text-white">Back to My Orders</Link>
            </div>
          </main>
          <Footer />
        </div>
      )
    }
    return this.props.children
  }
}

function OrderDetailsPage() {
  const { code = '' } = useParams()
  const savedPhone = (localStorage.getItem(SAVED_PHONE_KEY) ?? getAccount()?.phone ?? '').trim()
  const [phone, setPhone] = useState(savedPhone)
  const [lookupPhone, setLookupPhone] = useState(savedPhone)
  const [showCancel, setShowCancel] = useState(false)
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0])
  const [cancelNotice, setCancelNotice] = useState('')
  const hasValidPhone = lookupPhone.trim().length >= 9
  const canLoad = code.trim().length >= 4 && hasValidPhone
  const orderQuery = trpc.orders.track.useQuery(
    { code: code.trim().toUpperCase(), phone: lookupPhone.trim() },
    { enabled: canLoad, retry: false },
  )
  const cancellationStatusQuery = trpc.buyerOrders.cancellationStatus.useQuery(
    { code: code.trim().toUpperCase(), phone: lookupPhone.trim() },
    { enabled: canLoad, retry: false },
  )
  const cancelOrder = trpc.buyerOrders.cancel.useMutation({
    onSuccess: async (result) => {
      setCancelNotice(result.message)
      setShowCancel(false)
      await Promise.all([orderQuery.refetch(), cancellationStatusQuery.refetch()])
    },
  })
  const order = orderQuery.data
  const items = order && Array.isArray(order.items) ? order.items : []
  const stageIndex = order ? STAGES.findIndex(({ key }) => key === order.status) : -1
  const cancellationPending = cancellationStatusQuery.data?.pending === true
  const cancellationAvailable = order ? ['placed', 'confirmed', 'pending_delivery'].includes(order.status) && !cancellationPending : false
  const cancellationLabel = order?.status === 'placed' ? 'Cancel order' : 'Request cancellation'
  const payBadge = order && order.status !== 'cancelled'
    ? paymentLabel({ paymentMethod: order.paymentMethod ?? '', paymentStatus: order.paymentStatus ?? 'unpaid' })
    : null

  const lookUp = () => {
    const normalized = phone.trim()
    if (normalized.length < 9) return
    localStorage.setItem(SAVED_PHONE_KEY, normalized)
    setLookupPhone(normalized)
  }

  const submitCancellation = () => {
    if (!order || !lookupPhone.trim()) return
    setCancelNotice('')
    cancelOrder.mutate({ code: order.code, phone: lookupPhone.trim(), reason: cancelReason })
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#faf9f7] text-neutral-900 antialiased">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:py-10">
        <Link to="/orders" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-emerald-700"><ArrowLeft size={17} /> Back to My Orders</Link>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-extrabold"><ReceiptText size={24} style={{ color: ORANGE }} /> Order details</h1>

        {!hasValidPhone && (
          <div className="mt-5 rounded-2xl border border-neutral-200 bg-white p-5">
            <p className="text-sm text-neutral-600">Enter the phone number used for this order to protect your order details.</p>
            <div className="mt-3 flex gap-2">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && lookUp()} placeholder="07XX XXX XXX" className="h-11 min-w-0 flex-1 rounded-xl border border-neutral-300 px-3 text-sm outline-none focus:border-orange-500" />
              <button onClick={lookUp} disabled={phone.trim().length < 9} className="rounded-xl px-4 text-sm font-bold text-white disabled:opacity-40" style={{ background: ORANGE }}>View order</button>
            </div>
          </div>
        )}

        {orderQuery.isLoading && <div className="mt-6 h-80 animate-pulse rounded-2xl bg-white" />}

        {orderQuery.isError && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <XCircle className="mx-auto text-red-500" />
            <h2 className="mt-2 font-extrabold text-red-800">Unable to load order</h2>
            <p className="mt-1 text-sm text-red-700">Please check your connection and try again.</p>
            <button onClick={() => orderQuery.refetch()} className="mt-4 min-h-11 rounded-xl bg-red-700 px-4 text-sm font-bold text-white">Try again</button>
          </div>
        )}

        {canLoad && orderQuery.isFetched && !order && !orderQuery.isLoading && !orderQuery.isError && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <XCircle className="mx-auto text-red-500" />
            <h2 className="mt-2 font-extrabold text-red-800">Order not found</h2>
            <p className="mt-1 text-sm text-red-700">This order code does not match the phone number saved on this device.</p>
            <button onClick={() => setLookupPhone('')} className="mt-3 text-sm font-bold underline">Use another phone number</button>
          </div>
        )}

        {order && (
          <div className="mt-5 space-y-4">
            <section className="rounded-2xl border border-neutral-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Order number</p><p className="mt-1 font-mono text-lg font-extrabold tracking-widest" style={{ color: ORANGE }}>{order.code || code}</p><p className="mt-1 text-xs text-neutral-500">{safeOrderDate(order.createdAt)}</p></div>
                <div className="text-right">
                  <p className="text-xl font-extrabold">{safeAmount(order.total)}</p>
                  {order.status === 'cancelled' ? (
                    <span className="mt-1 inline-block rounded-full bg-red-50 px-2 py-1 text-[11px] font-bold text-red-700">Cancelled</span>
                  ) : payBadge ? (
                    <span className={`mt-1 inline-block rounded-full px-2 py-1 text-[11px] font-bold ${payBadge.cls}`}>{payBadge.text}</span>
                  ) : null}
                </div>
              </div>
              {order.status === 'cancelled' ? <p className="mt-5 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700"><XCircle size={18} /> This order was cancelled.</p> : (
                <div className="mt-6 grid gap-3 sm:grid-cols-5">
                  {STAGES.map((stage, index) => { const done = index <= stageIndex; const Icon = done ? stage.icon : CircleDashed; return <div key={stage.key} className={`flex items-center gap-2 text-xs sm:flex-col sm:text-center ${done ? 'font-bold text-neutral-800' : 'text-neutral-400'}`}><Icon size={19} className={done ? 'text-emerald-600' : 'text-neutral-300'} /><span>{stage.label}</span></div> })}
                </div>
              )}

              {cancellationPending && order.status !== 'cancelled' && (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                  <p>Cancellation request pending review.</p>
                  <p className="mt-1 text-xs font-normal text-amber-800">You do not need to submit it again. We will stop fulfilment if possible and review any payment before a refund is processed.</p>
                </div>
              )}

              {cancelNotice && !cancellationPending && order.status !== 'cancelled' && (
                <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{cancelNotice}</p>
              )}

              {cancellationAvailable && !showCancel && (
                <div className="mt-5 border-t border-neutral-100 pt-4">
                  <button onClick={() => { setCancelNotice(''); setShowCancel(true) }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-300 bg-white px-4 text-sm font-bold text-red-700 hover:bg-red-50">
                    <XCircle size={17} /> {cancellationLabel}
                  </button>
                  <p className="mt-2 text-xs text-neutral-500">
                    {order.status === 'placed'
                      ? 'Mistake? Cancel before the seller starts fulfilment. Paid or in-progress payments are reviewed before any refund.'
                      : 'The seller may already be preparing this order, so cancellation needs review.'}
                  </p>
                </div>
              )}

              {cancellationAvailable && showCancel && (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={19} className="mt-0.5 shrink-0 text-red-700" />
                    <div>
                      <h2 className="font-extrabold text-red-900">{cancellationLabel}</h2>
                      <p className="mt-1 text-xs leading-relaxed text-red-800">Tell us why. Unpaid orders that have not entered payment processing can be cancelled immediately. Otherwise we create a cancellation/refund request for review.</p>
                    </div>
                  </div>
                  <label className="mt-4 block text-xs font-bold text-red-900" htmlFor="cancel-reason">Reason</label>
                  <select id="cancel-reason" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-red-200 bg-white px-3 text-sm outline-none focus:border-red-500">
                    {CANCEL_REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
                  </select>
                  {cancelOrder.error && <p className="mt-2 text-xs font-semibold text-red-700">{cancelOrder.error.message}</p>}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={submitCancellation} disabled={cancelOrder.isPending} className="min-h-11 rounded-xl bg-red-700 px-4 text-sm font-bold text-white disabled:opacity-50">
                      {cancelOrder.isPending ? 'Submitting…' : `Confirm ${order.status === 'placed' ? 'cancellation' : 'request'}`}
                    </button>
                    <button onClick={() => setShowCancel(false)} disabled={cancelOrder.isPending} className="min-h-11 rounded-xl border border-neutral-300 bg-white px-4 text-sm font-bold text-neutral-700 disabled:opacity-50">Keep order</button>
                  </div>
                </div>
              )}

              {order.status === 'on_the_way' && (
                <p className="mt-5 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">This order is already on the way. Contact support for urgent delivery changes.</p>
              )}
            </section>

            <section className="rounded-2xl border border-neutral-200 bg-white p-5">
              <h2 className="font-extrabold">Items</h2>
              <div className="mt-3 divide-y divide-neutral-100">
                {items.map((item) => <div key={item.id} className="flex justify-between gap-3 py-3 text-sm"><span className="text-neutral-700">{Number(item.qty) || 0} × {item.name || 'Item'}</span><span className="shrink-0 font-semibold">{safeAmount((Number(item.price) || 0) * (Number(item.qty) || 0))}</span></div>)}
                {items.length === 0 && <p className="py-3 text-sm text-neutral-500">No item lines were saved for this legacy order.</p>}
              </div>
              <div className="mt-2 space-y-2 border-t border-neutral-200 pt-3 text-sm"><div className="flex justify-between text-neutral-600"><span>Subtotal</span><span>{safeAmount(order.subtotal)}</span></div><div className="flex justify-between text-neutral-600"><span>Delivery</span><span>{Number(order.deliveryFee) === 0 ? 'Free' : safeAmount(order.deliveryFee)}</span></div><div className="flex justify-between pt-1 text-base font-extrabold"><span>Total</span><span>{safeAmount(order.total)}</span></div></div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-neutral-200 bg-white p-5"><h2 className="flex items-center gap-2 font-extrabold"><MapPin size={17} className="text-emerald-700" /> Delivery address</h2><p className="mt-2 text-sm leading-relaxed text-neutral-600">{cleanDeliveryAddress(order.address)}</p></div>
              <div className="rounded-2xl border border-neutral-200 bg-white p-5">
                <h2 className="font-extrabold">Payment</h2>
                {order.status === 'cancelled' && order.paymentStatus === 'unpaid' ? (
                  <>
                    <p className="mt-2 text-sm font-semibold text-red-700">No payment collected</p>
                    <p className="mt-1 text-xs text-neutral-500">Original method: {paymentMethodLabel(order.paymentMethod ?? '')}</p>
                  </>
                ) : (
                  <>
                    <p className="mt-2 text-sm text-neutral-600">{paymentMethodLabel(order.paymentMethod ?? '')}</p>
                    {order.paymentRef && <p className="mt-1 break-all text-xs text-neutral-500">Reference: {order.paymentRef}</p>}
                  </>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

export default function OrderDetails() {
  return <OrderDetailsBoundary><OrderDetailsPage /></OrderDetailsBoundary>
}
