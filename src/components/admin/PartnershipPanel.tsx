import { useState } from 'react'
import { trpc } from '../../providers/trpc'

const day = (value: Date | string) => new Date(value).toISOString().slice(0, 10)
const inputClass = 'w-full rounded-lg border border-neutral-300 p-2 text-sm'

export default function PartnershipPanel({ adminKey, sellerId, onChanged }: { adminKey: string; sellerId: number; onChanged: () => void }) {
 const today = new Date()
 const [form, setForm] = useState({ reference: '', version: '1.0', commission: '3', limit: '20', starts: day(today), ends: day(new Date(today.getTime() + 90 * 86400000)), promotion: '', sellerSignatory: '', platformSignatory: '', signed: '', terms: '', verified: false })
 const [file, setFile] = useState<{ name: string; data: string } | null>(null)
 const [error, setError] = useState('')
 const [reading, setReading] = useState(false)
 const [creating, setCreating] = useState(false)
 const [expanded, setExpanded] = useState(false)
 const records = trpc.admin.partnerships.list.useQuery({ key: adminKey, sellerId }, { enabled: expanded })
 const changed = () => { records.refetch(); onChanged() }
 const create = trpc.admin.partnerships.create.useMutation({ onSuccess: () => { setCreating(false); setFile(null); setError(''); changed() }, onError: e => setError(e.message) })
 const end = trpc.admin.partnerships.end.useMutation({ onSuccess: changed, onError: e => setError(e.message) })
 const document = trpc.admin.partnerships.document.useMutation({ onSuccess: result => {
  const bytes = Uint8Array.from(atob(result.data.split(',')[1]), ch => ch.charCodeAt(0))
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
  const anchor = window.document.createElement('a'); anchor.href = url; anchor.download = result.name; anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
 }, onError: e => setError(e.message) })
 const field = (key: keyof typeof form, value: string | boolean) => setForm(previous => ({ ...previous, [key]: value }))
 const save = (status: 'draft' | 'active') => {
  setError('')
  if (status === 'active' && !window.confirm(`Activate this signed pilot at ${form.commission}% commission with ${form.limit} listing slots from ${form.starts} until ${form.ends}? This changes future order fees and listing limits.`)) return
  create.mutate({ key: adminKey, sellerId, reference: form.reference, version: form.version, status, commissionRate: Number(form.commission) / 100, listingLimit: Number(form.limit), startsAt: new Date(form.starts), endsAt: new Date(form.ends), promotionEndsAt: form.promotion ? new Date(form.promotion) : null, sellerSignatory: form.sellerSignatory, platformSignatory: form.platformSignatory, signedAt: form.signed ? new Date(form.signed) : null, termsText: form.terms, signaturesVerified: form.verified, documentData: file?.data, documentName: file?.name })
 }
 const loadPdf = async (picked?: File) => {
  setError(''); setFile(null)
  if (!picked) return
  if (picked.size > 2_000_000 || !picked.name.toLowerCase().endsWith('.pdf')) { setError('Choose a PDF up to 2 MB.'); return }
  setReading(true)
  try { const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Unable to read agreement')); reader.readAsDataURL(picked) }); setFile({ name: picked.name, data }) }
  catch (e) { setError(e instanceof Error ? e.message : 'Unable to read agreement') }
  finally { setReading(false) }
 }
 return <details onToggle={e => setExpanded(e.currentTarget.open)} className="mt-3 rounded-lg border border-neutral-200 bg-white p-3 text-sm">
  <summary className="cursor-pointer font-semibold">Company partnership agreements & pilot terms</summary>
  <p className="my-3 text-xs text-neutral-600">For brands, manufacturers and authorised distributors as well as founding sellers. Default 3% and 20 slots are proposal starting points, not accepted company terms. Record the agreement signed by both parties. Email forwarding does not import agreements. Promotion dates record an entitlement; seller advertising campaigns must be booked separately.</p>
  {error && <p role="alert" className="my-2 text-red-700">{error}</p>}
  {records.isLoading && <p>Loading agreements…</p>}
  {records.error && <p role="alert" className="text-red-700">{records.error.message} <button onClick={() => records.refetch()} className="underline">Retry</button></p>}
  {records.data?.length === 0 && <p>No partnership agreement recorded.</p>}
  {records.data?.map(record => {
   const effective = record.status === 'active' && record.startsAt <= today && today < record.endsAt
   const label = record.status !== 'active' ? record.status : today >= record.endsAt ? 'expired' : effective ? 'effective' : 'scheduled'
   return <div key={record.id} className="my-3 rounded-lg bg-neutral-50 p-3">
    <p className="font-semibold">{record.reference} · version {record.version} · {label}</p>
    <p>{Number((Number(record.commissionRate) * 100).toFixed(2))}% commission · {record.listingLimit} listing slots · {day(record.startsAt)} to {day(record.endsAt)} (end exclusive)</p>
    <p className="text-xs">Signatories: {record.sellerSignatory || 'not recorded'} / {record.platformSignatory || 'not recorded'} · Signed: {record.signedAt ? day(record.signedAt) : 'not signed'}</p>
    {record.promotionEndsAt && <p className="text-xs">Promotional placement entitlement ends {day(record.promotionEndsAt)}.</p>}
    <details className="mt-2"><summary className="cursor-pointer">Recorded terms</summary><p className="whitespace-pre-wrap">{record.termsText}</p></details>
    <div className="mt-2 flex flex-wrap gap-3">
     {record.hasDocument && <button disabled={document.isPending} onClick={() => document.mutate({ key: adminKey, id: record.id })} className="font-semibold underline">Download signed PDF</button>}
     {record.status !== 'ended' && <button disabled={end.isPending} onClick={() => { const reason = window.prompt('Reason for ending this record (at least five characters):'); if (reason && reason.trim().length >= 5 && window.confirm('End this agreement? Future orders will use the next effective agreement or standard plan.')) end.mutate({ key: adminKey, id: record.id, reason }) }} className="font-semibold text-red-700 underline">End record</button>}
    </div>
   </div>
  })}
  <button onClick={() => setCreating(!creating)} className="my-2 rounded-lg border px-3 py-2 font-semibold">{creating ? 'Close new agreement' : 'Record new agreement'}</button>
  {creating && <div className="space-y-3 border-t pt-3">
   <div className="grid gap-3 sm:grid-cols-2">
    <label>Agreement reference<input className={inputClass} value={form.reference} onChange={e => field('reference', e.target.value)} /></label>
    <label>Version<input className={inputClass} value={form.version} onChange={e => field('version', e.target.value)} /></label>
    <label>Agreed commission (%)<input type="number" min="0" max="100" step="0.01" className={inputClass} value={form.commission} onChange={e => field('commission', e.target.value)} /></label>
    <label>Agreed catalogue slots (20–1,000)<input type="number" min="20" max="1000" className={inputClass} value={form.limit} onChange={e => field('limit', e.target.value)} /></label>
    <label>Pilot starts (UTC)<input type="date" className={inputClass} value={form.starts} onChange={e => field('starts', e.target.value)} /></label>
    <label>Pilot ends (UTC, exclusive)<input type="date" className={inputClass} value={form.ends} onChange={e => field('ends', e.target.value)} /></label>
    <label>Promotion ends (optional, up to 30 days)<input type="date" className={inputClass} value={form.promotion} onChange={e => field('promotion', e.target.value)} /></label>
    <label>Signing date<input type="date" className={inputClass} value={form.signed} onChange={e => field('signed', e.target.value)} /></label>
    <label>Company / distributor authorised signatory<input className={inputClass} value={form.sellerSignatory} onChange={e => field('sellerSignatory', e.target.value)} /></label>
    <label>UGSouq signatory<input className={inputClass} value={form.platformSignatory} onChange={e => field('platformSignatory', e.target.value)} /></label>
   </div>
   <label className="block">Agreed terms<textarea rows={6} className={inputClass} value={form.terms} onChange={e => field('terms', e.target.value)} placeholder="Record the exact registered company and UGSouq contracting entities, brand/distributor authority, named commercial and operational contacts, commission, charges, settlement cycle, delivery responsibilities, returns/warranty, data handling and termination terms exactly as signed." /></label>
   <label className="block">Signed agreement PDF (up to 2 MB)<input type="file" accept="application/pdf" onChange={e => loadPdf(e.target.files?.[0])} className="mt-1 block max-w-full" /></label>
   {file && <p className="text-xs">Attached: {file.name}</p>}
   <label className="flex items-start gap-2"><input type="checkbox" checked={form.verified} onChange={e => field('verified', e.target.checked)} /> I checked both parties’ signatures and confirm these terms match the signed PDF.</label>
   <p className="text-xs text-neutral-600">No agreement is signed on anyone’s behalf here. Drafts do not alter fees; effective signed pilots override Free/Pro terms and expire automatically. Existing order amounts stay unchanged.</p>
   <div className="flex flex-wrap gap-3"><button disabled={create.isPending || reading} onClick={() => save('draft')} className="rounded-lg border px-3 py-2">Save draft</button><button disabled={create.isPending || reading || !file || !form.verified} onClick={() => save('active')} className="rounded-lg bg-emerald-700 px-3 py-2 font-semibold text-white disabled:opacity-50">Activate signed pilot</button></div>
  </div>}
 </details>
}
