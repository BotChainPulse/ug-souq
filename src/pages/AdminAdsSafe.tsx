import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ArrowLeft, CheckCircle2, Megaphone, Phone, RefreshCw, XCircle } from 'lucide-react'
import { trpc } from '../providers/trpc'

const MAX_ACTIVE_ADS = 10

const statusClass: Record<string, string> = {
  booked: 'bg-amber-100 text-amber-800',
  paid: 'bg-blue-100 text-blue-800',
  active: 'bg-emerald-100 text-emerald-800',
  completed: 'bg-neutral-100 text-neutral-700',
  cancelled: 'bg-red-100 text-red-700',
}

const statusLabel = (status: string) => status === 'paid' ? 'queued' : status

export default function AdminAdsSafe() {
  const navigate = useNavigate()
  const [adminKey] = useState(() => localStorage.getItem('ug_admin_key') || '')
  const query = trpc.admin.adBookings.useQuery({ key: adminKey }, { enabled: !!adminKey, retry: false })
  const update = trpc.admin.setAdBookingStatus.useMutation({ onSuccess: () => query.refetch() })
  const rows = ((query.data as any)?.rows ?? []) as any[]
  const totals = (query.data as any)?.totals ?? {}
  const activeCount = rows.filter((ad) => ad.status === 'active').length
  const queued = rows.filter((ad) => ad.status === 'paid').slice().sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  const queuePosition = new Map(queued.map((ad, index) => [Number(ad.id), index + 1]))
  const slotsAvailable = Math.max(0, MAX_ACTIVE_ADS - activeCount)

  const change = (id: number, status: 'booked' | 'paid' | 'active' | 'completed' | 'cancelled', prompt: string) => {
    if (status === 'active' && activeCount >= MAX_ACTIVE_ADS) {
      window.alert('All 10 sponsored banner slots are occupied. This paid campaign must remain queued until a slot opens.')
      return
    }
    if (!window.confirm(prompt)) return
    update.mutate({ key: adminKey, id, status })
  }

  if (!adminKey) {
    return <div className="min-h-screen bg-slate-100 p-6"><p className="text-sm">Open the main admin page and sign in first.</p></div>
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <button onClick={() => navigate('/admin/operations')} className="rounded-xl border border-slate-200 p-2"><ArrowLeft size={20} /></button>
          <div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-700">UG Souq Admin</p><h1 className="text-xl font-black">Seller Ads</h1></div>
          <button onClick={() => query.refetch()} className="ml-auto rounded-xl border border-slate-200 p-2"><RefreshCw size={18} className={query.isFetching ? 'animate-spin' : ''} /></button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-xs font-bold uppercase text-slate-500">Booked value</p><p className="mt-1 text-2xl font-black">UGX {Number(totals.booked ?? 0).toLocaleString()}</p></div>
          <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-xs font-bold uppercase text-slate-500">Realized value</p><p className="mt-1 text-2xl font-black">UGX {Number(totals.realized ?? 0).toLocaleString()}</p></div>
          <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-xs font-bold uppercase text-slate-500">Banner slots</p><p className="mt-1 text-2xl font-black">{activeCount} / {MAX_ACTIVE_ADS}</p><p className="mt-1 text-xs text-slate-500">{slotsAvailable} available</p></div>
          <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-xs font-bold uppercase text-slate-500">Paid queue</p><p className="mt-1 text-2xl font-black">{queued.length}</p><p className="mt-1 text-xs text-slate-500">First paid, first served</p></div>
        </section>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
          <b>Advertising rule:</b> verify payment first. A paid campaign enters the <b>queue</b>. Only {MAX_ACTIVE_ADS} campaigns may run on the sponsored banner at once. When a slot opens, activate the oldest paid campaign first; its 7/30-day campaign clock starts only when it becomes active.
        </div>

        {query.isLoading ? <div className="rounded-2xl bg-white p-10 text-center text-slate-500">Loading seller ads…</div> : query.error ? <div className="rounded-2xl border border-red-200 bg-white p-5 text-red-700">{query.error.message}</div> : rows.length === 0 ? <div className="rounded-2xl bg-white p-10 text-center text-slate-500">No seller ad bookings yet.</div> : (
          <div className="space-y-3">
            {rows.map((ad) => {
              const position = queuePosition.get(Number(ad.id))
              return (
                <article key={ad.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-black">{ad.sellerName}</h2><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass[ad.status] ?? statusClass.booked}`}>{statusLabel(ad.status)}</span>{position && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">Queue #{position}</span>}</div>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><Phone size={14} /> {ad.sellerPhone}</p>
                    </div>
                    <div className="text-right"><p className="text-xs font-bold uppercase text-slate-500">{ad.planType} plan</p><p className="text-xl font-black">UGX {Number(ad.amount ?? 0).toLocaleString()}</p></div>
                  </div>
                  {ad.notes && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{ad.notes}</p>}
                  <p className="mt-3 text-xs text-slate-400">Booked {ad.createdAt ? new Date(ad.createdAt).toLocaleString() : ''}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {ad.status === 'booked' && <><button disabled={update.isLoading} onClick={() => change(Number(ad.id), 'paid', `Confirm you have received UGX ${Number(ad.amount).toLocaleString()} from ${ad.sellerName}? This campaign will enter the paid queue.`)} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white"><CheckCircle2 size={15} className="mr-1 inline" /> Mark paid & queue</button><button disabled={update.isLoading} onClick={() => change(Number(ad.id), 'cancelled', `Cancel this ad booking for ${ad.sellerName}?`)} className="rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-600"><XCircle size={15} className="mr-1 inline" /> Cancel</button></>}
                    {ad.status === 'paid' && <><button disabled={update.isLoading || activeCount >= MAX_ACTIVE_ADS || position !== 1} onClick={() => change(Number(ad.id), 'active', `Activate ${ad.sellerName}'s ${ad.planType} ad now? Its campaign clock starts immediately.`)} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"><Megaphone size={15} className="mr-1 inline" /> {activeCount >= MAX_ACTIVE_ADS ? 'Waiting for slot' : position === 1 ? 'Activate next campaign' : `Waiting — queue #${position}`}</button><button disabled={update.isLoading} onClick={() => change(Number(ad.id), 'cancelled', `Cancel this paid queued ad booking?`)} className="rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-600">Cancel</button></>}
                    {ad.status === 'active' && <button disabled={update.isLoading} onClick={() => change(Number(ad.id), 'completed', `End ${ad.sellerName}'s active campaign? It will disappear from the public banner and open a slot.`)} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">Complete campaign</button>}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
