import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, Bell, CheckCircle2, LockKeyhole, Search, Truck } from 'lucide-react'
import { ORANGE } from '../lib/site'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { trpc } from '@/providers/trpc'

const statusCopy: Record<string, { title: string; message: string }> = {
  placed: { title: 'Order received', message: 'Your order is waiting for confirmation.' },
  confirmed: { title: 'Order confirmed', message: 'The seller has confirmed your order.' },
  pending_delivery: { title: 'Preparing for delivery', message: 'Your order is being prepared for dispatch.' },
  on_the_way: { title: 'Order on the way', message: 'Your order has been handed over for delivery.' },
  delivered: { title: 'Order delivered', message: 'Your order has been marked as delivered.' },
  cancelled: { title: 'Order cancelled', message: 'This order has been cancelled.' },
}

export default function NotificationsPage() {
  const [orderCode, setOrderCode] = useState('')
  const [phone, setPhone] = useState('')
  const [lookup, setLookup] = useState<{ code: string; phone: string } | null>(null)
  const order = trpc.orders.track.useQuery(
    lookup ?? { code: '', phone: '' },
    { enabled: Boolean(lookup), retry: false },
  )
  const status = order.data ? (statusCopy[order.data.status] ?? statusCopy.placed) : null

  const verify = () => {
    const code = orderCode.trim().toUpperCase()
    const customerPhone = phone.trim()
    if (code.length >= 4 && customerPhone.length >= 9) setLookup({ code, phone: customerPhone })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="bg-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <Link to="/account"><ArrowLeft size={24} className="text-gray-700" /></Link>
        <h1 className="text-lg font-bold text-gray-900">Notifications</h1>
      </div>
      <main className="mx-auto max-w-xl px-4 py-6">
        <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-emerald-50 p-2.5 text-emerald-700"><LockKeyhole size={20} /></div>
            <div>
              <h2 className="font-bold text-gray-900">Secure order updates</h2>
              <p className="mt-1 text-sm text-gray-600">Enter both your order code and the phone number used at checkout. UG Souq never publishes customer notifications on a public page.</p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            <input value={orderCode} onChange={(event) => setOrderCode(event.target.value)} placeholder="Order code, e.g. US-ABCDE" autoComplete="off" className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm uppercase outline-none focus:border-emerald-600" />
            <input value={phone} onChange={(event) => setPhone(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && verify()} placeholder="Phone number used for the order" inputMode="tel" autoComplete="tel" className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-emerald-600" />
            <button type="button" onClick={verify} disabled={orderCode.trim().length < 4 || phone.trim().length < 9} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-white disabled:opacity-40" style={{ backgroundColor: ORANGE }}><Search size={17} /> View update</button>
          </div>
        </section>

        {order.isLoading && <div className="mt-4 rounded-2xl bg-white p-5 text-sm text-gray-500">Checking your order securely…</div>}
        {lookup && order.isFetched && !order.data && !order.isLoading && (
          <div role="alert" className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">The order code and phone number do not match. Check both details and try again.</div>
        )}
        {order.data && status && (
          <section className="mt-4 rounded-2xl border border-green-200 bg-white p-5 shadow-sm">
            <div className="flex gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-green-100 text-green-700">{order.data.status === 'on_the_way' ? <Truck size={20} /> : <CheckCircle2 size={20} />}</div>
              <div>
                <p className="font-bold text-gray-900">{status.title}</p>
                <p className="mt-1 text-sm text-gray-600">{status.message}</p>
                <p className="mt-2 text-xs font-semibold text-gray-500">Order {order.data.code} · Payment {String(order.data.paymentStatus).replaceAll('_', ' ')}</p>
                <Link to={`/orders/${encodeURIComponent(order.data.code)}`} className="mt-3 inline-flex text-sm font-bold text-emerald-700">View protected order details →</Link>
              </div>
            </div>
          </section>
        )}

        <div className="mt-4 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <Bell size={19} className="mt-0.5 shrink-0" />
          <p>Email, SMS and WhatsApp order alerts are not active during the pilot. Use this protected lookup until a verified delivery provider is connected.</p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
