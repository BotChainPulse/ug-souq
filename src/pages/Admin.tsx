import React, { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ShieldCheck, Store, Package, ClipboardList, Wallet, Banknote, Bike, Users, RotateCcw, Megaphone, Settings, ScrollText, BarChart3, Truck, CheckCircle, ChevronDown, LogOut, Search } from 'lucide-react'
import { trpc } from '../providers/trpc'
import { fmt } from '../lib/cart'
import { ORANGE } from '../lib/site'

const KEY_STORAGE = 'ugsouq_admin_key'
const ORDER_STATUSES = ['placed', 'confirmed', 'pending_delivery', 'on_the_way', 'delivered', 'cancelled'] as const
const STATUS_LABEL: Record<string, string> = {
  placed: 'Placed', confirmed: 'Confirmed', pending_delivery: 'Pending delivery', on_the_way: 'On the way', delivered: 'Delivered', cancelled: 'Cancelled',
}

type Tab = 'overview' | 'sellers' | 'listings' | 'orders' | 'accounts' | 'payouts' | 'delivery' | 'buyers' | 'returns' | 'ads' | 'settings' | 'audit' | 'affiliates'

function QueryError({ title, error, onRetry }: { title: string; error: string; onRetry?: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
      <p className="font-bold text-red-700">{title}</p>
      <p className="mt-1 text-sm text-red-700">{error}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 text-xs font-bold text-white px-3 py-2 rounded-lg" style={{ background: ORANGE }}>
          Retry
        </button>
      )}
    </div>
  )
}

