import { Link } from 'react-router-dom'
import {
  BadgeCheck, FileText, MapPin, ShieldCheck, Star, ArrowRight, IdCard, MessageCircle,
} from 'lucide-react'
import { ORANGE, WA_LINK } from '../lib/site'

const checks = [
  { icon: IdCard, t: 'Identity check 🪪', d: 'The seller uploads their National ID (Ndaga Muntu), passport or driving permit. We match the name to the shop owner and payout number.' },
  { icon: MapPin, t: 'Business location', d: 'Every seller declares their district and physical landmark — shop, market stall or workshop — which our field agents can spot-check.' },
  { icon: FileText, t: 'Tax number (TIN)', d: 'Registered companies provide their URA TIN. Optional for individual traders, required for company accounts.' },
  { icon: Star, t: 'Track record', d: 'The badge stays only while the seller keeps a 95%+ positive rating and honours returns. It is removed if standards slip.' },
]

export default function Verification() {
  return (
    <div className="min-h-screen bg-[#faf9f7] text-neutral-900 antialiased">
      <header className="bg-white border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo-mark.png" alt="UG Souq logo" className="w-8 h-8 rounded-lg object-cover bg-white" />
            <span className="font-extrabold text-lg">UG Souq</span>
          </Link>
          <a href={WA_LINK} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-semibold text-green-700 bg-green-50 border border-green-200 px-4 py-2 rounded-full hover:bg-green-100">
            <MessageCircle size={16} /> Help
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 py-14">
        <span className="inline-flex items-center gap-2 text-sm font-bold text-sky-700 bg-sky-50 border border-sky-100 px-4 py-2 rounded-full">
          <BadgeCheck size={18} /> Verified Seller
        </span>
        <h1 className="mt-5 text-3xl md:text-4xl font-extrabold tracking-tight">What the blue badge means</h1>
        <p className="mt-4 text-neutral-600">
          When you see the <b className="text-sky-700">Verified</b> badge on UG Souq, the seller behind that product has passed our checks below — and their listings are shown first in search, flash sales and category pages.
        </p>

        <div className="mt-10 space-y-4">
          {checks.map(({ icon: Icon, t, d }, i) => (
            <div key={t} className="bg-white rounded-2xl border border-neutral-200 p-5 flex gap-4">
              <span className="w-11 h-11 shrink-0 rounded-full grid place-items-center bg-sky-50 relative">
                <Icon size={20} className="text-sky-600" />
                <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-sky-600 text-white text-[11px] font-bold grid place-items-center">{i + 1}</span>
              </span>
              <div>
                <h3 className="font-bold text-sm">{t}</h3>
                <p className="text-sm text-neutral-600 mt-1">{d}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 bg-neutral-900 text-white rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <h3 className="font-extrabold flex items-center gap-2"><ShieldCheck size={20} style={{ color: ORANGE }} /> Are you a seller?</h3>
            <p className="text-sm text-neutral-300 mt-1">Verification is free and takes 1–2 business days. Verified sellers sell up to 3× more.</p>
          </div>
          <Link to="/sell" className="inline-flex items-center gap-2 text-sm font-bold text-white px-6 py-3 rounded-full whitespace-nowrap" style={{ background: ORANGE }}>
            Get verified <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  )
}
