import { useState } from 'react'
import { Link } from 'react-router'
import {
  Users, MessageCircle, ChevronRight, CircleCheckBig, Share2, Image,
} from 'lucide-react'
import { ORANGE, WA_LINK } from '../lib/site'
import { trpc } from '@/providers/trpc'

const pilotDetails = [
  {
    icon: Users,
    t: 'Applications are open',
    d: 'Tell us where you plan to promote UGSouq. We are currently collecting interest for the pilot.',
  },
  {
    icon: Share2,
    t: 'Manual review',
    d: 'UGSouq will review each application before inviting selected pilot partners.',
  },
  {
    icon: Image,
    t: 'Tools are still being built',
    d: 'Referral links, coupons, reporting, commission accounting and payouts are not active yet.',
  },
]

const steps = [
  {
    t: 'Apply for the pilot',
    d: 'Share your name, WhatsApp number and main promotional channel.',
  },
  {
    t: 'Wait for review',
    d: 'Submitting the form records your interest only. It does not activate an affiliate account.',
  },
  {
    t: 'Receive written activation',
    d: 'Selected partners will receive the final commission rules and activation instructions before promotion begins.',
  },
]

const faqs = [
  ['Can I earn commission now?', 'No. Referral tracking, coupon attribution, commission accounting and payouts are not active yet.'],
  ['Will I receive an affiliate link immediately?', 'No. Applying records your interest. A link will be issued only after the pilot is activated and you are accepted in writing.'],
  ['Does applying guarantee acceptance?', 'No. UGSouq will review pilot applications and contact selected applicants when the operational tools are ready.'],
  ['What happens to my details?', 'UGSouq uses your name, WhatsApp number and selected channel only to review your pilot application and contact you about the program.'],
]

