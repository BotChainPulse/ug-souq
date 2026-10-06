import { useState } from 'react'
import { Link } from 'react-router'
import { Package, Truck, CircleCheckBig, Clock, XCircle, ShoppingCart, ChevronRight } from 'lucide-react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { trpc } from '@/providers/trpc'
import { fmt } from '../lib/cart'
import { ORANGE } from '../lib/site'
import { getAccount } from '../lib/account'

function StatusPill({ status, cancellationPending = false }: { status: string; cancellationPending?: boolean }) {
  if (cancellationPending && status !== 'cancelled') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">
        <Clock size={12} /> Cancellation pending
      </span>
    )
  }

  const map: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
    placed: { cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Clock size={12} />, label: 'Placed' },
    confirmed: { cls: 'bg-sky-50 text-sky-700 border-sky-200', icon: <CircleCheckBig size={12} />, label: 'Confirmed' },
    pending_delivery: { cls: 'bg-violet-50 text-violet-700 border-violet-200', icon: <Package size={12} />, label: 'Preparing' },
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
  const [account] = useState(getAccount);
  const searched = account?.deletionToken ? account.phone : '';
  const orders = trpc.orders.byPhone.useQuery(
    { phone: searched },
    { enabled: !!searched, retry: false },
  );
  const orderCodes = orders.data?.map((order) => order.code) ?? [];
  const cancellationStatuses = trpc.buyerOrders.cancellationStatuses.useQuery(
    { phone: searched, codes: orderCodes },
    { enabled: !!searched && orderCodes.length > 0, retry: false },
  );

  return (
    <div className="min-h-screen bg-[#faf9f7] text-neutral-900 antialiased">
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
          <Package size={26} style={{ color: ORANGE }} /> My Orders
        </h1>
        <p className="mt-2 text-neutral-600">Your order history is private to your secured account. Viewing it never cancels an order.</p>
        {!searched && (
          <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-5">
            <p>Open My Account on the original secured device. Older profiles and new devices require verified account recovery.</p>
            <Link to="/account" className="mt-3 inline-block font-bold text-emerald-700">Open My Account</Link>
            <Link to="/support" className="ml-4 font-bold text-emerald-700">Recovery guidance</Link>
          </div>
        )}
        {orders.error && <p role="alert" className="mt-6 text-sm text-red-700">{orders.error.message}</p>}

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
            {orders.data.map((o) => {
              const cancellationPending = cancellationStatuses.data?.[o.code] === true
              return (
                <div key={o.id} className="bg-white rounded-2xl border border-neutral-200 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-extrabold tracking-widest" style={{ color: ORANGE }}>{o.code}</span>
                      <span className="ml-3 text-xs text-neutral-500">
                        {o.createdAt ? new Date(o.createdAt).toLocaleString('en-UG', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}
                      </span>
                    </div>
                    <StatusPill status={o.status} cancellationPending={cancellationPending} />
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
                  <p className="mt-2 text-xs text-neutral-500">Deliver to: {o.address || 'Address unavailable'}</p>
                  {cancellationPending ? (
                    <p className="mt-2 text-xs font-semibold text-amber-800">Cancellation request pending review. No further cancellation request is needed.</p>
                  ) : o.status === 'placed' ? (
                    <p className="mt-2 text-xs font-semibold text-amber-700">Need to correct a mistake? Open the order to cancel before fulfilment starts.</p>
                  ) : null}
                  <Link to={`/orders/${encodeURIComponent(o.code)}`} className="mt-4 flex min-h-11 items-center justify-between border-t border-neutral-100 pt-3 text-sm font-bold text-emerald-700">
                    View order details <ChevronRight size={18} />
                  </Link>
                </div>
              )
            })}
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
