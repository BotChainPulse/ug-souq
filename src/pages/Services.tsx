import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { trpc } from '../providers/trpc'
import { getAccount } from '../lib/account'
import { SERVICE_CATEGORIES } from '../lib/servicePolicy'
import { fmt } from '../lib/cart'

export default function Services() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [district, setDistrict] = useState('')
  const [category, setCategory] = useState<typeof SERVICE_CATEGORIES[number] | ''>('')
  const [account] = useState(getAccount)
  const [selected, setSelected] = useState<number | null>(null)
  const [brief, setBrief] = useState('')
  const [requestDistrict, setRequestDistrict] = useState('')
  const [preferredDate, setPreferredDate] = useState('')
  const [consent, setConsent] = useState(false)
  const directory = trpc.services.browse.useQuery({ q, district, category: category || undefined })
  const request = trpc.services.requestQuote.useMutation()
  const chooseProvider = (id: number, area: string) => { setSelected(id); setRequestDistrict(area); request.reset(); setBrief(''); setConsent(false) }
  return <div className="min-h-screen bg-neutral-50"><Header /><main className="mx-auto max-w-6xl px-4 py-8">
    <div className="flex flex-wrap justify-between gap-4"><div><p className="font-bold text-green-800">UGSouq Services · Pilot</p><h1 className="text-3xl font-black mt-2">Find a service provider</h1><p className="mt-3 text-neutral-600">Trades, property, vehicle, household and creative services across Uganda.</p></div><Link to="/services/register" className="self-start rounded-xl bg-green-800 px-5 py-3 font-bold text-white">Become a service provider</Link></div>
    <section className="mt-6 rounded-xl border bg-white p-4"><h2 className="font-bold">Healthcare services</h2><p className="mt-2 text-sm text-neutral-600">Doctors and pharmacists have a separate directory and licence review.</p><div className="mt-3 flex flex-wrap gap-3"><Link to="/healthcare" className="rounded-lg border px-4 py-2 font-bold text-green-800">Find doctors and pharmacists</Link><Link to="/healthcare/register?profession=doctor" className="rounded-lg border px-4 py-2 font-bold text-green-800">Register as a Doctor</Link><Link to="/healthcare/register?profession=pharmacist" className="rounded-lg border px-4 py-2 font-bold text-green-800">Register as a Pharmacist</Link></div></section>
    <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">Request a quote first. An enquiry does not confirm a booking or charge you. Agree the work, materials, timing and final price in writing. Administrator review is not a guarantee of workmanship or a professional licence.</div>
    <div className="mt-6 grid gap-3 sm:grid-cols-3"><label className="text-sm font-semibold">Search services<input value={q} maxLength={100} onChange={e => setQ(e.target.value)} className="block w-full border rounded-lg p-3 mt-1" placeholder="e.g. cleaning" /></label><label className="text-sm font-semibold">Category<select value={category} onChange={e => { const value = e.target.value; if (value === 'doctor' || value === 'pharmacist') { navigate('/healthcare'); return }; setCategory(value as typeof category) }} className="block w-full border rounded-lg p-3 mt-1"><option value="">All services</option><optgroup label="General services">{SERVICE_CATEGORIES.map(c => <option key={c}>{c}</option>)}</optgroup><optgroup label="Healthcare directory"><option value="doctor">Doctor</option><option value="pharmacist">Pharmacist</option></optgroup></select></label><label className="text-sm font-semibold">District<input value={district} maxLength={64} onChange={e => setDistrict(e.target.value)} className="block w-full border rounded-lg p-3 mt-1" placeholder="e.g. Wakiso" /></label></div>
    {directory.isLoading && <p className="mt-8">Loading providers…</p>}
    {directory.error && <div role="alert" className="mt-6 text-red-700">Unable to load providers. <button onClick={() => directory.refetch()} className="underline">Retry</button></div>}
    {!directory.isLoading && !directory.error && !directory.data?.length && <div className="mt-8 rounded-2xl bg-white border p-8"><h2 className="font-bold">No approved providers match yet</h2><p className="mt-2 text-neutral-600">Applications are welcome. Profiles appear after review; we do not display demo providers.</p></div>}
    <div className="grid gap-4 mt-6 sm:grid-cols-2 lg:grid-cols-3">{directory.data?.map(p => <article key={p.id} className="rounded-2xl bg-white border p-5"><p className="text-xs font-bold text-green-800">{p.category} · {p.district}</p><h2 className="font-black text-xl mt-2">{p.businessName}</h2><p className="mt-3 text-sm whitespace-pre-wrap">{p.description}</p><p className="font-bold mt-4">{p.priceUnit === 'quote' ? 'Price on quotation' : `From ${fmt(p.startingPrice ?? 0)} / ${p.priceUnit}`}</p><button className="mt-4 rounded-lg bg-green-800 px-4 py-3 text-white font-bold" onClick={() => chooseProvider(p.id, p.district)}>Request a quote</button>
      {selected === p.id && <div className="mt-5 border-t pt-4">{!account?.deletionToken ? <p><Link className="underline font-bold" to="/account">Create or open your buyer account</Link> on its secured device to request a quote.</p> : request.data ? <p role="status" className="text-green-800">Request {request.data.reference} received. UGSouq support will coordinate the quotation. No booking or payment has been made.</p> : <form onSubmit={e => { e.preventDefault(); request.mutate({ phone: account.phone, providerId: p.id, brief, district: requestDistrict, preferredDate: preferredDate || undefined, contactConsent: true }) }} className="space-y-3"><label className="block text-sm font-semibold">What work do you need?<textarea required minLength={20} maxLength={1000} value={brief} onChange={e => setBrief(e.target.value)} className="block w-full rounded-lg border p-2 mt-1" /></label><label className="block text-sm font-semibold">Service district<input required minLength={2} maxLength={64} value={requestDistrict} onChange={e => setRequestDistrict(e.target.value)} className="block w-full rounded-lg border p-2 mt-1" /></label><label className="block text-sm font-semibold">Preferred date (not confirmed)<input type="date" value={preferredDate} onChange={e => setPreferredDate(e.target.value)} className="block w-full rounded-lg border p-2 mt-1" /></label><label className="flex gap-2 text-xs"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />I allow UGSouq to use my account contact details to coordinate this enquiry with the provider. Do not include PINs, card details or identity documents.</label>{request.error && <p role="alert" className="text-red-700 text-sm">{request.error.message}</p>}<button disabled={!consent || request.isPending} className="bg-green-800 rounded-lg px-4 py-2 text-white disabled:opacity-50">{request.isPending ? 'Sending…' : 'Send enquiry'}</button></form>}</div>}
    </article>)}</div>
    <p className="mt-8 text-sm"><Link to="/services/terms" className="underline">Provider agreement & proposed commission</Link> · <Link to="/support" className="underline">Service support</Link></p>
  </main><Footer /></div>
}
