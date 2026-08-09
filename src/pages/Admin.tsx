import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../providers/trpc'
import { useCart, fmt } from '../lib/cart'
import {
  LayoutDashboard, Users, Package, ShoppingCart, CreditCard, Truck, RotateCcw,
  Megaphone, Link2, Settings, FileText, Bell, LogOut, Search, ChevronDown,
  CheckCircle, XCircle, Clock, Star, Eye, Filter, TrendingUp, DollarSign,
  Store, UserCheck, AlertTriangle, Check, X, MapPin, Phone, Mail, Image,
  ChevronRight, BarChart3, Activity, ArrowUpRight, ArrowDownRight
} from 'lucide-react'

const STATUS_LABEL: Record<string, string> = {
  placed: 'Placed',
  confirmed: 'Confirmed',
  pending_delivery: 'Preparing',
  on_the_way: 'Delivering',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

const STATUS_COLORS: Record<string, string> = {
  placed: 'bg-neutral-100 text-neutral-700',
  confirmed: 'bg-blue-100 text-blue-700',
  pending_delivery: 'bg-amber-100 text-amber-700',
  on_the_way: 'bg-sky-100 text-sky-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
}

const ORDER_STATUSES = ["placed", "confirmed", "pending_delivery", "on_the_way", "delivered", "cancelled"] as const

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABEL[status] || status
  const color = STATUS_COLORS[status] || 'bg-neutral-100 text-neutral-700'
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>{label}</span>
}

function PaymentBadge({ status }: { status: string | null | undefined }) {
  const s = status || 'unpaid'
  const cls = s === 'paid' ? 'bg-emerald-100 text-emerald-700' : s === 'pending_confirmation' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
  const text = s === 'paid' ? 'Paid' : s === 'pending_confirmation' ? 'Confirming' : 'Unpaid'
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{text}</span>
}

function Card({ title, value, icon: Icon, trend }: { title: string; value: string; icon: any; trend?: string }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-neutral-500 font-medium uppercase">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
          <Icon size={20} className="text-neutral-600" />
        </div>
      </div>
      {trend && <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1"><TrendingUp size={12} /> {trend}</p>}
    </div>
  )
}

function QueryError({ title, error, onRetry }: { title: string; error: string; onRetry: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
      <div className="flex items-center gap-2 text-red-700 font-medium">
        <AlertTriangle size={16} />
        <span>{title}</span>
      </div>
      <p className="text-sm text-red-600 mt-1">{error}</p>
      <button onClick={onRetry} className="mt-2 text-sm px-3 py-1.5 bg-red-600 text-white rounded-lg font-medium">Retry</button>
    </div>
  )
}

