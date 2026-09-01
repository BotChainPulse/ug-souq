import { useState } from 'react'
import type { FormEvent } from 'react'
import { CheckCircle2, MessageCircle, Megaphone, Phone } from 'lucide-react'
import { trpc } from '../providers/trpc'
import { ORANGE, WHATSAPP_INTL } from '../lib/site'

type Plan = 'weekly' | 'monthly'

export default function SellerAdBookingForm() {
  const [open, setOpen] = useState(false)
  const [phone, setPhone] = useState('')
  const [planType, setPlanType] = useState<Plan>('weekly')
  const [notes, setNotes] = useState('')
  const booking = trpc.sellers.bookAd.useMutation()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    booking.mutate({ phone, planType, notes: notes.trim() || undefined })
  }

  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-extrabold text-white sm:w-auto" style={{ background: ORANGE }}><Megaphone size={16} /> Book seller ad</button>
  }

  if (booking.data) {
    const message = encodeURIComponent(`Hi UG Souq, I created Seller Ad booking ${booking.data.reference} for ${booking.data.shopName}. Plan: ${booking.data.planType}. Amount: UGX ${booking.data.amount.toLocaleString()}. Please help me confirm payment.`)
    return (
      <div className="mt-5 rounded-2xl border border-emerald-200 bg-white p-5" aria-live="polite">
        <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={24} /><div><h3 className="font-extrabold text-emerald-900">Advert booking created</h3><p className="mt-1 text-sm text-neutral-600">Reference <b>{booking.data.reference}</b> · {booking.data.planType} plan · <b>UGX {booking.data.amount.toLocaleString()}</b></p><p className="mt-2 text-xs leading-5 text-neutral-500">Your booking is now visible in the UGSouq admin queue. Contact us to confirm payment; the campaign starts only after admin activation.</p></div></div>
        <a href={`https://wa.me/${WHATSAPP_INTL}?text=${message}`} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-extrabold text-white"><MessageCircle size={16} /> Confirm payment on WhatsApp</a>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="mt-5 rounded-2xl border border-orange-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3"><div><h3 className="font-extrabold">Create your advert booking</h3><p className="mt-1 text-xs text-neutral-500">Use the phone number registered to your approved shop.</p></div><button type="button" onClick={() => setOpen(false)} className="text-xs font-bold text-neutral-500">Close</button></div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-bold text-neutral-700">Registered shop phone<div className="relative mt-1"><Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" /><input required minLength={9} maxLength={32} type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="07XX XXX XXX" className="min-h-11 w-full rounded-xl border border-neutral-300 py-2 pl-10 pr-3 text-sm outline-none focus:border-emerald-600" /></div></label>
        <fieldset><legend className="text-xs font-bold text-neutral-700">Campaign plan</legend><div className="mt-1 grid grid-cols-2 gap-2">{(['weekly', 'monthly'] as const).map((plan) => <label key={plan} className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border px-2 text-sm font-bold capitalize ${planType === plan ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-neutral-200'}`}><input type="radio" name="ad-plan" value={plan} checked={planType === plan} onChange={() => setPlanType(plan)} className="sr-only" />{plan}</label>)}</div></fieldset>
      </div>
      <label className="mt-4 block text-xs font-bold text-neutral-700">Campaign note <span className="font-normal text-neutral-400">(optional)</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={255} rows={2} placeholder="Which product or offer should we prioritize?" className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-emerald-600" /></label>
      <div className="mt-3 rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-600">The advertised item will be your latest approved product listing. Weekly costs UGX 25,000; monthly costs UGX 50,000.</div>
      {booking.error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{booking.error.message}</p>}
      <button disabled={booking.isPending} className="mt-4 min-h-11 w-full rounded-xl px-5 text-sm font-extrabold text-white disabled:opacity-60 sm:w-auto" style={{ background: ORANGE }}>{booking.isPending ? 'Creating booking…' : 'Create advert booking'}</button>
    </form>
  )
}
