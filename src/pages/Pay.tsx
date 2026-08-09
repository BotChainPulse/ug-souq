import { Link } from 'react-router-dom'
import { Wallet, Smartphone, ShieldCheck, Banknote, MessageCircle, CircleCheckBig } from 'lucide-react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { ORANGE, WA_LINK } from '../lib/site'

export default function Pay() {
  return (
    <div className="min-h-screen bg-[#faf9f7] text-neutral-900 antialiased">
      <Header />
      <section className="bg-[#fdf3ea]">
        <div className="mx-auto max-w-4xl px-4 py-14 text-center">
          <span className="inline-grid place-items-center w-16 h-16 rounded-2xl" style={{ background: ORANGE }}>
            <Wallet size={30} className="text-white" />
          </span>
          <h1 className="mt-5 text-3xl md:text-4xl font-extrabold tracking-tight">UG Souq Pay</h1>
          <p className="mt-3 text-neutral-600 max-w-xl mx-auto">
            Pay your way — MTN MoMo, Airtel Money, or cash on delivery. No card needed, no hidden fees.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12 grid sm:grid-cols-3 gap-4">
        {[
          { icon: Smartphone, t: 'MTN MoMo', d: 'Approve the prompt on your phone and your order is confirmed instantly.', c: '#ffcc00' },
          { icon: Smartphone, t: 'Airtel Money', d: 'Same simple flow for Airtel customers — pay in seconds with your PIN.', c: '#e11d48' },
          { icon: Banknote, t: 'Cash on delivery', d: 'Prefer cash? Pay the rider when your item arrives and you have checked it.', c: '#16a34a' },
        ].map(({ icon: Icon, t, d, c }) => (
          <div key={t} className="bg-white rounded-2xl border border-neutral-200 p-6">
            <span className="w-11 h-11 rounded-full grid place-items-center" style={{ background: c }}><Icon size={20} className="text-white" /></span>
            <h3 className="mt-3 font-bold text-sm">{t}</h3>
            <p className="text-sm text-neutral-600 mt-1">{d}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-6">
        <div className="bg-white rounded-2xl border border-neutral-200 p-6">
          <h2 className="font-extrabold flex items-center gap-2"><ShieldCheck size={18} style={{ color: ORANGE }} /> Buyer protection on every payment</h2>
          <ul className="mt-4 space-y-2.5 text-sm text-neutral-600">
            {[
              'Item not as described? Full refund — no arguments.',
              'Your money is only released to the seller after delivery is confirmed.',
              'Every order gets a tracking code you can check any time.',
              'Verified sellers are ID-checked and location-confirmed.',
            ].map((t) => (
              <li key={t} className="flex items-start gap-2"><CircleCheckBig size={15} className="text-green-600 mt-0.5 shrink-0" /> {t}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-14">
        <div className="bg-neutral-900 text-white rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <h3 className="font-extrabold">Payment question?</h3>
            <p className="text-sm text-neutral-300 mt-1">Our support team answers on WhatsApp, 7 days a week.</p>
          </div>
          <a href={WA_LINK} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-full bg-green-500 text-white hover:bg-green-600 whitespace-nowrap"><MessageCircle size={16} /> Chat with support</a>
        </div>
      </section>
      <Footer />
    </div>
  )
}