export default function Admin() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')
  const [adminKey, setAdminKey] = useState(() => localStorage.getItem('ug_admin_key') || '')
  const [keyInput, setKeyInput] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { data: stats, isLoading: statsLoading } = trpc.admin.stats.useQuery(
    { key: adminKey },
    { enabled: !!adminKey, retry: false }
  )

  const login = () => {
    if (keyInput.trim()) {
      localStorage.setItem('ug_admin_key', keyInput.trim())
      setAdminKey(keyInput.trim())
    }
  }

  const logout = () => {
    localStorage.removeItem('ug_admin_key')
    setAdminKey('')
    setKeyInput('')
  }

  if (!adminKey) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-8 w-full max-w-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <Store size={16} className="text-white" />
            </div>
            <h1 className="text-xl font-bold">UG Souq Admin</h1>
          </div>
          <p className="text-sm text-neutral-500 mb-4">Enter your admin key to access the dashboard.</p>
          <input
            type="password"
            placeholder="Admin key"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && login()}
            className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-orange-500 mb-3"
          />
          <button onClick={login} className="w-full rounded-lg bg-orange-500 text-white py-2.5 text-sm font-semibold hover:bg-orange-600 transition">
            Sign In
          </button>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'sellers', label: 'Sellers', icon: Store },
    { id: 'listings', label: 'Listings', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'accounts', label: 'Accounts', icon: Users },
    { id: 'payouts', label: 'Payouts', icon: CreditCard },
    { id: 'deliveries', label: 'Deliveries', icon: Truck },
    { id: 'returns', label: 'Returns', icon: RotateCcw },
    { id: 'ads', label: 'Seller Ads', icon: Megaphone },
    { id: 'affiliates', label: 'Affiliates', icon: Link2 },
    { id: 'audit', label: 'Audit Log', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-neutral-200 transition-transform lg:translate-x-0 lg:static`}>
        <div className="p-4 border-b border-neutral-200 flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <Store size={16} className="text-white" />
          </div>
          <span className="font-bold text-lg">UG Souq</span>
        </div>
        <nav className="p-2 space-y-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setSidebarOpen(false) }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                tab === t.id ? 'bg-orange-50 text-orange-700' : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              <t.icon size={18} />
              {t.label}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-neutral-200">
          <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 font-medium">
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-neutral-100 rounded-lg">
              <LayoutDashboard size={20} />
            </button>
            <h2 className="font-semibold text-lg">{tabs.find((t) => t.id === tab)?.label}</h2>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="text-sm text-neutral-600 hover:text-neutral-900 font-medium">
              View Store
            </button>
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
              <UserCheck size={16} className="text-orange-600" />
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-4 lg:p-6 max-w-7xl mx-auto">
          {tab === 'overview' && <Overview adminKey={adminKey} stats={stats} isLoading={statsLoading} />}
          {tab === 'sellers' && <Sellers adminKey={adminKey} />}
          {tab === 'listings' && <Listings adminKey={adminKey} />}
          {tab === 'orders' && <Orders adminKey={adminKey} />}
          {tab === 'accounts' && <Accounts adminKey={adminKey} />}
          {tab === 'payouts' && <Payouts adminKey={adminKey} />}
          {tab === 'deliveries' && <Deliveries adminKey={adminKey} />}
          {tab === 'returns' && <Returns adminKey={adminKey} />}
          {tab === 'ads' && <SellerAds adminKey={adminKey} />}
          {tab === 'affiliates' && <Affiliates adminKey={adminKey} />}
          {tab === 'audit' && <AuditLog adminKey={adminKey} />}
          {tab === 'settings' && <SettingsPage adminKey={adminKey} />}
        </div>

        {/* Footer */}
        <footer className="border-t border-neutral-200 bg-white px-4 py-3 text-xs text-neutral-500 flex flex-wrap items-center justify-between gap-2">
          <span>© UG Souq — 2026</span>
          <span>Admin v1.0.0</span>
          <span className="text-emerald-600 font-medium">● System Online</span>
        </footer>
      </main>
    </div>
  )
}

// ============ OVERVIEW ============
function Overview({ adminKey, stats, isLoading }: { adminKey: string; stats: any; isLoading: boolean }) {
  const { data: analytics } = trpc.admin.orderAnalytics.useQuery({ key: adminKey, days: 30 }, { enabled: !!adminKey })

  if (isLoading) return <p className="text-neutral-500">Loading dashboard...</p>
  if (!stats) return <p className="text-neutral-500">No stats available.</p>

  const s = stats || {}
  const safeNum = (n: any) => Number(n || 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Revenue" value={fmt(safeNum(s.revenue))} icon={DollarSign} trend="+12%" />
        <Card title="Orders" value={String(safeNum(s.orderCount))} icon={ShoppingCart} />
        <Card title="Sellers" value={String(safeNum(s.sellerCount))} icon={Store} />
        <Card title="Pending Sellers" value={String(safeNum(s.pendingSellerCount))} icon={UserCheck} />
        <Card title="Products" value={String(safeNum(s.productCount))} icon={Package} />
        <Card title="Customers" value={String(safeNum(s.customerCount))} icon={Users} />
        <Card title="Pending Payouts" value={String(safeNum(s.pendingPayoutCount))} icon={CreditCard} />
        <Card title="Commission" value={fmt(safeNum(s.totalCommission))} icon={TrendingUp} />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4">
        <h3 className="font-semibold mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          <QuickAction label="Approve Sellers" icon={UserCheck} />
          <QuickAction label="Review Listings" icon={Eye} />
          <QuickAction label="Process Payouts" icon={CreditCard} />
          <QuickAction label="Delivery Issues" icon={Truck} />
          <QuickAction label="Refund Requests" icon={RotateCcw} />
        </div>
      </div>

      {/* Charts placeholder */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <h3 className="font-semibold mb-4">Revenue Trend</h3>
          <div className="h-48 flex items-end justify-around gap-2">
            {analytics?.daily?.slice(-7).map((d: any, i: number) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-orange-200 rounded-t" style={{ height: `${Math.min((d.revenue || 0) / 1000, 100)}%` }} />
                <span className="text-[10px] text-neutral-500">{d.date?.slice(5) || ''}</span>
              </div>
            )) || <p className="text-neutral-400 text-sm">No data</p>}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <h3 className="font-semibold mb-4">Orders Trend</h3>
          <div className="h-48 flex items-end justify-around gap-2">
            {analytics?.daily?.slice(-7).map((d: any, i: number) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-blue-200 rounded-t" style={{ height: `${Math.min((d.orders || 0) * 10, 100)}%` }} />
                <span className="text-[10px] text-neutral-500">{d.date?.slice(5) || ''}</span>
              </div>
            )) || <p className="text-neutral-400 text-sm">No data</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

function QuickAction({ label, icon: Icon }: { label: string; icon: any }) {
  return (
    <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition">
      <Icon size={16} />
      {label}
    </button>
  )
}

// ============ SELLERS ============
function Sellers({ adminKey }: { adminKey: string }) {
  const [filter, setFilter] = useState('all')
  const { data, isLoading, isError, error, refetch } = trpc.admin.sellers.useQuery({ key: adminKey }, { retry: false })
  const utils = trpc.useUtils()
  const approve = trpc.admin.approveSeller.useMutation({ onSuccess: () => utils.admin.sellers.invalidate() })
  const reject = trpc.admin.rejectSeller.useMutation({ onSuccess: () => utils.admin.sellers.invalidate() })

  if (isLoading) return <p className="text-neutral-500">Loading sellers...</p>
  if (isError) return <QueryError title="Could not load sellers" error={error?.message || 'Unknown'} onRetry={refetch} />

  const sellers = Array.isArray(data) ? data : []
  const filtered = filter === 'all' ? sellers : sellers.filter((s: any) => s?.status === filter)

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['all', 'pending', 'approved', 'rejected'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${filter === f ? 'bg-orange-500 text-white' : 'bg-white border border-neutral-200 text-neutral-600'}`}>
            {f}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {filtered.map((s: any) => (
          <div key={s?.id || Math.random()} className="bg-white rounded-xl border border-neutral-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{s?.shopName || 'Unnamed Shop'}</p>
                <p className="text-sm text-neutral-500">{(s?.fullName || '-')} · {(s?.phone || '-')} · {(s?.email || '-')}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                s?.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : s?.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
              }`}>{s?.status || 'pending'}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {s?.status === 'pending' && (
                <>
                  <button onClick={() => approve.mutate({ key: adminKey, id: s.id })} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-medium">Approve</button>
                  <button onClick={() => reject.mutate({ key: adminKey, id: s.id })} className="text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white font-medium">Reject</button>
                </>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-neutral-500">No sellers found.</p>}
      </div>
    </div>
  )
}

// ============ LISTINGS ============
function Listings({ adminKey }: { adminKey: string }) {
  const [filter, setFilter] = useState('all')
  const { data, isLoading, isError, error, refetch } = trpc.admin.listings.useQuery({ key: adminKey }, { retry: false })
  const utils = trpc.useUtils()
  const approve = trpc.admin.approveListing.useMutation({ onSuccess: () => utils.admin.listings.invalidate() })
  const reject = trpc.admin.rejectListing.useMutation({ onSuccess: () => utils.admin.listings.invalidate() })

  if (isLoading) return <p className="text-neutral-500">Loading listings...</p>
  if (isError) return <QueryError title="Could not load listings" error={error?.message || 'Unknown'} onRetry={refetch} />

  const listings = Array.isArray(data) ? data : []
  const filtered = filter === 'all' ? listings : listings.filter((l: any) => l?.status === filter)

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {['all', 'pending', 'approved', 'rejected'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${filter === f ? 'bg-orange-500 text-white' : 'bg-white border border-neutral-200 text-neutral-600'}`}>
            {f}
          </button>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((l: any) => (
          <div key={l?.id || Math.random()} className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div className="aspect-video bg-neutral-100 flex items-center justify-center">
              {l?.image ? <img src={l.image} alt="" className="w-full h-full object-cover" /> : <Image size={24} className="text-neutral-400" />}
            </div>
            <div className="p-3">
              <p className="font-medium text-sm line-clamp-1">{l?.title || 'Untitled'}</p>
              <p className="text-sm font-bold text-orange-600">{fmt(Number(l?.price || 0))}</p>
              <div className="flex items-center justify-between mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                  l?.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : l?.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}>{l?.status || 'pending'}</span>
                <div className="flex gap-1">
                  {l?.status === 'pending' && (
                    <>
                      <button onClick={() => approve.mutate({ key: adminKey, id: l.id })} className="p-1 rounded bg-emerald-100 text-emerald-700"><Check size={14} /></button>
                      <button onClick={() => reject.mutate({ key: adminKey, id: l.id })} className="p-1 rounded bg-red-100 text-red-700"><X size={14} /></button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-neutral-500 col-span-full">No listings found.</p>}
      </div>
    </div>
  )
}

// ============ ORDERS (BULLETPROOF) ============
function Orders({ adminKey }: { adminKey: string }) {
  const utils = trpc.useUtils()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null)
  const [assignPartnerId, setAssignPartnerId] = useState<number | null>(null)

  const { data, isLoading, isError, error, refetch } = trpc.admin.orders.useQuery(
    { key: adminKey, search: search || undefined, status: statusFilter !== 'all' ? statusFilter as any : undefined },
    { retry: false }
  )
  const { data: partnersData } = trpc.admin.deliveryPartners.useQuery({ key: adminKey })
  const setStatus = trpc.admin.setOrderStatus.useMutation({
    onSuccess: () => { utils.admin.orders.invalidate(); utils.admin.stats.invalidate() },
  })
  const setPayment = trpc.admin.setPaymentStatus.useMutation({
    onSuccess: () => utils.admin.orders.invalidate(),
  })
  const assignDelivery = trpc.admin.assignDeliveryPartner.useMutation({
    onSuccess: () => { utils.admin.orders.invalidate(); utils.admin.deliveryPartners.invalidate() },
  })
  const unassignDelivery = trpc.admin.unassignDeliveryPartner.useMutation({
    onSuccess: () => utils.admin.orders.invalidate(),
  })
  const markDelivered = trpc.admin.markDelivered.useMutation({
    onSuccess: () => { utils.admin.orders.invalidate(); utils.admin.stats.invalidate() },
  })

  if (isLoading) return <p className="text-neutral-500">Loading orders...</p>
  if (isError) return <QueryError title="Could not load orders" error={error?.message ?? 'Unknown error'} onRetry={refetch} />
  if (!data) return <QueryError title="Could not load orders" error="No response from server." onRetry={refetch} />

  const approvedPartners = partnersData?.partners?.filter((p: any) => p.status === 'approved') ?? []
  const ordersList = Array.isArray(data) ? data : []

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input type="text" placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-lg border border-neutral-300 pl-9 pr-4 py-2 text-sm outline-none focus:border-orange-500" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm bg-white">
          <option value="all">All Status</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        {ordersList.map((o: any) => {
          const safeTotal = Number(o?.total ?? 0)
          const safeDelivery = Number(o?.deliveryFee ?? 0)
          const safeCommission = Number(o?.commissionFee ?? 0)
          const safeSubtotal = safeTotal + safeCommission + safeDelivery
          const items = Array.isArray(o?.items) ? o.items : []

          return (
            <div key={o?.id ?? Math.random()} className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
              <div className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => setExpandedOrder(expandedOrder === o.id ? null : o.id)} className="flex items-center gap-1">
                    {expandedOrder === o.id ? <ChevronDown size={16} /> : <ChevronDown size={16} className="rotate-[-90deg]" />}
                  </button>
                  <span className="font-mono font-bold text-sm">{o?.code ?? 'N/A'}</span>
                  <StatusBadge status={o?.status ?? 'placed'} />
                  <PaymentBadge status={o?.paymentStatus} />
                  {o?.paidOut && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">Paid Out</span>}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className="font-extrabold text-lg">{fmt(safeTotal)}</span>
                  <select value={o?.status ?? 'placed'} onChange={(e) => setStatus.mutate({ key: adminKey, id: o.id, status: e.target.value as any })} className="text-sm rounded-lg border border-neutral-300 px-3 py-1.5 bg-white">
                    {ORDER_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                  <select value={o?.paymentStatus ?? 'unpaid'} onChange={(e) => setPayment.mutate({ key: adminKey, id: o.id, status: e.target.value as any })} className="text-sm rounded-lg border border-neutral-300 px-3 py-1.5 bg-white">
                    <option value="unpaid">Unpaid</option>
                    <option value="pending_confirmation">Confirming</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                <p className="mt-2 text-sm text-neutral-600">
                  {(o?.customerName ?? 'Unknown')} · {(o?.phone ?? '-')} · {((o?.address ?? '').slice(0, 60))}{((o?.address ?? '').length > 60 ? '...' : '')} · {(o?.paymentMethod ?? '-')} · {o?.createdAt ? new Date(o.createdAt).toLocaleString('en-UG') : '-'}
                </p>

                {o?.status !== 'cancelled' && o?.status !== 'delivered' && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {o?.deliveryPartnerId ? (
                      <div className="flex items-center gap-2">
                        <Truck size={14} className="text-sky-600" />
                        <span className="text-xs text-sky-700 font-medium">Rider assigned</span>
                        <button onClick={() => unassignDelivery.mutate({ key: adminKey, orderId: o.id })} disabled={unassignDelivery.isPending} className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 font-medium disabled:opacity-50">Unassign</button>
                        <button onClick={() => markDelivered.mutate({ key: adminKey, orderId: o.id })} disabled={markDelivered.isPending} className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-700 font-medium disabled:opacity-50"><CheckCircle size={12} className="inline mr-1" /> Mark Delivered</button>
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
                        <button onClick={() => { if (assignPartnerId) { assignDelivery.mutate({ key: adminKey, orderId: o.id, partnerId: assignPartnerId }); setAssignPartnerId(null) } }} disabled={!assignPartnerId || assignDelivery.isPending} className="text-xs px-3 py-1.5 rounded-lg bg-sky-600 text-white font-medium disabled:opacity-50">
                          {assignDelivery.isPending ? 'Assigning...' : 'Assign'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {expandedOrder === o?.id && items.length > 0 && (
                <div className="border-t border-neutral-100 p-4 bg-neutral-50">
                  <h4 className="text-xs font-bold text-neutral-500 uppercase mb-2">Order Items</h4>
                  <div className="space-y-2">
                    {items.map((it: any, idx: number) => {
                      const itQty = Number(it?.qty ?? 1)
                      const itPrice = Number(it?.price ?? 0)
                      return (
                        <div key={idx} className="flex justify-between text-sm">
                          <span>{itQty} × {it?.name ?? 'Item'}</span>
                          <span className="font-medium">{fmt(itPrice * itQty)}</span>
                        </div>
                      )
                    })}
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
        {ordersList.length === 0 && <p className="text-neutral-500">No orders found.</p>}
      </div>
    </div>
  )
}

// ============ ACCOUNTS ============
function Accounts({ adminKey }: { adminKey: string }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center">
      <Users size={48} className="mx-auto text-neutral-300 mb-4" />
      <h3 className="font-semibold text-lg text-neutral-700">Accounts Management</h3>
      <p className="text-neutral-500 mt-2">Buyer and seller account details will appear here.</p>
    </div>
  )
}

// ============ PAYOUTS ============
function Payouts({ adminKey }: { adminKey: string }) {
  const { data, isLoading, isError, error, refetch } = trpc.admin.payouts.useQuery({ key: adminKey }, { retry: false })
  const utils = trpc.useUtils()
  const process = trpc.admin.processPayout.useMutation({ onSuccess: () => utils.admin.payouts.invalidate() })

  if (isLoading) return <p className="text-neutral-500">Loading payouts...</p>
  if (isError) return <QueryError title="Could not load payouts" error={error?.message || 'Unknown'} onRetry={refetch} />

  const payouts = Array.isArray(data) ? data : []

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {payouts.map((p: any) => (
          <div key={p?.id || Math.random()} className="bg-white rounded-xl border border-neutral-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{p?.sellerName || 'Unknown Seller'}</p>
                <p className="text-sm text-neutral-500">{fmt(Number(p?.amount || 0))} · {p?.method || '-'}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                p?.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : p?.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
              }`}>{p?.status || 'pending'}</span>
            </div>
            {p?.status === 'pending' && (
              <div className="mt-3 flex gap-2">
                <button onClick={() => process.mutate({ key: adminKey, id: p.id, action: 'approve' })} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-medium">Approve</button>
                <button onClick={() => process.mutate({ key: adminKey, id: p.id, action: 'reject' })} className="text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white font-medium">Reject</button>
              </div>
            )}
          </div>
        ))}
        {payouts.length === 0 && <p className="text-neutral-500">No payouts found.</p>}
      </div>
    </div>
  )
}

// ============ DELIVERIES ============
function Deliveries({ adminKey }: { adminKey: string }) {
  const { data, isLoading, isError, error, refetch } = trpc.admin.deliveryPartners.useQuery({ key: adminKey }, { retry: false })

  if (isLoading) return <p className="text-neutral-500">Loading delivery partners...</p>
  if (isError) return <QueryError title="Could not load deliveries" error={error?.message || 'Unknown'} onRetry={refetch} />

  const partners = data?.partners || []

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {partners.map((p: any) => (
          <div key={p?.id || Math.random()} className="bg-white rounded-xl border border-neutral-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{p?.fullName || 'Unknown'}</p>
                <p className="text-sm text-neutral-500">{p?.vehicleType || '-'} · {p?.area || '-'} · {(p?.phone || '-')}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                p?.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : p?.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
              }`}>{p?.status || 'pending'}</span>
            </div>
          </div>
        ))}
        {partners.length === 0 && <p className="text-neutral-500">No delivery partners found.</p>}
      </div>
    </div>
  )
}

// ============ RETURNS ============
function Returns({ adminKey }: { adminKey: string }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center">
      <RotateCcw size={48} className="mx-auto text-neutral-300 mb-4" />
      <h3 className="font-semibold text-lg text-neutral-700">Returns & Refunds</h3>
      <p className="text-neutral-500 mt-2">Return requests will appear here.</p>
    </div>
  )
}

// ============ SELLER ADS ============
function SellerAds({ adminKey }: { adminKey: string }) {
  const { data, isLoading, isError, error, refetch } = trpc.admin.sellerAds.useQuery({ key: adminKey }, { retry: false })

  if (isLoading) return <p className="text-neutral-500">Loading ads...</p>
  if (isError) return <QueryError title="Could not load ads" error={error?.message || 'Unknown'} onRetry={refetch} />

  const ads = Array.isArray(data) ? data : []

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {ads.map((a: any) => (
          <div key={a?.id || Math.random()} className="bg-white rounded-xl border border-neutral-200 p-4">
            <p className="font-semibold">{a?.sellerName || 'Unknown'} — {a?.type || 'Ad'}</p>
            <p className="text-sm text-neutral-500">{fmt(Number(a?.amount || 0))} · {a?.duration || '-'} days</p>
          </div>
        ))}
        {ads.length === 0 && <p className="text-neutral-500">No seller ads found.</p>}
      </div>
    </div>
  )
}

// ============ AFFILIATES ============
function Affiliates({ adminKey }: { adminKey: string }) {
  const { data, isLoading, isError, error, refetch } = trpc.admin.affiliates.useQuery({ key: adminKey }, { retry: false })

  if (isLoading) return <p className="text-neutral-500">Loading affiliates...</p>
  if (isError) return <QueryError title="Could not load affiliates" error={error?.message || 'Unknown'} onRetry={refetch} />

  const affiliates = Array.isArray(data) ? data : []

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {affiliates.map((a: any) => (
          <div key={a?.id || Math.random()} className="bg-white rounded-xl border border-neutral-200 p-4">
            <p className="font-semibold">{a?.name || 'Unknown'}</p>
            <p className="text-sm text-neutral-500">Clicks: {a?.clicks || 0} · Conversions: {a?.conversions || 0} · Earnings: {fmt(Number(a?.earnings || 0))}</p>
          </div>
        ))}
        {affiliates.length === 0 && <p className="text-neutral-500">No affiliates found.</p>}
      </div>
    </div>
  )
}

// ============ AUDIT LOG ============
function AuditLog({ adminKey }: { adminKey: string }) {
  const { data, isLoading, isError, error, refetch } = trpc.admin.auditLog.useQuery({ key: adminKey }, { retry: false })

  if (isLoading) return <p className="text-neutral-500">Loading audit log...</p>
  if (isError) return <QueryError title="Could not load audit log" error={error?.message || 'Unknown'} onRetry={refetch} />

  const logs = Array.isArray(data) ? data : []

  return (
    <div className="space-y-3">
      {logs.map((log: any, i: number) => (
        <div key={i} className="bg-white rounded-xl border border-neutral-200 p-3 text-sm">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-neutral-400" />
            <span className="font-medium">{log?.action || 'Action'}</span>
            <span className="text-neutral-400 text-xs">{log?.createdAt ? new Date(log.createdAt).toLocaleString('en-UG') : '-'}</span>
          </div>
          <p className="text-neutral-500 mt-1">{log?.details || '-'}</p>
        </div>
      ))}
      {logs.length === 0 && <p className="text-neutral-500">No audit logs found.</p>}
    </div>
  )
}

// ============ SETTINGS ============
function SettingsPage({ adminKey }: { adminKey: string }) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <h3 className="font-semibold mb-4">Admin Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral-700">Commission Rate (%)</label>
            <input type="number" defaultValue={10} className="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-orange-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700">Delivery Fee (UGX)</label>
            <input type="number" defaultValue={5000} className="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-orange-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700">Maintenance Mode</label>
            <div className="mt-1 flex items-center gap-2">
              <input type="checkbox" className="w-4 h-4" />
              <span className="text-sm text-neutral-600">Enable maintenance mode</span>
            </div>
          </div>
          <button className="px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition">Save Settings</button>
        </div>
      </div>
    </div>
  )
}
