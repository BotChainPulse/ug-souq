import { useState } from 'react'
import { Link } from 'react-router'
import {
  MessageCircle, Package, Clock, CircleCheckBig, XCircle, Store,
  Smartphone, Info, RefreshCcw, Plus, BadgeCheck,
} from 'lucide-react'
import { ORANGE, WA_LINK } from '../lib/site'
import { trpc } from '@/providers/trpc'
import { CATEGORIES } from '../lib/categories'
import { Camera, X } from 'lucide-react'

// Compress a phone photo to a small JPEG data URL so it fits in the database
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const max = 800
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      // Keep the data URL small enough to save reliably; step down quality if needed.
      let quality = 0.82
      let data = canvas.toDataURL('image/jpeg', quality)
      while (data.length > 350_000 && quality > 0.4) {
        quality -= 0.1
        data = canvas.toDataURL('image/jpeg', quality)
      }
      resolve(data)
    }
    img.onerror = reject
    img.src = url
  })
}

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
    name: '', category: 'phones', price: '', oldPrice: '', stock: '1',
    condition: 'new' as 'new' | 'refurbished' | 'used', warrantyMonths: '6', imageNote: '',
  })
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const [justAdded, setJustAdded] = useState(false)
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const onPhoto = async (file?: File) => { if (!file) return; setPhotoBusy(true); try { setPhoto(await fileToDataUrl(file)); } catch { setPhoto(null); } finally { setPhotoBusy(false); } };

  const seller = lookup.data
  const approved = seller?.status === 'approved'

  const canSubmit =
    approved &&
    form.name.trim().length >= 3 &&
    Number(form.price) >= 100 &&
    Number(form.stock) >= 1 &&
    photo !== null && !photoBusy &&
    (form.condition === 'new' || Number(form.warrantyMonths) >= 1)

  const submit = async () => {
    await addListing.mutateAsync({
      phone: searched,
      name: form.name.trim(),
      category: form.category,
      price: Number(form.price),
      oldPrice: form.oldPrice ? Number(form.oldPrice) : undefined,
      stock: Number(form.stock),
      condition: form.condition,
      warrantyMonths: form.condition === 'new' ? 0 : Number(form.warrantyMonths),
      imageNote: form.imageNote.trim() || undefined,
      imageData: photo ?? undefined,
    })
    setForm({ name: '', category: 'phones', price: '', oldPrice: '', stock: '1', condition: 'new', warrantyMonths: '6', imageNote: '' })
    setPhoto(null)
    setJustAdded(true)
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
            <div className="mt-4 flex items-center gap-3 bg-neutral-50 border border-neutral-200 rounded-xl p-4">
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
          )}
        </div>

        {/* Step 2: listing form */}
        {seller && !approved && (
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-6 text-sm">
            <b>Your shop is not approved yet.</b> Once our team approves your shop (1–2 business days), come back here to add your items.
          </div>
        )}

        {approved && (
          <div className="mt-6 bg-white rounded-2xl border border-neutral-200 p-6">
            <h2 className="font-extrabold flex items-center gap-2"><Plus size={18} style={{ color: ORANGE }} /> 2. Item details</h2>

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
                    type="number" min={1} value={form.stock}
                    onChange={(e) => set('stock', e.target.value)}
                    className="mt-1 w-full h-11 rounded-xl border border-neutral-300 px-4 text-sm outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-neutral-600 uppercase tracking-wide">Price (UGX) *</label>
                  <input
                    type="number" min={100} value={form.price}
                    onChange={(e) => set('price', e.target.value)}
                    placeholder="e.g. 780000"
                    className="mt-1 w-full h-11 rounded-xl border border-neutral-300 px-4 text-sm outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-600 uppercase tracking-wide">Old price (UGX) — optional</label>
                  <input
                    type="number" min={0} value={form.oldPrice}
                    onChange={(e) => set('oldPrice', e.target.value)}
                    placeholder="Shows as a discount"
                    className="mt-1 w-full h-11 rounded-xl border border-neutral-300 px-4 text-sm outline-none focus:border-orange-500"
                  />
                </div>
              </div>

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

              <div>
                <label className="text-xs font-bold text-neutral-600 uppercase tracking-wide">Item photo — required *</label>
                <p className="mt-1 text-xs text-neutral-500">
                  Take a photo of the <b>actual item</b> with your phone — new, refurbished and used items all need a real photo.
                  Good light, whole item visible, no screenshots or internet downloads. Our team checks every photo before your item goes live; fake photos get your shop flagged.
                </p>
                {photo ? (
                  <div className="mt-3 relative w-40">
                    <img src={photo} alt="Item" className="w-40 h-40 object-cover rounded-xl border border-neutral-200" />
                    <button
                      type="button"
                      onClick={() => setPhoto(null)}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-neutral-900 text-white grid place-items-center"
                      title="Remove photo"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <label className="mt-3 flex flex-col items-center justify-center gap-2 w-full sm:w-64 h-36 rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors">
                    <Camera size={24} style={{ color: ORANGE }} />
                    <span className="text-sm font-semibold text-neutral-600">{photoBusy ? 'Processing…' : 'Tap to photograph or upload the item'}</span>
                    <span className="text-[11px] text-neutral-400">JPG or PNG — we compress it automatically</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => onPhoto(e.target.files?.[0])}
                    />
                  </label>
                )}
              </div>

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

              <button
                onClick={submit}
                disabled={!canSubmit || addListing.isPending}
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
                <div key={l.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {(l as { imageData?: string | null }).imageData ? (
                      <img src={(l as { imageData?: string | null }).imageData!} alt={l.name} className="w-12 h-12 rounded-lg object-cover border border-neutral-200 shrink-0" />
                    ) : (
                      <span className="w-12 h-12 rounded-lg bg-neutral-100 grid place-items-center shrink-0"><Package size={18} className="text-neutral-400" /></span>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{l.name}</p>
                      <p className="text-xs text-neutral-500">
                        {fmt(l.price)} · {l.condition}{l.condition !== 'new' ? `, ${l.warrantyMonths}mo warranty` : ''} · stock {l.stock}
                      </p>
                    </div>
                  </div>
                  <StatusPill status={l.status} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
