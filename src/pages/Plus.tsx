import { Link } from 'react-router'
import { ArrowLeft, Check, Truck, ShieldCheck } from 'lucide-react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { ORANGE } from '../lib/site'

const benefits = [
  'Unlimited free delivery on eligible orders',
  'Priority delivery options when available',
  'Member-only offers and promotions',
]

export default function PlusPage() {
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

        <button
          type="button"
          className="w-full mt-5 py-3 rounded-xl font-bold text-white shadow-sm"
          style={{ backgroundColor: ORANGE }}
          onClick={() => window.alert('UG Souq Plus membership will be available soon.')}
        >
          Join UG Souq Plus
        </button>
        <p className="text-center text-xs text-gray-400 mt-3">Membership activation and pricing will be enabled here.</p>
      </main>
      <Footer />
    </div>
  )
}
