import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Link2, Percent, LayoutDashboard, Image, Users, MessageCircle, ChevronRight,
  CircleCheckBig, Share2, Banknote,
} from 'lucide-react'
import { ORANGE, WA_LINK } from '../lib/site'
import { trpc } from '@/providers/trpc'

const perks = [
  { icon: Percent, t: 'Up to 8% commission', d: 'Earn on every qualifying order made through your link or coupon code.' },
  { icon: Link2, t: 'Custom links & coupons', d: 'Get your own trackable links and discount codes that fit your audience.' },
  { icon: LayoutDashboard, t: 'Performance dashboard', d: 'Track clicks, orders and earnings in real time from your phone.' },
  { icon: Image, t: 'Ready-made creatives', d: 'Banners, product photos and captions for WhatsApp, TikTok and Instagram.' },
]

const steps = [
  { icon: Users, t: 'Join free', d: 'Sign up with your name, phone and how you plan to promote (WhatsApp, TikTok, campus, church group…).' },
  { icon: Share2, t: 'Share your link', d: 'Pick products from any verified seller and share your unique link or coupon.' },
  { icon: Banknote, t: 'Get paid monthly', d: 'Commissions are paid to your MTN MoMo or Airtel Money every month.' },
]

const faqs = [
  ['How much can I earn?', 'Commission ranges from 2% to 8% depending on the product category. Electronics earn less per sale but sell in high volume; fashion and beauty earn more.'],
  ['Do I need a website?', 'No. Most UG Souq affiliates promote through WhatsApp status, TikTok, Instagram and community groups. Your link works anywhere.'],
  ['When do I get paid?', 'Monthly, straight to your mobile money. Orders that are returned or refunded don’t earn commission.'],
  ['Can I choose which sellers to promote?', 'Yes — you can build links for any product, and we recommend promoting verified sellers since their listings convert better.'],
]

export default function Affiliates() {
  const [form, setForm] = useState({ name: '', phone: '', channel: 'WhatsApp' })
  const join = trpc.affiliates.join.useMutation()
  const [code, setCode] = useState<string | null>(null)
  const joined = code !== null

  return (
    <div className="min-h-screen bg-[#faf9f7] text-neutral-900 antialiased">
      <header className="bg-white border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo-mark.png" alt="UG Souq logo" className="w-8 h-8 rounded-lg object-cover bg-white" />
            <span className="font-extrabold text-lg">UG Souq <span className="font-semibold text-neutral-500">Affiliates</span></span>
          </Link>
          <a href={WA_LINK} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-semibold text-green-700 bg-green-50 border border-green-200 px-4 py-2 rounded-full hover:bg-green-100">
            <MessageCircle size={16} /> Ask us
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-neutral-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">Earn money sharing<br />products you love</h1>
          <p className="mt-4 text-neutral-300 max-w-xl mx-auto">Join the UG Souq Affiliate Program — free to join, up to 8% commission on every sale you generate. Share links, get paid by MoMo.</p>
          <a href="#join" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-neutral-900 bg-white px-7 py-3.5 rounded-full hover:bg-neutral-100 transition-colors">
            Join now — it's free <ChevronRight size={16} />
          </a>
        </div>
      </section>

      {/* Perks */}
      <section className="mx-auto max-w-6xl px-4 mt-12">
        <h2 className="text-2xl font-extrabold text-center">Everything you need to succeed</h2>
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {perks.map(({ icon: Icon, t, d }) => (
            <div key={t} className="bg-white rounded-2xl border border-neutral-200 p-5">
              <span className="w-11 h-11 rounded-full grid place-items-center bg-orange-50"><Icon size={20} style={{ color: ORANGE }} /></span>
              <h3 className="font-bold text-sm mt-3">{t}</h3>
              <p className="text-sm text-neutral-600 mt-1">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 mt-14">
        <h2 className="text-2xl font-extrabold text-center">Start earning in 3 steps</h2>
        <div className="mt-8 grid sm:grid-cols-3 gap-4">
          {steps.map(({ icon: Icon, t, d }, i) => (
            <div key={t} className="relative bg-white rounded-2xl border border-neutral-200 p-6">
              <span className="absolute top-5 right-5 text-3xl font-extrabold text-neutral-100">{i + 1}</span>
              <span className="w-11 h-11 rounded-full grid place-items-center bg-orange-50"><Icon size={20} style={{ color: ORANGE }} /></span>
              <h3 className="font-bold mt-3">{t}</h3>
              <p className="text-sm text-neutral-600 mt-1">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 mt-14">
        <h2 className="text-2xl font-extrabold text-center">Common questions</h2>
        <div className="mt-6 space-y-3">
          {faqs.map(([q, a]) => (
            <details key={q} className="bg-white rounded-2xl border border-neutral-200 px-5 py-4 group">
              <summary className="font-semibold text-sm cursor-pointer list-none flex items-center justify-between">
                {q} <ChevronRight size={16} className="text-neutral-400 group-open:rotate-90 transition-transform" />
              </summary>
              <p className="text-sm text-neutral-600 mt-2">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Join form */}
      <section id="join" className="mx-auto max-w-xl px-4 mt-14 mb-16">
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 sm:p-8">
          {joined ? (
            <div className="text-center py-6">
              <CircleCheckBig size={44} className="mx-auto text-green-600" />
              <h2 className="font-extrabold text-xl mt-4">You're in!</h2>
              <p className="text-sm text-neutral-600 mt-2">Your affiliate code is</p>
              <p className="text-2xl font-extrabold tracking-widest mt-1" style={{ color: ORANGE }}>{code}</p>
              <p className="text-sm text-neutral-600 mt-2">We'll text your personal link and starter pack to <b>{form.phone}</b> on WhatsApp within 24 hours.</p>
            </div>
          ) : (
            <>
              <h2 className="font-extrabold text-xl">Become a UG Souq affiliate</h2>
              <p className="text-sm text-neutral-600 mt-1">Free to join. We onboard everyone via WhatsApp.</p>
              <div className="mt-5 space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Full name *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" className="w-full border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-neutral-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">WhatsApp number *</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="07XX XXX XXX" className="w-full border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-neutral-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Where will you promote? *</label>
                  <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} className="w-full border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-neutral-500 bg-white">
                    {['WhatsApp', 'TikTok', 'Instagram', 'YouTube', 'Facebook', 'Blog / website', 'Campus / community'].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <button
                  disabled={!form.name || !form.phone || join.isPending}
                  onClick={async () => {
                    const res = await join.mutateAsync({ name: form.name, phone: form.phone, channel: form.channel })
                    setCode(res.code)
                  }}
                  className="w-full text-sm font-bold text-white py-3 rounded-full disabled:opacity-40"
                  style={{ background: ORANGE }}>
                  {join.isPending ? 'Joining…' : 'Join the program — free'}
                </button>
                {join.isError && <p className="text-sm text-red-600 text-center">Something went wrong — please try again.</p>}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
