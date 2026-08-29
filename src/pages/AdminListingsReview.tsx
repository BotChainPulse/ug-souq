import { useState } from 'react'
import { Link } from 'react-router'
import { AlertTriangle, ArrowLeft, Check, CheckCircle, Package, Search, X } from 'lucide-react'
import { trpc } from '../providers/trpc'

const statusClass: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
  suspended: 'bg-orange-100 text-orange-800',
  terminated: 'bg-slate-100 text-slate-700',
}

export default function AdminListingsReview() {
  const [adminKey] = useState(() => localStorage.getItem('ug_admin_key') || '')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')

  const listings = trpc.admin.listings.useQuery(
    { key: adminKey, search: search || undefined, status: status === 'all' ? undefined : status },
    { enabled: !!adminKey, retry: false },
  )
  const setListingStatus = trpc.admin.setListingStatus.useMutation({ onSuccess: () => listings.refetch() })
  const rows = (listings.data ?? []) as any[]

  if (!adminKey) {
    return <div className="min-h-screen grid place-items-center bg-slate-100 p-6"><div className="rounded-2xl bg-white p-6 text-center shadow-sm"><p className="font-bold">Admin sign-in required</p><Link to="/admin" className="mt-3 inline-block text-sm font-bold text-emerald-700">Open admin</Link></div></div>
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link to="/admin/operations" className="rounded-lg border border-slate-200 p-2"><ArrowLeft size={18} /></Link>
          <div><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">UG Souq Admin</p><h1 className="font-black">Listing Review</h1></div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          Review the item photo and details before approving. Approval publishes the listing to shoppers.
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_190px]">
          <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product or seller" className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-9 pr-3 text-sm" /></div>
          <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold"><option value="pending">Pending</option><option value="all">All status</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select>
        </div>

        {listings.isLoading && <div className="rounded-2xl bg-white p-8 text-center text-slate-500">Loading listings…</div>}
        {listings.error && <div className="flex gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertTriangle size={18} />{listings.error.message}</div>}
        {!listings.isLoading && !listings.error && rows.length === 0 && <div className="rounded-2xl bg-white p-8 text-center text-slate-500">No listings found.</div>}

        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((item) => {
            const id = Number(item.id)
            return (
              <article key={id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="grid aspect-[4/3] place-items-center bg-slate-50">
                  {item.imageData ? <img src={item.imageData} alt={item.name || 'Seller listing'} className="h-full w-full object-contain" /> : <div className="text-center text-slate-400"><Package size={38} className="mx-auto" /><p className="mt-2 text-xs">No product image supplied</p></div>}
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap items-center gap-2"><h2 className="font-black">{item.name || 'Unnamed listing'}</h2><span className={`rounded-full px-2 py-1 text-xs font-bold ${statusClass[item.status] || statusClass.pending}`}>{item.status || 'pending'}</span>{item.sellerVerified && <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700"><CheckCircle size={12} />Verified seller</span>}</div>
                  <p className="mt-2 text-xl font-black">UGX {Number(item.price || 0).toLocaleString()}</p>
                  <p className="mt-1 text-sm text-slate-600">Seller: <b>{item.sellerName || '-'}</b></p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-slate-50 p-2"><span className="text-slate-500">Category</span><p className="font-bold capitalize">{item.category || '-'}</p></div>
                    <div className="rounded-lg bg-slate-50 p-2"><span className="text-slate-500">Condition</span><p className="font-bold capitalize">{item.condition || '-'}</p></div>
                    <div className="rounded-lg bg-slate-50 p-2"><span className="text-slate-500">Stock</span><p className="font-bold">{item.stock ?? '-'}</p></div>
                    <div className="rounded-lg bg-slate-50 p-2"><span className="text-slate-500">Warranty</span><p className="font-bold">{Number(item.warrantyMonths || 0)} month(s)</p></div>
                  </div>
                  {item.imageNote && <p className="mt-3 text-xs text-slate-500">Seller note: {item.imageNote}</p>}
                  {item.status === 'pending' && <div className="mt-4 grid grid-cols-2 gap-2"><button disabled={setListingStatus.isLoading} onClick={() => window.confirm(`Approve ${item.name}? This will publish it to shoppers.`) && setListingStatus.mutate({ key: adminKey, id, status: 'approved' })} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-3 text-sm font-bold text-white disabled:opacity-50"><Check size={16} />Approve</button><button disabled={setListingStatus.isLoading} onClick={() => window.confirm(`Reject ${item.name}?`) && setListingStatus.mutate({ key: adminKey, id, status: 'rejected' })} className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-3 py-3 text-sm font-bold text-white disabled:opacity-50"><X size={16} />Reject</button></div>}
                </div>
              </article>
            )
          })}
        </div>
      </main>
    </div>
  )
}