export default function Admin() {
  const [key, setKey] = useState(() => sessionStorage.getItem(KEY_STORAGE) ?? '')
  const [input, setInput] = useState('')
  const [tab, setTab] = useState<Tab>('overview')
  const [err, setErr] = useState('')

  const login = trpc.admin.login.useMutation({
    onSuccess: () => { sessionStorage.setItem(KEY_STORAGE, input.trim()); setKey(input.trim()); setErr('') },
    onError: () => setErr('Wrong admin key. Try again.'),
  })

  if (!key) {
    return (
      <div className="min-h-screen bg-neutral-900 grid place-items-center px-4">
        <form onSubmit={(e) => { e.preventDefault(); login.mutate({ key: input.trim() }) }} className="w-full max-w-sm bg-white rounded-2xl p-8">
          <div className="w-12 h-12 rounded-xl grid place-items-center text-white mx-auto" style={{ background: ORANGE }}>
            <ShieldCheck size={24} />
          </div>
          <h1 className="mt-4 text-xl font-extrabold text-center">UG Souq Admin</h1>
          <p className="mt-1 text-sm text-neutral-500 text-center">Enter your admin key to continue.</p>
          <input type="password" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Admin key" className="mt-5 w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-neutral-500" autoFocus />
          {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
          <button type="submit" disabled={login.isPending || !input.trim()} className="mt-4 w-full rounded-lg py-2.5 text-sm font-bold text-white disabled:opacity-50" style={{ background: ORANGE }}>
            {login.isPending ? 'Checking…' : 'Sign in'}
          </button>
          <Link to="/" className="mt-4 block text-center text-xs text-neutral-400 hover:text-neutral-600">← Back to the market</Link>
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-100 overflow-x-clip">
      <AdminHeader setKey={setKey} />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex gap-6">
          <Sidebar tab={tab} setTab={setTab} />
          <div className="flex-1">
            {tab === 'overview' && <Overview adminKey={key} />}
            {tab === 'orders' && <Orders adminKey={key} />}
            {tab !== 'overview' && tab !== 'orders' && <Placeholder tab={tab} />}
          </div>
        </div>
      </main>
    </div>
  )
}

function AdminHeader({ setKey }: { setKey: (k: string) => void }) {
  return (
    <header className="bg-neutral-900 text-white">
      <div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2 font-extrabold">
          <img src="/logo-mark.png" alt="UG Souq logo" className="w-8 h-8 rounded-lg object-cover bg-white" />
          UG Souq Admin
        </div>
        <div className="flex items-center gap-4 text-sm">
          <a className="text-neutral-400 hover:text-white" href="/">View store</a>
          <button onClick={() => { sessionStorage.removeItem(KEY_STORAGE); setKey('') }} className="flex items-center gap-1 text-neutral-400 hover:text-white">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </div>
    </header>
  )
}

function Sidebar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const items: [Tab, any, string][] = [
    ['overview', BarChart3, 'Overview'],
    ['sellers', Store, 'Sellers'],
    ['listings', ClipboardList, 'Listings'],
    ['orders', Package, 'Orders'],
    ['accounts', Wallet, 'Accounts'],
    ['payouts', Banknote, 'Payouts'],
    ['delivery', Bike, 'Delivery'],
    ['buyers', Users, 'Buyers'],
    ['returns', RotateCcw, 'Returns'],
    ['ads', Megaphone, 'Seller Ads'],
    ['settings', Settings, 'Settings'],
    ['audit', ScrollText, 'Audit Log'],
    ['affiliates', Users, 'Affiliates'],
  ]

  return (
    <aside className="w-64 hidden md:block">
      <div className="bg-white rounded-xl border border-neutral-200 p-4 sticky top-6">
        <nav className="space-y-1">
          {items.map(([t, Icon, label]) => (
            <button key={t} onClick={() => setTab(t)} className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded ${tab === t ? 'bg-neutral-100 font-medium' : 'text-neutral-500 hover:bg-neutral-50'}`}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </nav>
      </div>
    </aside>
  )
}

function Placeholder({ tab }: { tab: Tab }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-6">
      <h2 className="font-bold text-lg mb-2">{tab.charAt(0).toUpperCase() + tab.slice(1)}</h2>
      <p className="text-sm text-neutral-600">This section is scaffolded and will be connected to the admin API. For now it shows basic info and a debug panel when available.</p>
    </div>
  )
}

// ============================================
// Overview
// ============================================
function Overview({ adminKey }: { adminKey: string }) {
  const { data, isLoading, isError, error, refetch } = trpc.admin.stats.useQuery({ key: adminKey }, { retry: false })
  const { data: analytics } = trpc.admin.orderAnalytics.useQuery({ key: adminKey, days: 30 }, { retry: false })

  if (isLoading) return <p className="text-neutral-500">Loading…</p>
  if (isError) return <QueryError title="Could not load overview" error={error?.message ?? 'Unknown error'} onRetry={refetch} />
  if (!data) return <QueryError title="Could not load overview" error="No response from server." onRetry={refetch} />

  const cards = [
    ['Revenue (active)', fmt(data.revenue)],
    ['Orders', String(data.orderCount)],
    ['Sellers', String(data.sellerCount)],
    ['Pending sellers', String(data.pendingSellers)],
    ['Products', String(data.productCount)],
    ['Customers', String(data.customerCount)],
    ['Pending payouts', String(data.pendingPayouts)],
    ['Commission (booked)', fmt(data.commissionBooked)],
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {cards.map(([label, value]) => (
          <div key={label} className="bg-white rounded-xl border border-neutral-200 p-4">
            <p className="text-xs text-neutral-500">{label}</p>
            <p className="mt-1 font-extrabold text-lg">{value}</p>
          </div>
        ))}
      </div>

      {/* Analytics Charts (simple) */}
      {analytics && analytics.daily.length > 0 && (
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <BarChart3 size={18} /> Revenue Trend (Last 30 Days)
          </h2>
          <div className="overflow-x-auto">
            <div className="flex items-end gap-1 min-w-[600px] h-40">
              {analytics.daily.map((d: any) => {
                const maxRev = Math.max(...analytics.daily.map((x: any) => x.revenue), 1)
                const height = Math.max((d.revenue / maxRev) * 100, 4)
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-orange-200 rounded-t relative group" style={{ height: `${height}%` }}>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-neutral-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">
                        {fmt(d.revenue)} — {d.orders} orders
                      </div>
                    </div>
                    <span className="text-[9px] text-neutral-400 rotate-0">{d.date.slice(5)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Status Breakdown */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <h3 className="font-bold text-sm mb-3">Orders by Status</h3>
            <div className="space-y-2">
              {analytics.statusBreakdown.map((s: any) => (
                <div key={s.status} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{s.status.replace('_', ' ')}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-400 rounded-full" style={{ width: `${Math.max((s.count / Math.max(analytics.totalOrders, 1)) * 100, 4)}%` }} />
                    </div>
                    <span className="text-xs font-bold w-8 text-right">{s.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <h3 className="font-bold text-sm mb-3">Payment Status</h3>
            <div className="space-y-2">
              {analytics.paymentBreakdown.map((s: any) => (
                <div key={s.status} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{s.status.replace('_', ' ')}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${Math.max((s.count / Math.max(analytics.totalOrders, 1)) * 100, 4)}%` }} />
                    </div>
                    <span className="text-xs font-bold w-8 text-right">{s.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// Orders tab — full implementation with debug panel + safe dev fallback
// ============================================
function Orders({ adminKey }: { adminKey: string }) {
  const utils = trpc.useUtils()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null)
  const [assignPartnerId, setAssignPartnerId] = useState<number | null>(null)

  const { data, isLoading, isError, error, refetch } = trpc.admin.orders.useQuery(
    { key: adminKey, search: search || undefined, status: statusFilter !== 'all' ? statusFilter as any : undefined },
    { retry: false }
  )
  const { data: partnersData } = trpc.admin.deliveryPartners.useQuery({ key: adminKey })
  const setStatus = trpc.admin.setOrderStatus.useMutation({ onSuccess: () => { utils.admin.orders.invalidate(); utils.admin.stats.invalidate() } })
  const setPayment = trpc.admin.setPaymentStatus.useMutation({ onSuccess: () => utils.admin.orders.invalidate() })
  const assignDelivery = trpc.admin.assignDeliveryPartner.useMutation({ onSuccess: () => { utils.admin.orders.invalidate(); utils.admin.deliveryPartners.invalidate() } })
  const unassignDelivery = trpc.admin.unassignDeliveryPartner.useMutation({ onSuccess: () => utils.admin.orders.invalidate() })
  const markDelivered = trpc.admin.markDelivered.useMutation({ onSuccess: () => { utils.admin.orders.invalidate(); utils.admin.stats.invalidate() } })

  const approvedPartners = partnersData?.partners?.filter((p: any) => p.status === 'approved') ?? []

  // Defensive: ensure data is array
  const ordersList = Array.isArray(data) ? data : []

  // Development fallback so the UI never looks blank in dev mode
  const devFallback = process.env.NODE_ENV === 'development' && ordersList.length === 0

  useEffect(() => {
    // no-op
  }, [])

  if (isLoading) return <p className="text-neutral-500">Loading…</p>
  if (isError) return <QueryError title="Could not load orders" error={error?.message ?? 'Unknown error'} onRetry={refetch} />
  if (!data && !devFallback) return <QueryError title="Could not load orders" error="No response from server." onRetry={refetch} />

  const sampleOrders = [
    { id: 1, code: 'US-ABC01', customerName: 'John Doe', phone: '256772000000', address: 'Kampala', paymentMethod: 'Card', createdAt: new Date().toISOString(), status: 'placed', paymentStatus: 'unpaid', total: 15000, subtotal: 12000, deliveryFee: 3000, commissionFee: 840, items: [{ name: 'Business Cards', qty: 1, price: 12000 }] },
    { id: 2, code: 'US-DEF02', customerName: 'Sarah', phone: '256772111111', address: 'Kampala', paymentMethod: 'Cash', createdAt: new Date().toISOString(), status: 'confirmed', paymentStatus: 'paid', total: 18000, subtotal: 15000, deliveryFee: 3000, commissionFee: 1050, items: [{ name: 'Flyers', qty: 1, price: 15000 }] },
  ]

  const showOrders = devFallback ? sampleOrders : ordersList

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input type="text" placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-lg border border-neutral-300 pl-9 pr-4 py-2 text-sm outline-none focus:border-neutral-500" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm bg-white">
          <option value="all">All Status</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        {showOrders.map((o: any) => {
          const safeTotal = Number(o?.total ?? 0)
          const safeDelivery = Number(o?.deliveryFee ?? 0)
          const safeCommission = Number(o?.commissionFee ?? 0)
          const safeSubtotal = Number(o?.subtotal ?? (safeTotal - safeDelivery))
          const items = Array.isArray(o?.items) ? o.items : []

          return (
            <div key={o?.id ?? Math.random()} className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
              <div className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => setExpandedOrder(expandedOrder === o.id ? null : o.id)} className="flex items-center gap-1">
                    {expandedOrder === o.id ? <ChevronDown size={16} /> : <ChevronDown size={16} className="rotate-[-90deg]" />}
                  </button>
                  <span className="font-mono font-bold">{o?.code ?? ('#' + o?.id)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${o?.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {o?.paymentStatus === 'paid' ? 'Paid' : (o?.paymentStatus ?? 'unpaid')}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className="font-extrabold text-lg">{fmt(safeTotal)}</span>
                  <select value={o?.status ?? 'placed'} onChange={(e) => {
                    if (!confirm('Change status?')) return
                    setStatus.mutate({ key: adminKey, id: o.id, status: e.target.value as any })
                  }} className="text-sm rounded-lg border border-neutral-300 px-3 py-1.5 bg-white">
                    {ORDER_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                  <select value={o?.paymentStatus ?? 'unpaid'} onChange={(e) => {
                    if (!confirm('Change payment status?')) return
                    setPayment.mutate({ key: adminKey, id: o.id, status: e.target.value as any })
                  }} className="text-sm rounded-lg border border-neutral-300 px-3 py-1.5 bg-white">
                    <option value="unpaid">Unpaid</option>
                    <option value="pending_confirmation">Confirming</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                <p className="mt-2 text-sm text-neutral-600">{(o?.customerName ?? 'Unknown')} · {(o?.phone ?? '-')} · {((o?.address ?? '').slice(0, 60))}{((o?.address ?? '').length > 60 ? '...' : '')} · {(o?.paymentMethod ?? '-')} · {o?.createdAt ? new Date(o.createdAt).toLocaleString('en-UG') : '-'}</p>

                {/* Delivery Assignment */}
                {o?.status !== 'cancelled' && o?.status !== 'delivered' && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {o?.deliveryPartnerId ? (
                      <div className="flex items-center gap-2">
                        <Truck size={14} className="text-sky-600" />
                        <span className="text-xs text-sky-700 font-medium">Rider assigned</span>
                        <button onClick={() => {
                          if (!confirm('Unassign delivery?')) return
                          unassignDelivery.mutate({ key: adminKey, orderId: o.id })
                        }} disabled={unassignDelivery.isPending} className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 font-medium disabled:opacity-50">Unassign</button>
                        <button onClick={() => {
                          if (!confirm('Mark delivered?')) return
                          markDelivered.mutate({ key: adminKey, orderId: o.id })
                        }} disabled={markDelivered.isPending} className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-700 font-medium disabled:opacity-50"><CheckCircle size={12} className="inline mr-1"/> Mark Delivered</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-500">Assign rider:</span>
                        <select value={assignPartnerId ?? ''} onChange={(e) => setAssignPartnerId(e.target.value ? parseInt(e.target.value) : null)} className="text-xs rounded-lg border border-neutral-300 px-2 py-1 bg-white">
                          <option value="">Select rider...</option>
                          {approvedPartners.map((p: any) => (
                            <option key={p.id} value={p.id}>{p.fullName} ({p.vehicleType}) — {p.area}</option>
                          ))}
                        </select>
                        <button onClick={() => {
                          if (!assignPartnerId) return
                          if (!confirm('Assign rider?')) return
                          assignDelivery.mutate({ key: adminKey, orderId: o.id, partnerId: assignPartnerId })
                          setAssignPartnerId(null)
                        }} disabled={!assignPartnerId || assignDelivery.isPending} className="text-xs px-3 py-1.5 rounded-lg bg-sky-600 text-white font-medium disabled:opacity-50">{assignDelivery.isPending ? 'Assigning...' : 'Assign'}</button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Expanded Order Details */}
              {expandedOrder === o?.id && items.length > 0 && (
                <div className="border-t border-neutral-100 p-4 bg-neutral-50">
                  <h4 className="text-xs font-bold text-neutral-500 uppercase mb-2">Order Items</h4>
                  <div className="space-y-2">
                    {items.map((it: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{it.qty} × {it?.name ?? 'Item'}</span>
                        <span className="font-medium">{fmt(Number(it.price) * Number(it.qty))}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm text-neutral-500 pt-2 border-t border-neutral-200"><span>Subtotal</span><span>{fmt(safeSubtotal)}</span></div>
                    <div className="flex justify-between text-sm text-neutral-500"><span>Delivery</span><span>{fmt(safeDelivery)}</span></div>
                    <div className="flex justify-between text-sm text-neutral-500"><span>Commission</span><span>{fmt(safeCommission)}</span></div>
                    <div className="flex justify-between font-bold text-sm pt-2 border-t border-neutral-200"><span>Total Paid</span><span>{fmt(safeTotal)}</span></div>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {showOrders.length === 0 && <p className="text-neutral-500">No orders found.</p>}

        {/* Debug Panel */}
        <div className="mt-4 bg-white rounded-xl border border-neutral-200 p-4">
          <h4 className="font-bold mb-2">Debug / Raw Response</h4>
          <pre className="text-xs max-h-48 overflow-auto bg-neutral-50 rounded p-2">{JSON.stringify({ data, error: error?.message ?? null }, null, 2)}</pre>
        </div>
      </div>
    </div>
  )
}
