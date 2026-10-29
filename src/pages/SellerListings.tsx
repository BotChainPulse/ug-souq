import ProductDetailsEditor from '../components/ProductDetailsEditor'
import { specificationIssue, type Specification, type PRODUCT_TYPES } from '../lib/productDetails'
import SizeStockEditor from '../components/SizeStockEditor'
import { readSizes, needsSize, sizeTotal, validateSizes, type SizeOption } from '../lib/sizes'
import { discountedPrice, listingPrice } from '../lib/listingOffer'
import { useState } from 'react'
import { Link } from 'react-router'
import {
  MessageCircle, Package, Clock, CircleCheckBig, XCircle, Store,
  Smartphone, Info, RefreshCcw, Plus, BadgeCheck,
} from 'lucide-react'
import { ORANGE, WA_LINK, WHATSAPP_INTL } from '../lib/site'
import { trpc } from '@/providers/trpc'
import { CATEGORIES } from '../lib/categories'
import ListingPhotoEditor from '../components/ListingPhotoEditor'
import ListingPhotoManager from '../components/ListingPhotoManager'

const conditions = [
  { value: 'new', label: 'New', hint: 'Brand new, sealed or unused.' },
  { value: 'refurbished', label: 'Refurbished', hint: 'Professionally restored & tested. Warranty required.' },
  { value: 'used', label: 'Used', hint: 'Second-hand, honestly described.' },
] as const

