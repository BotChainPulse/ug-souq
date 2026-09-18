import { Link } from 'react-router'
import { ArrowLeft, Check, Truck, ShieldCheck, Clock3 } from 'lucide-react'
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
  const { data } = trpc.plus.status.useQuery(
    { phone: account?.phone ?? '' },
    { enabled: !!account },
  )
  const membership = data?.membership

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
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: '#fff3e6', color: ORANGE }}
                >
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

        {membership ? (
          <section className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4">
            <p className="font-bold text-green-800">Plus is active</p>
            <p className="mt-1 text-sm text-green-700">
              Free delivery benefits are available until{' '}
              {membership.expiresAt
                ? new Date(membership.expiresAt).toLocaleDateString()
                : 'your renewal date'}.
            </p>
          </section>
        ) : !account ? (
          <section className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
            Create or sign in to your UG Souq account to view Plus membership updates.
          </section>
        ) : (
          <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <Clock3 size={22} className="mt-0.5 shrink-0 text-amber-700" />
              <div>
                <p className="font-bold text-amber-900">Plus payments are coming soon</p>
                <p className="mt-1 text-sm text-amber-800">
                  We are completing our Pesapal merchant activation. Joining will open only after
                  secure payment verification is ready.
                </p>
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  )
}
