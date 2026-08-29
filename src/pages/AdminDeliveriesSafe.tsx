import { useState } from 'react'
import { Link } from 'react-router'
import { AlertTriangle, ArrowLeft, Check, Search, Truck, X } from 'lucide-react'
import { trpc } from '../providers/trpc'

const statusClass: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
  suspended: 'bg-orange-100 text-orange-800',
  terminated: 'bg-slate-100 text-slate-700',
}

export default function AdminDeliveriesSafe() {
  const [adminKey] = useState(() => localStorage.getItem('ug_admin_key') || '')
  const [search, setSearch] = useState('')
  const query = trpc.admin.deliveryPartners.useQuery(
    { key: adminKey, search: search || undefined },
    { enabled: !!adminKey, retry: false },
  )
  const setStatus = trpc.admin.setDeliveryPartnerStatus.useMutation({ onSuccess: () => query.refetch() })
  const data = (query.data as any) ?? {}
  const partners = Array.isArray(data) ? data : Array.isArray(data.partners) ? data.partners : []
  const ledger = Array.isArray(data) ? null : data.ledger ?? null

  if (!adminKey) {
    return <div className="min-h-screen grid place-items-center bg-slate-100 p-6"><div className="rounded-2xl bg-white p-6 text-center shadow-sm"><p className="font-bold">Admin sign-in required</p><Link to="/admin" className="mt-3 inline-block text-sm font-bold text-emerald-700">Open admin</Link></div></div>
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3"><Link to="/admin/operations" className="rounded-lg border border-slate-200 p-2"><ArrowLeft size={18} /></Link><div><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">UG Souq Admin</p><h1 className="font-black">Deliveries</h1></div></div></header>
      <main className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
        {ledger && <section className="grid grid-cols-2 gap-3 lg:grid-cols-4"><div className="rounded-2xl bg-white p-4"><p className="text-xs text-slate-500">Delivery fees booked</p><p className="mt-1 font-black">UGX {Number(ledger.deliveryFeesBooked || 0).toLocaleString()}</p></div><div className="rounded-2xl bg-white p-4"><p className="text-xs text-slate-500">Delivery fees realized</p><p className="mt-1 font-black">UGX {Number(ledger.deliveryFeesRealized || 0).toLocaleString()}</p></div><div className="rounded-2xl bg-white p-4"><p className="text-xs text-slate-500">Platform 10%</p><p className="mt-1 font-black">UGX {Number(ledger.platform10Realized || 0).toLocaleString()}</p></div><div className="rounded-2xl bg-white p-4"><p className="text-xs text-slate-500">Partner share</p><p className="mt-1 font-black">UGX {Number(ledger.partnerShareRealized || 0).toLocaleString()}</p></div></section>}
        <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone or area" className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-9 pr-3 text-sm" /></div>
        {query.isLoading && <div className="rounded-2xl bg-white p-8 text-center text-slate-500">Loading delivery partners…</div>}
        {query.error && <div className="flex gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertTriangle size={18} />{query.error.message}</div>}
        {!query.isLoading && !query.error && partners.length === 0 && <div className="rounded-2xl bg-white p-8 text-center text-slate-500"><Truck size={32} className="mx-auto mb-2 text-slate-300" />No delivery partners found.</div>}
        <div className="space-y-3">{partners.map((p: any) => { const id = Number(p.id); const name = p.fullName ?? p.name ?? 'Unknown partner'; return <article key={id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-center gap-2"><h2 className="font-black">{name}</h2><span className={`rounded-full px-2 py-1 text-xs font-bold ${statusClass[p.status] || statusClass.pending}`}>{p.status || 'pending'}</span></div><p className="mt-2 text-sm text-slate-600">{p.phone || '-'} · {p.vehicleType || '-'} · {p.area || p.zone || '-'}</p><p className="mt-1 text-xs text-slate-500">Payout: {p.payoutMethod || '-'} · {p.payoutNumber || '-'}</p>{p.status === 'pending' && <div className="mt-4 flex gap-2"><button disabled={setStatus.isLoading} onClick={() => window.confirm(`Approve ${name} as a delivery partner?`) && setStatus.mutate({ key: adminKey, id, status: 'approved' })} className="flex items-center gap-1 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Check size={15} />Approve</button><button disabled={setStatus.isLoading} onClick={() => window.confirm(`Reject ${name}?`) && setStatus.mutate({ key: adminKey, id, status: 'rejected' })} className="flex items-center gap-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><X size={15} />Reject</button></div>}</article> })}</div>
      </main>
    </div>
  )
}
