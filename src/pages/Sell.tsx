import { useState } from 'react'
import { Link } from 'react-router'
import {
  Store, TrendingUp, Truck, ShieldCheck, BadgeCheck, Upload, MapPin, FileText,
  Check, ChevronLeft, ChevronRight, MessageCircle, CircleCheckBig, Info, Wallet,
} from 'lucide-react'
import { ORANGE, WA_LINK } from '../lib/site'
import { trpc } from '@/providers/trpc'
import SellerAdBookingForm from '../components/SellerAdBookingForm'

const steps = ['Shop details', 'Verification', 'Payout', 'Review & submit']

const districts = ['Kampala', 'Wakiso', 'Mukono', 'Jinja', 'Mbale', 'Gulu', 'Lira', 'Mbarara', 'Masaka', 'Entebbe', 'Arua', 'Fort Portal', 'Other']

export default function Sell() {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    shop: '', name: '', phone: '', email: '',
    idType: 'National ID', idNumber: '', idFile: '', district: '', landmark: '', tin: '',
    payout: 'MTN MoMo', payoutNumber: '',
    commissionTermsAccepted: false,
    sellerContractAccepted: false,
  })
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const register = trpc.sellers.register.useMutation()
  const [submitted, setSubmitted] = useState(false)

  const submit = async () => {
    await register.mutateAsync({
      shopName: form.shop, ownerName: form.name, phone: form.phone,
      email: form.email || undefined, idType: form.idType, idNumber: form.idNumber,
      idPhotoName: form.idFile, district: form.district, landmark: form.landmark,
      tin: form.tin || undefined, payoutMethod: form.payout, payoutNumber: form.payoutNumber,
      commissionTermsAccepted: form.commissionTermsAccepted,
      sellerContractAccepted: form.sellerContractAccepted,
    })
    setSubmitted(true)
  }

  const stepValid = [
    form.shop && form.name && form.phone,
    form.idNumber && form.idFile && form.district,
    form.payoutNumber && form.commissionTermsAccepted,
    form.sellerContractAccepted,
  ][step]

  return (
    <div className="min-h-screen bg-[#faf9f7] text-neutral-900 antialiased">
      {/* Header */}
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

      {/* Hero / why sell */}
      <section className="bg-neutral-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Start selling on UG Souq today</h1>
          <p className="mt-3 text-neutral-300 max-w-xl">Reach buyers across Uganda, get paid by MoMo, and earn the blue Verified badge that puts your products at the top of search.</p>
          <div className="mt-8 grid sm:grid-cols-3 gap-4">
            {[
              { icon: TrendingUp, t: 'Reach thousands of buyers', d: 'Your products appear in front of shoppers across Uganda, every day.' },
              { icon: Truck, t: 'Flexible delivery', d: 'Ship with Boda Send, your own rider, or drop-off points — you choose.' },
              { icon: ShieldCheck, t: 'Get verified, sell more', d: 'Verified sellers rank first and convert better. Verification is free.' },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="bg-neutral-800 rounded-2xl p-5">
                <Icon size={22} style={{ color: ORANGE }} />
                <h3 className="font-bold mt-3">{t}</h3>
                <p className="text-sm text-neutral-400 mt-1">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Seller ads plans */}
      <section className="mx-auto max-w-6xl px-4 mt-8">
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: ORANGE }}>Seller Advertising</p>
              <h2 className="text-lg sm:text-xl font-extrabold mt-1">Run weekly or monthly ads for your shop</h2>
              <p className="text-sm text-neutral-600 mt-1">Need faster sales? Promote top products on UG Souq banners and category spots.</p>
            </div>
          </div>
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-neutral-200 p-4">
              <p className="font-bold text-sm">Weekly Ad Plan</p>
              <p className="text-2xl font-extrabold mt-1" style={{ color: ORANGE }}>UGX 25,000</p>
              <p className="text-xs text-neutral-600 mt-1">7 days promo, one product category placement, weekly insights.</p>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200 p-4">
              <p className="font-bold text-sm">Monthly Ad Plan</p>
              <p className="text-2xl font-extrabold mt-1" style={{ color: ORANGE }}>UGX 50,000</p>
              <p className="text-xs text-neutral-600 mt-1">30 days promo, broader placement, refresh + monthly performance report.</p>
            </div>
          </div>
          <SellerAdBookingForm />
        </div>
      </section>

      {/* What you'll need */}
      <section className="mx-auto max-w-6xl px-4 mt-10">
        <div className="bg-white rounded-2xl border border-neutral-200 p-6">
          <h2 className="font-extrabold text-lg">Seller setup checklist — what you'll need</h2>
          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            {[
              { icon: FileText, t: 'Phone number & email', d: 'For your account and order alerts' },
              { icon: BadgeCheck, t: 'National ID or Passport', d: 'Photo of the front — we verify the owner' },
              { icon: MapPin, t: 'Business location', d: 'District + landmark (e.g. shop, market stall)' },
              { icon: FileText, t: 'TIN (optional)', d: 'URA tax number — required only for company accounts' },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="flex gap-3 bg-neutral-50 rounded-xl p-4">
                <Icon size={18} className="shrink-0 mt-0.5" style={{ color: ORANGE }} />
                <div><p className="font-bold">{t}</p><p className="text-neutral-500 text-xs mt-0.5">{d}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Registration wizard */}
      <section className="mx-auto max-w-3xl px-4 mt-10 mb-16">
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          {/* Stepper */}
          <div className="flex border-b border-neutral-200">
            {steps.map((s, i) => (
              <div key={s} className={`flex-1 px-3 py-3.5 text-center text-xs sm:text-sm font-semibold ${i === step ? 'text-white' : i < step ? 'text-green-700 bg-green-50' : 'text-neutral-400'}`} style={i === step ? { background: ORANGE } : {}}>
                <span className="inline-flex items-center gap-1.5">{i < step ? <Check size={14} /> : null}{s}</span>
              </div>
            ))}
          </div>

          <div className="p-6 sm:p-8">
            {submitted ? (
              <div className="text-center py-8">
                <CircleCheckBig size={48} className="mx-auto text-green-600" />
                <h2 className="mt-4 font-extrabold text-xl">Application received!</h2>
                <p className="mt-2 text-sm text-neutral-600 max-w-sm mx-auto">
                  Your shop <b>{form.shop}</b> is now in review. Our verification team will check your ID and location within 1–2 business days, and we'll contact you on <b>{form.phone}</b> once your blue badge is active.
                </p>
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link to="/sell/listings" className="inline-block text-sm font-bold text-white px-6 py-3 rounded-full" style={{ background: ORANGE }}>List your first item</Link>
                  <Link to="/" className="inline-block text-sm font-bold px-6 py-3 rounded-full border border-neutral-300 hover:bg-neutral-50">Back to shop</Link>
                </div>
              </div>
            ) : step === 0 && (
              <div className="space-y-4">
                <h2 className="font-extrabold text-xl flex items-center gap-2"><Store size={20} style={{ color: ORANGE }} /> Shop details</h2>
                <Field label="Shop / business name *" value={form.shop} onChange={(v) => set('shop', v)} placeholder="e.g. Nalongo Styles" />
                <Field label="Your full name *" value={form.name} onChange={(v) => set('name', v)} placeholder="As it appears on your ID" />
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Phone (MoMo/Airtel) *" value={form.phone} onChange={(v) => set('phone', v)} placeholder="07XX XXX XXX" />
                  <Field label="Email" value={form.email} onChange={(v) => set('email', v)} placeholder="you@example.com" />
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <h2 className="font-extrabold text-xl flex items-center gap-2"><BadgeCheck size={20} className="text-sky-600" /> Verification</h2>
                <p className="text-sm text-neutral-600 bg-sky-50 border border-sky-100 rounded-xl p-3 flex gap-2"><Info size={16} className="shrink-0 text-sky-600 mt-0.5" /> This is what earns you the blue <b>Verified</b> badge and top placement. Our team reviews within 1–2 business days.</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label>ID type *</Label>
                    <select className="w-full border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-neutral-500 bg-white" value={form.idType} onChange={(e) => set('idType', e.target.value)}>
                      <option>National ID (Ndaga Muntu)</option>
                      <option>Passport</option>
                      <option>Driving permit</option>
                    </select>
                  </div>
                  <Field label="ID number *" value={form.idNumber} onChange={(v) => set('idNumber', v)} placeholder="e.g. CMXXXXXXXXXX" />
                </div>
                <div>
                  <Label>Upload ID photo (front) *</Label>
                  <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-neutral-300 rounded-2xl py-8 cursor-pointer hover:border-orange-300 hover:bg-orange-50/40 transition-colors">
                    <Upload size={22} className="text-neutral-400" />
                    {form.idFile
                      ? <span className="text-sm font-semibold text-green-700 flex items-center gap-1.5"><CircleCheckBig size={16} /> {form.idFile}</span>
                      : <span className="text-sm text-neutral-500">Tap to upload — JPG or PNG, max 5MB</span>}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => set('idFile', e.target.files?.[0]?.name ?? '')} />
                  </label>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Business district *</Label>
                    <select className="w-full border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-neutral-500 bg-white" value={form.district} onChange={(e) => set('district', e.target.value)}>
                      <option value="">Select district</option>
                      {districts.map((d) => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <Field label="Landmark / address *" value={form.landmark} onChange={(v) => set('landmark', v)} placeholder="e.g. Owino Market, Stall B12" />
                </div>
                <Field label="TIN — URA tax number (optional)" value={form.tin} onChange={(v) => set('tin', v)} placeholder="Required for registered companies" />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h2 className="font-extrabold text-xl flex items-center gap-2"><Wallet size={20} style={{ color: ORANGE }} /> Payout method</h2>
                <p className="text-sm text-neutral-600">Sales are settled weekly (every Friday) directly to your mobile money.</p>
                <div className="grid grid-cols-2 gap-3">
                  {['MTN MoMo', 'Airtel Money'].map((m) => (
                    <button key={m} type="button" onClick={() => set('payout', m)}
                      className={`rounded-2xl border-2 py-4 font-bold text-sm transition-all ${form.payout === m ? 'border-orange-500 bg-orange-50' : 'border-neutral-200 hover:border-neutral-300'}`}>
                      {m}
                    </button>
                  ))}
                </div>
                <Field label={`${form.payout} number *`} value={form.payoutNumber} onChange={(v) => set('payoutNumber', v)} placeholder="07XX XXX XXX" />
                <label className="flex items-start gap-2.5 text-sm text-neutral-600">
                  <input
                    type="checkbox"
                    checked={form.commissionTermsAccepted}
                    onChange={(e) => setForm((f) => ({ ...f, commissionTermsAccepted: e.target.checked }))}
                    className="mt-1 accent-orange-600"
                  />
                  I agree to UG Souq seller commission terms as stipulated by the platform.
                </label>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h2 className="font-extrabold text-xl flex items-center gap-2"><CircleCheckBig size={20} className="text-green-600" /> Review & submit</h2>
                <div className="text-sm divide-y divide-neutral-100 border border-neutral-200 rounded-2xl overflow-hidden">
                  {[
                    ['Shop', form.shop], ['Owner', form.name], ['Phone', form.phone],
                    ['ID', `${form.idType} · ${form.idNumber}`], ['ID photo', form.idFile],
                    ['Location', `${form.landmark ? form.landmark + ', ' : ''}${form.district}`],
                    ['TIN', form.tin || '—'], ['Payout', `${form.payout} · ${form.payoutNumber}`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex px-4 py-2.5 bg-white"><span className="w-28 text-neutral-500">{k}</span><span className="font-medium">{v}</span></div>
                  ))}
                </div>
                <label className="flex items-start gap-2.5 text-sm text-neutral-600">
                  <input
                    type="checkbox"
                    checked={form.sellerContractAccepted}
                    onChange={(e) => setForm((f) => ({ ...f, sellerContractAccepted: e.target.checked }))}
                    className="mt-1 accent-orange-600"
                  />
                  I confirm the details are correct and agree to the Seller Contract, verification policy, buyer protection policy, and anti-fraud rules.
                </label>
              </div>
            )}

            {/* Nav */}
            {!submitted && (
              <div className="mt-8 flex items-center justify-between">
                <button disabled={step === 0} onClick={() => setStep((s) => s - 1)} className="flex items-center gap-1 text-sm font-semibold text-neutral-600 disabled:opacity-30">
                  <ChevronLeft size={16} /> Back
                </button>
                {step < 3 ? (
                  <button disabled={!stepValid} onClick={() => setStep((s) => s + 1)} className="flex items-center gap-1.5 text-sm font-bold text-white px-6 py-2.5 rounded-full disabled:opacity-40" style={{ background: ORANGE }}>
                    Continue <ChevronRight size={16} />
                  </button>
                ) : (
                  <button disabled={register.isPending} onClick={submit} className="flex items-center gap-1.5 text-sm font-bold text-white px-6 py-2.5 rounded-full disabled:opacity-40" style={{ background: ORANGE }}>
                    {register.isPending ? 'Submitting…' : 'Submit for verification'} <BadgeCheck size={16} />
                  </button>
                )}
              </div>
            )}
            {register.isError && <p className="mt-3 text-sm text-red-600 text-center">Submission failed — please try again.</p>}
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-neutral-500 flex items-center justify-center gap-1.5">
          <ShieldCheck size={14} /> Your ID is encrypted, used only for verification, and never shown to buyers.
        </p>
      </section>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-semibold mb-1.5">{children}</label>
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-neutral-500" />
    </div>
  )
}