export default function Affiliates() {
  const [form, setForm] = useState({ name: '', phone: '', channel: 'WhatsApp' })
  const [consent, setConsent] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const join = trpc.affiliates.join.useMutation()

  return (
    <div className="min-h-screen bg-[#faf9f7] text-neutral-900 antialiased">
      <header className="bg-white border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo-mark.png" alt="UG Souq logo" className="w-8 h-8 rounded-lg object-cover bg-white" />
            <span className="font-extrabold text-lg">UG Souq <span className="font-semibold text-neutral-500">Affiliate Pilot</span></span>
          </Link>
          <a href={WA_LINK} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-semibold text-green-700 bg-green-50 border border-green-200 px-4 py-2 rounded-full hover:bg-green-100">
            <MessageCircle size={16} /> Ask us
          </a>
        </div>
      </header>

      <section className="bg-neutral-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center">
          <span className="inline-flex rounded-full bg-amber-300 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-neutral-900">
            Pilot applications only
          </span>
          <h1 className="mt-5 text-3xl md:text-5xl font-extrabold tracking-tight">Help shape the<br />UGSouq affiliate pilot</h1>
          <p className="mt-4 text-neutral-300 max-w-2xl mx-auto">
            We are collecting interest while referral tracking, coupon attribution, reporting and payout tools are being built.
            Applying does not activate earning or guarantee acceptance.
          </p>
          <a href="#apply" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-neutral-900 bg-white px-7 py-3.5 rounded-full hover:bg-neutral-100 transition-colors">
            Apply for the pilot <ChevronRight size={16} />
          </a>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 mt-12" aria-labelledby="pilot-status-heading">
        <h2 id="pilot-status-heading" className="text-2xl font-extrabold text-center">Current pilot status</h2>
        <div className="mt-8 grid sm:grid-cols-3 gap-4">
          {pilotDetails.map(({ icon: Icon, t, d }) => (
            <div key={t} className="bg-white rounded-2xl border border-neutral-200 p-5">
              <span className="w-11 h-11 rounded-full grid place-items-center bg-orange-50"><Icon size={20} style={{ color: ORANGE }} /></span>
              <h3 className="font-bold text-sm mt-3">{t}</h3>
              <p className="text-sm text-neutral-600 mt-1">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 mt-14" aria-labelledby="application-process-heading">
        <h2 id="application-process-heading" className="text-2xl font-extrabold text-center">How pilot applications work</h2>
        <div className="mt-8 grid sm:grid-cols-3 gap-4">
          {steps.map(({ t, d }, index) => (
            <div key={t} className="relative bg-white rounded-2xl border border-neutral-200 p-6">
              <span className="absolute top-5 right-5 text-3xl font-extrabold text-neutral-100">{index + 1}</span>
              <h3 className="font-bold pr-8">{t}</h3>
              <p className="text-sm text-neutral-600 mt-2">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 mt-14" aria-labelledby="affiliate-faq-heading">
        <h2 id="affiliate-faq-heading" className="text-2xl font-extrabold text-center">Common questions</h2>
        <div className="mt-6 space-y-3">
          {faqs.map(([question, answer]) => (
            <details key={question} className="bg-white rounded-2xl border border-neutral-200 px-5 py-4 group">
              <summary className="font-semibold text-sm cursor-pointer list-none flex items-center justify-between">
                {question} <ChevronRight size={16} className="text-neutral-400 group-open:rotate-90 transition-transform" />
              </summary>
              <p className="text-sm text-neutral-600 mt-2">{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="apply" className="mx-auto max-w-xl px-4 mt-14 mb-16" aria-labelledby="pilot-application-heading">
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 sm:p-8">
          {submitted ? (
            <div className="text-center py-6" role="status">
              <CircleCheckBig size={44} className="mx-auto text-green-600" />
              <h2 className="font-extrabold text-xl mt-4">Application received</h2>
              <p className="text-sm text-neutral-600 mt-2">
                Thank you. This records your interest in the pilot; it is not an active affiliate account and no earnings start yet.
                UGSouq will contact selected applicants after the tracking and payout tools are ready.
              </p>
            </div>
          ) : (
            <>
              <h2 id="pilot-application-heading" className="font-extrabold text-xl">Apply for the affiliate pilot</h2>
              <p className="text-sm text-neutral-600 mt-1">There is no application fee and no guaranteed acceptance or earnings.</p>
              <div className="mt-5 space-y-4">
                <div>
                  <label htmlFor="affiliate-name" className="block text-sm font-semibold mb-1.5">Full name *</label>
                  <input
                    id="affiliate-name"
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Your name"
                    autoComplete="name"
                    className="w-full border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-neutral-500"
                  />
                </div>
                <div>
                  <label htmlFor="affiliate-phone" className="block text-sm font-semibold mb-1.5">WhatsApp number *</label>
                  <input
                    id="affiliate-phone"
                    value={form.phone}
                    onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                    placeholder="07XX XXX XXX"
                    autoComplete="tel"
                    inputMode="tel"
                    className="w-full border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-neutral-500"
                  />
                </div>
                <div>
                  <label htmlFor="affiliate-channel" className="block text-sm font-semibold mb-1.5">Where would you promote? *</label>
                  <select
                    id="affiliate-channel"
                    value={form.channel}
                    onChange={(event) => setForm((current) => ({ ...current, channel: event.target.value }))}
                    className="w-full border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-neutral-500 bg-white"
                  >
                    {['WhatsApp', 'TikTok', 'Instagram', 'YouTube', 'Facebook', 'Blog / website', 'Campus / community'].map((channel) => <option key={channel}>{channel}</option>)}
                  </select>
                </div>
                <label className="flex items-start gap-3 text-sm text-neutral-600">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(event) => setConsent(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-neutral-300"
                  />
                  <span>I agree that UGSouq may use these details to review my pilot application and contact me about the program. I understand that applying does not activate earnings.</span>
                </label>
                <button
                  disabled={!form.name.trim() || !form.phone.trim() || !consent || join.isPending}
                  onClick={async () => {
                    await join.mutateAsync({
                      name: form.name.trim(),
                      phone: form.phone.trim(),
                      channel: form.channel,
                    })
                    setSubmitted(true)
                  }}
                  className="w-full text-sm font-bold text-white py-3 rounded-full disabled:opacity-40"
                  style={{ background: ORANGE }}
                >
                  {join.isPending ? 'Submitting…' : 'Submit pilot application'}
                </button>
                {join.isError ? <p className="text-sm text-red-600 text-center" role="alert">Something went wrong — please try again.</p> : null}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