function fmt(n: number | null | undefined) {
  const val = Number(n);
  if (!Number.isFinite(val)) return 'UGX 0';
  return 'UGX ' + val.toLocaleString('en-US');
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
    pending: { cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Clock size={12} />, label: 'In review' },
    approved: { cls: 'bg-green-50 text-green-700 border-green-200', icon: <CircleCheckBig size={12} />, label: 'Live on market' },
    rejected: { cls: 'bg-red-50 text-red-700 border-red-200', icon: <XCircle size={12} />, label: 'Rejected' },
  }
  const m = map[status] ?? map.pending
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${m.cls}`}>
      {m.icon} {m.label}
    </span>
  )
}

export default function SellerListings() {
  const [phone, setPhone] = useState('')
  const [searched, setSearched] = useState('')
  const lookup = trpc.sellers.lookup.useQuery(
    { phone: searched },
    { enabled: searched.length >= 9, retry: false },
  )
  const addListing = trpc.sellers.addListing.useMutation({
    onSuccess: () => lookup.refetch(),
  })

  const [form, setForm] = useState({
    name: '', category: 'phones', price: '', offerPercent: '', offerStartsAt: '', offerEndsAt: '', stock: '1',
    condition: 'new' as 'new' | 'refurbished' | 'used', warrantyMonths: '6', imageNote: '',
    isBranded: false, brandName: '', authenticityEvidence: '',
  })
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const [sizeOptions, setSizeOptions] = useState<SizeOption[]>([])
  const [useSizes, setUseSizes] = useState(false)
  const [productType, setProductType] = useState('general')
  const [specifications, setSpecifications] = useState<Specification[]>([])
  const details = { ...form, productType, specifications, requiresSize: useSizes }
  const sized = needsSize(details)
  const specsError = specificationIssue(details)
  let sizesValid = true
  try { if (sized) { const checked = validateSizes(sizeOptions); sizesValid = checked.length > 0 && sizeTotal(checked) > 0 && sizeTotal(checked) <= 10000 } } catch { sizesValid = false }
  const [justAdded, setJustAdded] = useState(false)
  const [photos, setPhotos] = useState<string[]>([])
  const [photoBusy, setPhotoBusy] = useState(false)

  const seller = lookup.data
  const approved = seller?.status === 'approved'
  const plan = seller?.plan
  const hasListingSlot = !plan || plan.listingsUsed < plan.listingLimit

  const percent = Number(form.offerPercent)
  const hasOffer = form.offerPercent !== ''
  const offerValid = !hasOffer || (Number.isInteger(percent) && percent >= 1 && percent <= 99 &&
    discountedPrice(Number(form.price), percent) >= 100 && !!form.offerStartsAt && !!form.offerEndsAt &&
    new Date(form.offerEndsAt) > new Date(form.offerStartsAt) && new Date(form.offerEndsAt) > new Date())

  const submissionIssues = [
    !approved && 'Your shop must be approved before you can submit an item.',
    !hasListingSlot && 'Your shop has reached its listing limit.',
    form.name.trim().length < 3 && 'Enter an item name with at least 3 characters.',
    !(Number.isInteger(Number(form.price)) && Number(form.price) >= 100 && Number(form.price) <= 2_000_000_000) && 'Enter a whole regular price from UGX 100 to UGX 2,000,000,000.',
    !offerValid && 'Check the discount and its start and end dates.',
    !(sized || (Number.isInteger(Number(form.stock)) && Number(form.stock) >= 1 && Number(form.stock) <= 10000)) && 'Enter available stock from 1 to 10,000.',
    !sizesValid && 'Add valid sizes and available stock for each size.',
    specsError,
    photos.length === 0 && 'Add at least one item photo.',
    photoBusy && 'Wait for the photos to finish preparing.',
    form.isBranded && !(form.brandName.trim().length >= 2 && form.authenticityEvidence.trim().length >= 10) && 'Enter the brand name and authenticity evidence.',
    !(form.condition === 'new' || Number(form.warrantyMonths) >= 1) && 'Select a seller warranty for this used or refurbished item.',
  ].filter((issue): issue is string => typeof issue === 'string' && issue.length > 0)
  const canSubmit = submissionIssues.length === 0

  const submit = async () => {
    if (!canSubmit || addListing.isPending) return
    try { await addListing.mutateAsync({
      phone: searched,
      name: form.name.trim(),
      category: form.category,
      productType: productType as typeof PRODUCT_TYPES[number], requiresSize: sized, specifications,
      price: Number(form.price),
      offerPercent: hasOffer ? percent : undefined,
      offerStartsAt: hasOffer ? new Date(form.offerStartsAt).toISOString() : undefined,
      offerEndsAt: hasOffer ? new Date(form.offerEndsAt).toISOString() : undefined,
      stock: sized ? sizeTotal(sizeOptions) : Number(form.stock),
      sizeOptions: sized ? validateSizes(sizeOptions) : undefined,
      condition: form.condition,
      warrantyMonths: form.condition === 'new' ? 0 : Number(form.warrantyMonths),
      isBranded: form.isBranded,
      brandName: form.isBranded ? form.brandName.trim() : undefined,
      authenticityEvidence: form.isBranded ? form.authenticityEvidence.trim() : undefined,
      imageNote: form.imageNote.trim() || undefined,
      imageData: photos[0],
      additionalImages: photos.slice(1),
    })
    setForm({ name: '', category: 'phones', price: '', offerPercent: '', offerStartsAt: '', offerEndsAt: '', stock: '1', condition: 'new', warrantyMonths: '6', imageNote: '', isBranded: false, brandName: '', authenticityEvidence: '' })
    setPhotos([])
    setSizeOptions([])
    setUseSizes(false)
    setProductType('general')
    setSpecifications([])
    setJustAdded(true)
    } catch { /* The mutation error is displayed beside the submit button. */ }
  }

  return (
    <div className="min-h-screen bg-[#faf9f7] text-neutral-900 antialiased">
      <header className="bg-white border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo-mark.png" alt="UG Souq logo" className="w-8 h-8 rounded-lg object-cover bg-white" />
            <span className="font-extrabold text-lg">UG Souq <span className="font-semibold text-neutral-500">Seller Center</span></span>
          </Link>
          <a href={WA_LINK} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-semibold text-green-700 bg-green-50 border border-green-200 px-4 py-2 rounded-full hover:bg-green-100">
            <MessageCircle size={16} /> Seller support
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">List an item for sale</h1>
        <p className="mt-2 text-neutral-600 max-w-xl">
          New, refurbished or second-hand — submit your item here. Our team reviews every listing before it goes live on the market.
        </p>

        <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          <b>Your price, your offer.</b> Set a regular price and an optional discount from 1–99% with start and end dates.
          Our team reviews the price and offer before publication. Approved, in-stock offers appear in Deals during their offer window.
          The regular price returns when the offer ends. Featured advertising is booked separately.
        </div>

        {/* Step 1: identify shop */}
        <div className="mt-8 bg-white rounded-2xl border border-neutral-200 p-6">
          <h2 className="font-extrabold flex items-center gap-2"><Smartphone size={18} style={{ color: ORANGE }} /> 1. Find your shop</h2>
          <p className="text-sm text-neutral-500 mt-1">Enter the phone number you registered your shop with.</p>
          <div className="mt-4 flex gap-2">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07XX XXX XXX"
              className="flex-1 h-11 rounded-xl border border-neutral-300 px-4 text-sm outline-none focus:border-orange-500"
            />
            <button
              onClick={() => { setSearched(phone.trim()); setJustAdded(false) }}
              disabled={phone.trim().length < 9}
              className="h-11 px-5 rounded-xl text-sm font-bold text-white disabled:opacity-40"
              style={{ background: ORANGE }}
            >
              Find shop
            </button>
          </div>

          {searched && lookup.isLoading && <p className="mt-3 text-sm text-neutral-500">Checking…</p>}

          {searched && lookup.data === null && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
              <b>No shop found for {searched}.</b> You need to register your shop before listing items.{' '}
              <Link to="/sell" className="font-bold underline" style={{ color: ORANGE }}>Register your shop →</Link>
            </div>
          )}

          {seller && (
            <div className="mt-4 bg-neutral-50 border border-neutral-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl grid place-items-center text-white font-extrabold" style={{ background: ORANGE }}>
                <Store size={18} />
              </span>
              <div>
                <p className="font-bold flex items-center gap-1.5">
                  {seller.shopName}
                  {!!seller.verified && <BadgeCheck size={16} className="text-sky-600" />}
                </p>
                <p className="text-xs text-neutral-500">
                  {seller.ownerName} · {seller.district} ·{' '}
                  {seller.status === 'approved' ? 'Approved — you can list items' : seller.status === 'pending' ? 'Still in review' : 'Rejected'}
                </p>
              </div>
              </div>
              {plan && (
                <div className="mt-3 flex flex-col gap-2 border-t border-neutral-200 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-neutral-600"><b>{plan.tier === 'partner' ? 'Signed pilot' : plan.tier === 'pro' ? 'Seller Pro' : 'Free plan'}</b> · {plan.listingsUsed}/{plan.listingLimit} listing slots · {Number((plan.commissionRate * 100).toFixed(2))}% commission</p>
                  {plan.tier === 'free' && (
                    <a href={`https://wa.me/${WHATSAPP_INTL}?text=${encodeURIComponent(`Hi UG Souq, I want to upgrade ${seller.shopName} to Seller Pro for UGX ${plan.monthlyFee.toLocaleString()} per month.`)}`} target="_blank" rel="noreferrer" className="text-xs font-bold text-violet-700 underline">Upgrade to Seller Pro</a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step 2: listing form */}
        {seller && !approved && (
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-6 text-sm">
            <b>Your shop is not approved yet.</b> Once an administrator completes the review and approves your shop, come back here to add your items.
          </div>
        )}

        {approved && (
          <div className="mt-6 bg-white rounded-2xl border border-neutral-200 p-6">
            <h2 className="font-extrabold flex items-center gap-2"><Plus size={18} style={{ color: ORANGE }} /> 2. Item details</h2>

            {!hasListingSlot && (
              <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">
                <b>Your {plan?.tier === 'partner' ? 'pilot' : plan?.tier === 'pro' ? 'Seller Pro' : 'free'} listing slots are full.</b>{' '}
                {plan?.tier === 'free' ? 'Seller Pro allows up to 50 active listings and reduces marketplace commission from 7% to 5%.' : 'Contact seller support for a larger business arrangement.'}
              </div>
            )}

            {justAdded && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800 flex items-center gap-2">
                <CircleCheckBig size={16} /> Listing submitted! It's now in review — see it in "My listings" below.
              </div>
            )}

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-600 uppercase tracking-wide">Item name *</label>
                <input
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="e.g. Refurbished iPhone 11, 64GB — Grade A"
                  className="mt-1 w-full h-11 rounded-xl border border-neutral-300 px-4 text-sm outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-neutral-600 uppercase tracking-wide">Category *</label>
                  <select
                    value={form.category}
                    onChange={(e) => set('category', e.target.value)}
                    className="mt-1 w-full h-11 rounded-xl border border-neutral-300 px-3 text-sm bg-white outline-none focus:border-orange-500"
                  >
                    {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-600 uppercase tracking-wide">Stock available *</label>
                  <input
                    type="number" min={1} disabled={sized} value={sized ? sizeTotal(sizeOptions) || 0 : form.stock}
                    onChange={(e) => set('stock', e.target.value)}
                    className="mt-1 w-full h-11 rounded-xl border border-neutral-300 px-4 text-sm outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <label className="flex gap-2 text-sm"><input type="checkbox" checked={sized} disabled={needsSize({ ...details, requiresSize: false })} onChange={event => setUseSizes(event.target.checked)} />This item is sold in sizes</label>
              <ProductDetailsEditor item={details} value={specifications} onChange={setSpecifications} onTypeChange={setProductType} />
              {specsError && <p className="text-sm text-amber-800">{specsError}</p>}
              {sized && <><SizeStockEditor value={sizeOptions} onChange={setSizeOptions} />{!sizesValid && <p role="alert" className="text-sm text-red-700">Add distinct size labels and available stock before submitting.</p>}</>}

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-neutral-600 uppercase tracking-wide">Regular price (UGX) *</label>
                  <input
                    type="number" min={100} value={form.price}
                    onChange={(e) => set('price', e.target.value)}
                    placeholder="e.g. 780000"
                    className="mt-1 w-full h-11 rounded-xl border border-neutral-300 px-4 text-sm outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label htmlFor="offer-percent" className="text-xs font-bold text-neutral-600 uppercase tracking-wide">Discount % — optional</label>
                  <input id="offer-percent" type="number" min={1} max={99} step={1} value={form.offerPercent}
                    onChange={(e) => set('offerPercent', e.target.value)} placeholder="e.g. 10"
                    className="mt-1 w-full h-11 rounded-xl border border-neutral-300 px-4 text-sm outline-none focus:border-orange-500" />
                </div>
              </div>
              {hasOffer && <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-3">
                <p className="font-bold text-green-800">Offer price: {fmt(discountedPrice(Number(form.price), percent))}</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><label htmlFor="offer-start" className="text-sm font-semibold">Offer starts</label><input id="offer-start" type="datetime-local" value={form.offerStartsAt} onChange={(e) => set('offerStartsAt', e.target.value)} className="mt-1 w-full min-w-0 rounded-lg border p-2 bg-white" /></div>
                  <div><label htmlFor="offer-end" className="text-sm font-semibold">Offer ends</label><input id="offer-end" type="datetime-local" value={form.offerEndsAt} onChange={(e) => set('offerEndsAt', e.target.value)} className="mt-1 w-full min-w-0 rounded-lg border p-2 bg-white" /></div>
                </div>
                <p className="text-xs text-green-900">Dates use your device’s local time zone ({Intl.DateTimeFormat().resolvedOptions().timeZone}). Approval is required; an offer may expire while awaiting review.</p>
                {!offerValid && <p role="alert" className="text-sm text-red-700">Enter a whole discount from 1–99%, a final price of at least UGX 100, and valid start/end dates.</p>}
              </div>}

              <div>
                <label className="text-xs font-bold text-neutral-600 uppercase tracking-wide">Condition *</label>
                <div className="mt-2 grid sm:grid-cols-3 gap-3">
                  {conditions.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => set('condition', c.value)}
                      className={`text-left rounded-xl border-2 p-4 transition ${
                        form.condition === c.value ? 'border-orange-500 bg-orange-50' : 'border-neutral-200 bg-white hover:border-neutral-300'
                      }`}
                    >
                      <p className="font-bold flex items-center gap-1.5">
                        {c.value === 'refurbished' && <RefreshCcw size={14} style={{ color: ORANGE }} />}
                        {c.label}
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">{c.hint}</p>
                    </button>
                  ))}
                </div>
              </div>

              {form.condition !== 'new' && (
                <div>
                  <label className="text-xs font-bold text-neutral-600 uppercase tracking-wide">Warranty (months) *</label>
                  <select
                    value={form.warrantyMonths}
                    onChange={(e) => set('warrantyMonths', e.target.value)}
                    className="mt-1 w-full h-11 rounded-xl border border-neutral-300 px-3 text-sm bg-white outline-none focus:border-orange-500"
                  >
                    {[1, 3, 6, 12, 24].map((m) => <option key={m} value={m}>{m} month{m > 1 ? 's' : ''}</option>)}
                  </select>
                  <p className="mt-1.5 text-xs text-neutral-500 flex items-center gap-1">
                    <Info size={12} /> Refurbished and used items must carry a seller warranty — buyers see it on the product page.
                  </p>
                </div>
              )}

              <div className="rounded-2xl border border-neutral-200 p-4">
                <label className="flex items-start gap-3 text-sm font-semibold">
                  <input type="checkbox" checked={form.isBranded} onChange={(event) => setForm((current) => ({ ...current, isBranded: event.target.checked }))} className="mt-1 accent-orange-600" />
                  <span>This is a branded product <span className="block text-xs font-normal text-neutral-500">Examples: Samsung, Nike, Apple, Tecno or another protected brand.</span></span>
                </label>
                {form.isBranded && (
                  <div className="mt-4 space-y-3 border-t border-neutral-100 pt-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wide text-neutral-600">Brand name *</label>
                      <input value={form.brandName} onChange={(event) => set('brandName', event.target.value)} placeholder="e.g. Samsung" className="mt-1 h-11 w-full rounded-xl border border-neutral-300 px-4 text-sm outline-none focus:border-orange-500" />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wide text-neutral-600">Authenticity evidence *</label>
                      <textarea value={form.authenticityEvidence} onChange={(event) => set('authenticityEvidence', event.target.value)} maxLength={1000} rows={3} placeholder="State your supplier, invoice/reference, serial or IMEI availability, or brand authorization. Do not enter payment PINs." className="mt-1 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-orange-500" />
                      <p className="mt-1 text-xs text-neutral-500">An administrator checks this before publishing. False evidence can lead to suspension or termination.</p>
                    </div>
                  </div>
                )}
              </div>

              <ListingPhotoEditor value={photos} onChange={setPhotos} onBusyChange={setPhotoBusy} disabled={addListing.isPending} />

              <div>
                <label className="text-xs font-bold text-neutral-600 uppercase tracking-wide">Photo notes — optional</label>
                <input
                  value={form.imageNote}
                  onChange={(e) => set('imageNote', e.target.value)}
                  placeholder="e.g. Small scratch on the back cover, shown in photo"
                  className="mt-1 w-full h-11 rounded-xl border border-neutral-300 px-4 text-sm outline-none focus:border-orange-500"
                />
              </div>

              {addListing.error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{addListing.error.message}</p>
              )}

              {submissionIssues.length > 0 && <div id="listing-submit-help" role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                <p className="font-semibold">Before you can submit:</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">{submissionIssues.map(issue => <li key={issue}>{issue}</li>)}</ul>
              </div>}
              <button
                onClick={submit}
                disabled={!canSubmit || addListing.isPending}
                aria-describedby={submissionIssues.length > 0 ? 'listing-submit-help' : undefined}
                className="w-full h-12 rounded-xl text-sm font-bold text-white disabled:opacity-40"
                style={{ background: ORANGE }}
              >
                {addListing.isPending ? 'Submitting…' : 'Submit for review'}
              </button>
            </div>
          </div>
        )}

        {/* My listings */}
        {seller && seller.listings.length > 0 && (
          <div className="mt-6 bg-white rounded-2xl border border-neutral-200 p-6">
            <h2 className="font-extrabold flex items-center gap-2"><Package size={18} style={{ color: ORANGE }} /> My listings</h2>
            <div className="mt-4 divide-y divide-neutral-100">
              {seller.listings.map((l) => (
                <div key={l.id} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {(l as { imageData?: string | null }).imageData ? (
                      <img src={(l as { imageData?: string | null }).imageData!} alt={l.name} className="h-12 w-12 shrink-0 rounded-lg border border-neutral-200 bg-neutral-50 object-contain p-1" />
                    ) : (
                      <span className="w-12 h-12 rounded-lg bg-neutral-100 grid place-items-center shrink-0"><Package size={18} className="text-neutral-400" /></span>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{l.name}</p>
                      <p className="text-xs text-neutral-500">
                        {fmt(listingPrice(l).price)} · {l.condition}{l.condition !== 'new' ? `, ${l.warrantyMonths}mo warranty` : ''} · stock {l.stock}
                      </p>
                      {readSizes(l.sizeOptions).length > 0 && <p className="text-xs text-neutral-600 break-words">Sizes: {readSizes(l.sizeOptions).map(size => `${size.label}: ${size.stock}`).join(" · ")}</p>}
                    </div>
                  </div>
                  <div className="text-right shrink-0"><StatusPill status={l.status} />{l.offerPercent && <p className="mt-1 text-xs text-neutral-600">{l.offerPercent}% offer · {listingPrice(l).offerActive ? 'within offer window' : 'outside offer window'}</p>}</div>
                </div>
                {approved && !['suspended', 'terminated'].includes(l.status) && <ListingPhotoManager listing={l} phone={searched} onSaved={() => { void lookup.refetch() }} /> }
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

