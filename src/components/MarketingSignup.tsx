import { useState } from 'react'
import type { FormEvent } from 'react'
import { CheckCircle2, Mail, MessageCircle, Sparkles } from 'lucide-react'
import { trpc } from '../providers/trpc'

export default function MarketingSignup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [emailOptIn, setEmailOptIn] = useState(false)
  const [whatsappOptIn, setWhatsappOptIn] = useState(false)
  const [consentAccepted, setConsentAccepted] = useState(false)
  const [website, setWebsite] = useState('')
  const subscribe = trpc.marketing.subscribe.useMutation()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    subscribe.mutate({ name, email, phone, emailOptIn, whatsappOptIn, consentAccepted, source: 'homepage', website })
  }

  if (subscribe.isSuccess) {
    return (
      <section className="mx-auto max-w-7xl px-3 pt-6 sm:px-4" aria-live="polite">
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-950 p-5 text-white sm:p-7">
          <CheckCircle2 className="shrink-0 text-emerald-300" size={30} />
          <div><h2 className="font-extrabold">You’re on the UGSouq deals list</h2><p className="mt-1 text-sm text-emerald-100">We’ll only contact you through the options you selected.</p></div>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-7xl px-3 pt-6 sm:px-4">
      <div className="overflow-hidden rounded-2xl bg-emerald-950 text-white shadow-sm">
        <div className="grid gap-5 p-5 sm:grid-cols-[0.8fr_1.2fr] sm:p-7 lg:grid-cols-2">
          <div className="self-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-emerald-100"><Sparkles size={14} /> UGSouq deals</span>
            <h2 className="mt-3 text-2xl font-extrabold leading-tight">Offers worth opening.</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-emerald-100">Choose email, WhatsApp, or both for new products, weekend deals and UGSouq Plus offers.</p>
          </div>

          <form onSubmit={submit} className="rounded-xl bg-white p-4 text-neutral-900 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-neutral-700">Name <span className="font-normal text-neutral-400">(optional)</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={255} autoComplete="name" className="mt-1 min-h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-emerald-600" placeholder="Your name" /></label>
              <label className="text-xs font-bold text-neutral-700">Email address<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" maxLength={255} autoComplete="email" className="mt-1 min-h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-emerald-600" placeholder="you@example.com" /></label>
              <label className="text-xs font-bold text-neutral-700 sm:col-span-2">WhatsApp number<input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" maxLength={32} autoComplete="tel" inputMode="tel" className="mt-1 min-h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-emerald-600" placeholder="07XX XXX XXX" /></label>
            </div>

            <fieldset className="mt-4 grid gap-2 sm:grid-cols-2">
              <legend className="mb-2 text-xs font-bold text-neutral-700">Send me promotions through:</legend>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 px-3 text-sm font-semibold"><input type="checkbox" checked={emailOptIn} onChange={(event) => setEmailOptIn(event.target.checked)} className="h-4 w-4 accent-emerald-700" /><Mail size={16} className="text-emerald-700" /> Email</label>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 px-3 text-sm font-semibold"><input type="checkbox" checked={whatsappOptIn} onChange={(event) => setWhatsappOptIn(event.target.checked)} className="h-4 w-4 accent-emerald-700" /><MessageCircle size={16} className="text-emerald-700" /> WhatsApp</label>
            </fieldset>

            <label className="mt-3 flex cursor-pointer items-start gap-2 text-[11px] leading-5 text-neutral-600"><input type="checkbox" checked={consentAccepted} onChange={(event) => setConsentAccepted(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-700" />I agree to receive the promotional messages selected above. I can unsubscribe at any time.</label>
            <label className="absolute -left-[10000px]" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></label>

            {subscribe.error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{subscribe.error.message}</p>}
            <button disabled={subscribe.isPending} className="mt-4 min-h-11 w-full rounded-xl bg-emerald-700 px-4 text-sm font-extrabold text-white transition hover:bg-emerald-800 disabled:opacity-60">{subscribe.isPending ? 'Joining…' : 'Get UGSouq deals'}</button>
            <p className="mt-2 text-center text-[10px] leading-4 text-neutral-400">No spam. Your order updates remain separate from promotional messages.</p>
          </form>
        </div>
      </div>
    </section>
  )
}
