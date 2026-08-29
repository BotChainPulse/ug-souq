import { Link, useSearchParams } from 'react-router'
import { ArrowLeft, Check, Truck, ShieldCheck, Loader2 } from 'lucide-react'
import { useState } from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { ORANGE } from '../lib/site'
import { trpc } from '@/providers/trpc'
import { getAccount } from '../lib/account'

const benefits = [
  'Unlimited free delivery on eligible orders',
  'Priority delivery options when available',
  'Member-only offers and promotions',
]

export default function PlusPage() {
  const account = getAccount()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const checkout = trpc.plus.startCheckout.useMutation()
  const { data: plan } = trpc.plus.plan.useQuery()
  const { data, refetch } = trpc.plus.status.useQuery({ phone: account?.phone ?? '' }, { enabled: !!account })
  const paymentState = searchParams.get('payment')
  const membership = data?.membership

  const beginCheckout = async () => {
    if (!account) return
    const result = await checkout.mutateAsync({ phone: account.phone, email })
    if (result.alreadyActive) { await refetch(); return }
    if ('checkoutUrl' in result) window.location.assign(result.checkoutUrl)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="bg-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <Link to="/account" aria-label="Back to account">
          <ArrowLeft size={24} className="text-gray-700" />
        </Link>
        <h1 className="text-lg font-bold text-gray-900">UG Souq Plus</h1>
      </div>

      <main className="px-4 py-6 max-w-lg mx-auto">
        <section
          className="rounded-2xl p-6 text-white shadow-sm"
          style={{ background: `linear-gradient(135deg, ${ORANGE}, #d95d1e)` }}
        >
          <p className="text-sm font-semibold opacity-90">UG Souq</p>
          <h2 className="text-2xl font-bold mt-1">Unlimited Free Delivery</h2>
          <p className="text-sm opacity-90 mt-2">Get more from every order with UG Souq Plus.</p>
        </section>

        <section className="bg-white rounded-2xl p-5 mt-4 shadow-sm">
          <h3 className="font-bold text-gray-900">Plus benefits</h3>
          <div className="mt-4 space-y-3">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#fff3e6', color: ORANGE }}>
                  <Check size={15} />
                </span>
                <p className="text-sm text-gray-700">{benefit}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl p-5 mt-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Truck size={22} style={{ color: ORANGE }} />
            <div>
              <p className="font-bold text-gray-900">Delivery savings</p>
              <p className="text-xs text-gray-500 mt-0.5">No delivery fee on eligible Plus orders.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <ShieldCheck size={22} style={{ color: ORANGE }} />
            <div>
              <p className="font-bold text-gray-900">Member experience</p>
              <p className="text-xs text-gray-500 mt-0.5">Enjoy member offers as the program expands.</p>
            </div>
          </div>
        </section>

        {paymentState === 'successful' && <p className="mt-4 rounded-xl bg-green-50 p-3 text-sm font-medium text-green-700">Payment verified. Your Plus membership is now active.</p>}
        {paymentState === 'failed' && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">We could not verify that payment. No membership was activated.</p>}

        {membership ? (
          <section className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4">
            <p className="font-bold text-green-800">Plus is active</p>
            <p className="mt-1 text-sm text-green-700">Free delivery benefits are available until {membership.expiresAt ? new Date(membership.expiresAt).toLocaleDateString() : 'your renewal date'}.</p>
          </section>
        ) : !account ? (
          <section className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">Create or sign in to your UG Souq account before joining Plus.</section>
        ) : (
          <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
            <p className="font-bold text-gray-900">{plan ? `${plan.currency} ${plan.amount.toLocaleString()} for ${plan.durationDays} days` : 'Monthly membership'}</p>
            <p className="mt-1 text-xs text-gray-500">Secure checkout is handled by Flutterwave. Your membership starts only after payment is verified.</p>
            <label className="mt-4 block text-sm font-medium text-gray-700">Email for your payment receipt</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 outline-none focus:border-orange-500" />
            <button type="button" disabled={!email || checkout.isPending} onClick={beginCheckout} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-bold text-white shadow-sm disabled:opacity-60" style={{ backgroundColor: ORANGE }}>
              {checkout.isPending && <Loader2 size={18} className="animate-spin" />}{checkout.isPending ? 'Opening secure checkout…' : 'Join UG Souq Plus'}
            </button>
            {checkout.isError && <p className="mt-3 text-sm text-red-600">{checkout.error.message}</p>}
          </section>
        )}
      </main>
      <Footer />
    </div>
  )
}

