import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { CalendarDays, CheckCircle2, MessageCircle, Megaphone, Phone, Search, Target } from 'lucide-react'
import { trpc } from '../providers/trpc'
import { ORANGE, WHATSAPP_INTL } from '../lib/site'

type Plan = 'weekly' | 'monthly'
type Objective = 'product_sales' | 'product_views' | 'shop_visits'
type Cta = 'shop_now' | 'view_product' | 'visit_shop'

const objectiveLabels: Record<Objective, string> = {
  product_sales: 'Increase product sales',
  product_views: 'Get more product views',
  shop_visits: 'Bring shoppers to my shop',
}

const ctaLabels: Record<Cta, string> = {
  shop_now: 'Shop now',
  view_product: 'View product',
  visit_shop: 'Visit shop',
}

const fmt = (value: number) => `UGX ${Number(value).toLocaleString()}`

export default function SellerAdBookingForm() {
  const [open, setOpen] = useState(false)
  const [phone, setPhone] = useState('')
  const [searchedPhone, setSearchedPhone] = useState('')
  const [listingId, setListingId] = useState<number | null>(null)
  const [planType, setPlanType] = useState<Plan>('weekly')
  const [headline, setHeadline] = useState('')
  const [message, setMessage] = useState('')
  const [objective, setObjective] = useState<Objective>('product_sales')
  const [cta, setCta] = useState<Cta>('shop_now')
  const [requestedStartDate, setRequestedStartDate] = useState('')
  const [notes, setNotes] = useState('')

  const lookup = trpc.sellers.lookup.useQuery(
    { phone: searchedPhone },
    { enabled: searchedPhone.length >= 9, retry: false },
  )
  const booking = trpc.sellers.bookAd.useMutation()
  const seller = lookup.data
  const approvedListings = useMemo(
    () => seller?.listings.filter((listing) => listing.status === 'approved' && listing.stock > 0) ?? [],
    [seller],
  )
  const selectedListing = approvedListings.find((listing) => listing.id === listingId)
  const shopReady = seller?.status === 'approved' && approvedListings.length > 0
  const canSubmit = Boolean(
    shopReady &&
    searchedPhone === phone.trim() &&
    selectedListing &&
    headline.trim().length >= 5 &&
    message.trim().length >= 10,
  )

  const findProducts = () => {
    const normalized = phone.trim()
    if (normalized.length < 9) return
    setListingId(null)
    setSearchedPhone(normalized)
  }

  const chooseListing = (value: string) => {
    const id = Number(value)
    setListingId(Number.isFinite(id) && id > 0 ? id : null)
    const product = approvedListings.find((listing) => listing.id === id)
    if (product && !headline.trim()) setHeadline(product.name.slice(0, 90))
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit || !listingId) return
    booking.mutate({
      phone: searchedPhone,
      listingId,
      planType,
      headline: headline.trim(),
      message: message.trim(),
      objective,
      cta,
      requestedStartDate: requestedStartDate || undefined,
      notes: notes.trim() || undefined,
    })
  }

  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-extrabold text-white sm:w-auto" style={{ background: ORANGE }}><Megaphone size={16} /> Book seller ad</button>
  }

  if (booking.data) {
    const whatsapp = encodeURIComponent(`Hi UG Souq, I created Seller Ad booking ${booking.data.reference} for ${booking.data.shopName}. Product: ${booking.data.productName}. Headline: ${booking.data.headline}. Plan: ${booking.data.planType}. Amount: UGX ${booking.data.amount.toLocaleString()}. Please help me confirm payment.`)
    return (
      <div className="mt-5 rounded-2xl border border-emerald-200 bg-white p-5" aria-live="polite">
        <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={24} /><div><h3 className="font-extrabold text-emerald-900">Advert booking created</h3><p className="mt-1 text-sm text-neutral-600">Reference <b>{booking.data.reference}</b> · {booking.data.productName} · <b>UGX {booking.data.amount.toLocaleString()}</b></p><p className="mt-2 text-xs leading-5 text-neutral-500">Your selected product and campaign details are now in the UGSouq admin queue. The advert starts only after payment confirmation and administrator activation.</p></div></div>
        <a href={`https://wa.me/${WHATSAPP_INTL}?text=${whatsapp}`} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-extrabold text-white"><MessageCircle size={16} /> Confirm payment on WhatsApp</a>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="mt-5 rounded-2xl border border-orange-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3"><div><h3 className="font-extrabold">Create your advert campaign</h3><p className="mt-1 text-xs text-neutral-500">Choose exactly what buyers should see. UGSouq reviews every campaign before it appears.</p></div><button type="button" onClick={() => setOpen(false)} className="text-xs font-bold text-neutral-500">Close</button></div>

      <div className="mt-4">
        <label className="text-xs font-bold text-neutral-700">Registered shop phone</label>
        <div className="mt-1 flex gap-2">
          <div className="relative min-w-0 flex-1"><Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" /><input required minLength={9} maxLength={32} type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="07XX XXX XXX" className="min-h-11 w-full rounded-xl border border-neutral-300 py-2 pl-10 pr-3 text-sm outline-none focus:border-emerald-600" /></div>
          <button type="button" onClick={findProducts} disabled={phone.trim().length < 9 || lookup.isFetching} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-neutral-900 px-3 text-xs font-extrabold text-white disabled:opacity-50"><Search size={15} /> {lookup.isFetching ? 'Checking…' : 'Find products'}</button>
        </div>
      </div>

      {searchedPhone && !lookup.isFetching && lookup.error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{lookup.error.message}</p>}
      {searchedPhone && !lookup.isFetching && !seller && !lookup.error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">No shop is registered with that phone number.</p>}
      {seller && seller.status !== 'approved' && <p role="alert" className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{seller.shopName} must be approved before it can run advertising.</p>}
      {seller?.status === 'approved' && approvedListings.length === 0 && <p role="alert" className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">You need at least one approved, in-stock product listing before booking an advert.</p>}

      {shopReady && (
        <div className="mt-5 space-y-4 border-t border-neutral-200 pt-5">
          <label className="block text-xs font-bold text-neutral-700">Product to advertise *
            <select required value={listingId ?? ''} onChange={(event) => chooseListing(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-emerald-600">
              <option value="">Choose one of your approved products</option>
              {approvedListings.map((listing) => <option key={listing.id} value={listing.id}>{listing.name} — {fmt(listing.price)}</option>)}
            </select>
          </label>

          {selectedListing && <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3"><img src={selectedListing.imageData || '/images/product-default.png'} alt="" className="h-16 w-16 rounded-lg bg-white object-contain p-1" /><div className="min-w-0"><p className="truncate text-sm font-extrabold">{selectedListing.name}</p><p className="text-xs text-neutral-600">{fmt(selectedListing.price)} · {selectedListing.stock} in stock</p><p className="mt-1 text-[11px] text-emerald-800">This approved product image will be used in the advert.</p></div></div>}

          <div className="grid gap-4 sm:grid-cols-2">
            <fieldset><legend className="text-xs font-bold text-neutral-700">Campaign plan *</legend><div className="mt-1 grid grid-cols-2 gap-2">{(['weekly', 'monthly'] as const).map((plan) => <label key={plan} className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border px-2 text-sm font-bold capitalize ${planType === plan ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-neutral-200'}`}><input type="radio" name="ad-plan" value={plan} checked={planType === plan} onChange={() => setPlanType(plan)} className="sr-only" />{plan} · {plan === 'weekly' ? '25,000' : '50,000'}</label>)}</div></fieldset>
            <label className="text-xs font-bold text-neutral-700">Preferred start date <span className="font-normal text-neutral-400">(optional)</span><div className="relative mt-1"><CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" /><input type="date" value={requestedStartDate} onChange={(event) => setRequestedStartDate(event.target.value)} className="min-h-11 w-full rounded-xl border border-neutral-300 py-2 pl-10 pr-3 text-sm outline-none focus:border-emerald-600" /></div></label>
          </div>

          <label className="block text-xs font-bold text-neutral-700">Campaign headline *<input required minLength={5} maxLength={90} value={headline} onChange={(event) => setHeadline(event.target.value)} placeholder="e.g. Samsung A15 weekend offer" className="mt-1 min-h-11 w-full rounded-xl border border-neutral-300 px-3 text-sm outline-none focus:border-emerald-600" /><span className="mt-1 block text-right text-[10px] font-normal text-neutral-400">{headline.length}/90</span></label>
          <label className="block text-xs font-bold text-neutral-700">Promotional message *<textarea required minLength={10} maxLength={180} rows={3} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Describe the offer, key benefit, warranty or delivery advantage." className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-emerald-600" /><span className="mt-1 block text-right text-[10px] font-normal text-neutral-400">{message.length}/180</span></label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-neutral-700"><span className="flex items-center gap-1"><Target size={14} /> Campaign goal *</span><select value={objective} onChange={(event) => setObjective(event.target.value as Objective)} className="mt-1 min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-emerald-600">{Object.entries(objectiveLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="text-xs font-bold text-neutral-700">Call-to-action *<select value={cta} onChange={(event) => setCta(event.target.value as Cta)} className="mt-1 min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-emerald-600">{Object.entries(ctaLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          </div>

          <label className="block text-xs font-bold text-neutral-700">Special instructions for UGSouq <span className="font-normal text-neutral-400">(optional)</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={255} rows={2} placeholder="For example: focus on the back-to-school period." className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-emerald-600" /></label>
          <div className="rounded-lg bg-neutral-50 px-3 py-2 text-xs leading-5 text-neutral-600">Your advert uses the selected approved product and its reviewed image. Campaigns appear in sponsored marketplace placements after payment confirmation and administrator activation.</div>
        </div>
      )}

      {booking.error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{booking.error.message}</p>}
      <button disabled={!canSubmit || booking.isPending} className="mt-4 min-h-11 w-full rounded-xl px-5 text-sm font-extrabold text-white disabled:opacity-50 sm:w-auto" style={{ background: ORANGE }}>{booking.isPending ? 'Creating booking…' : `Create ${planType} campaign — ${planType === 'weekly' ? 'UGX 25,000' : 'UGX 50,000'}`}</button>
    </form>
  )
}
