import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BellRing,
  Boxes,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Crown,
  LogOut,
  Menu,
  MessageSquareText,
  PackageCheck,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
  Users,
  WalletCards,
  X,
} from 'lucide-react'
import { trpc } from '../providers/trpc'

const BRAND = '#047857'
const BRAND_DARK = '#065f46'

type IconType = typeof Activity

type AdminModule = {
  title: string
  description: string
  icon: IconType
  status?: string
  statusTone?: 'live' | 'setup' | 'attention'
  action: () => void
}

function MetricCard({ label, value, icon: Icon, note }: { label: string; value: string; icon: IconType; note?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">{value}</p>
          {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          <Icon size={20} />
        </div>
      </div>
    </div>
  )
}

function ModuleCard({ module }: { module: AdminModule }) {
  const tone = module.statusTone === 'live'
    ? 'bg-emerald-50 text-emerald-700'
    : module.statusTone === 'attention'
      ? 'bg-amber-50 text-amber-700'
      : 'bg-slate-100 text-slate-600'

  return (
    <button
      onClick={module.action}
      className="group w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white">
          <module.icon size={19} />
        </div>
        {module.status && (
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${tone}`}>{module.status}</span>
        )}
      </div>
      <h3 className="mt-4 font-bold text-slate-950">{module.title}</h3>
      <p className="mt-1 min-h-10 text-sm leading-5 text-slate-500">{module.description}</p>
      <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-emerald-700">
        Open <ArrowRight size={15} className="transition group-hover:translate-x-1" />
      </div>
    </button>
  )
}

function QueryNotice({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      <AlertTriangle size={16} />
      {message}
    </div>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [adminKey, setAdminKey] = useState(() => localStorage.getItem('ug_admin_key') || '')
  const [keyInput, setKeyInput] = useState('')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [orderSearch, setOrderSearch] = useState('')

  const statsQuery = trpc.admin.stats.useQuery({ key: adminKey }, { enabled: !!adminKey, retry: false })
  const ordersQuery = trpc.admin.orders.useQuery(
    { key: adminKey, search: orderSearch || undefined },
    { enabled: !!adminKey, retry: false }
  )
  const sellersQuery = trpc.admin.sellers.useQuery(
    { key: adminKey },
    { enabled: !!adminKey, retry: false }
  )
  const payoutsQuery = trpc.admin.pendingPayouts.useQuery(
    { key: adminKey },
    { enabled: !!adminKey, retry: false }
  )
  const deliveryQuery = trpc.admin.deliveryPartners.useQuery(
    { key: adminKey },
    { enabled: !!adminKey, retry: false }
  )
  const returnsQuery = trpc.admin.returns.useQuery(
    { key: adminKey },
    { enabled: !!adminKey, retry: false }
  )

  const stats = (statsQuery.data as any) ?? {}
  const orders = ((ordersQuery.data as any)?.orders ?? ordersQuery.data ?? []) as any[]
  const sellers = (sellersQuery.data ?? []) as any[]
  const pendingPayouts = ((payoutsQuery.data as any)?.pending ?? []) as any[]
  const deliveryPartners = (deliveryQuery.data ?? []) as any[]
  const returns = (returnsQuery.data ?? []) as any[]

  const paidOrders = useMemo(() => orders.filter((order) => order?.paymentStatus === 'paid').length, [orders])
  const activeDeliveries = useMemo(
    () => orders.filter((order) => ['pending_delivery', 'on_the_way'].includes(String(order?.status))).length,
    [orders]
  )
  const pendingReturns = useMemo(
    () => returns.filter((item) => ['requested', 'approved', 'picked_up'].includes(String(item?.status))).length,
    [returns]
  )
  const approvedSellers = useMemo(() => sellers.filter((seller) => seller?.status === 'approved').length, [sellers])

  const login = () => {
    const key = keyInput.trim()
    if (!key) return
    localStorage.setItem('ug_admin_key', key)
    setAdminKey(key)
  }

  const logout = () => {
    localStorage.removeItem('ug_admin_key')
    setAdminKey('')
    setKeyInput('')
  }

  const refreshAll = () => {
    statsQuery.refetch()
    ordersQuery.refetch()
    sellersQuery.refetch()
    payoutsQuery.refetch()
    deliveryQuery.refetch()
    returnsQuery.refetch()
  }

  const modules: AdminModule[] = [
    {
      title: 'Orders',
      description: 'Review customer orders, payment state and fulfillment progress.',
      icon: ShoppingBag,
      status: `${orders.length} loaded`,
      statusTone: 'live',
      action: () => navigate('/admin/operations'),
    },
    {
      title: 'Payments',
      description: 'Payment visibility is available on orders; Flutterwave transaction operations are the next backend layer.',
      icon: CreditCard,
      status: paidOrders > 0 ? `${paidOrders} paid` : 'Needs gateway ops',
      statusTone: paidOrders > 0 ? 'live' : 'setup',
      action: () => navigate('/admin/operations'),
    },
    {
      title: 'UG Souq Plus',
      description: 'Membership pricing, subscribers, renewals and free-delivery benefit management.',
      icon: Crown,
      status: 'Integration stage',
      statusTone: 'setup',
      action: () => navigate('/plus'),
    },
    {
      title: 'Customers',
      description: 'Customer account operations are grouped with revenue and marketplace account controls.',
      icon: Users,
      status: 'Operations',
      statusTone: 'live',
      action: () => navigate('/admin/operations'),
    },
    {
      title: 'Sellers & Products',
      description: 'Approve sellers, moderate listings and control marketplace quality.',
      icon: Store,
      status: `${approvedSellers} approved`,
      statusTone: 'live',
      action: () => navigate('/admin/operations'),
    },
    {
      title: 'Delivery Control',
      description: 'Manage delivery partners now; order assignment and rider tracking can plug into this control center.',
      icon: Truck,
      status: `${activeDeliveries} active`,
      statusTone: activeDeliveries > 0 ? 'attention' : 'live',
      action: () => navigate('/admin/operations'),
    },
    {
      title: 'SMS & Notifications',
      description: 'Africa’s Talking will handle payment confirmations, order updates and delivery tracking messages.',
      icon: MessageSquareText,
      status: 'Setup required',
      statusTone: 'setup',
      action: () => navigate('/admin/operations'),
    },
    {
      title: 'Returns & Refunds',
      description: 'Review return requests and track cases through pickup, refund and closure.',
      icon: RotateCcw,
      status: `${pendingReturns} pending`,
      statusTone: pendingReturns > 0 ? 'attention' : 'live',
      action: () => navigate('/admin/operations'),
    },
    {
      title: 'Seller Payouts',
      description: 'Track marketplace commissions and pending settlements to sellers.',
      icon: WalletCards,
      status: `${pendingPayouts.length} pending`,
      statusTone: pendingPayouts.length > 0 ? 'attention' : 'live',
      action: () => navigate('/admin/operations'),
    },
    {
      title: 'Reports & Audit',
      description: 'Financial reporting, commissions, marketplace activity and admin audit history.',
      icon: BarChart3,
      status: 'Live',
      statusTone: 'live',
      action: () => navigate('/admin/operations'),
    },
    {
      title: 'Configuration',
      description: 'Commission, delivery fees, thresholds, support contacts and platform settings.',
      icon: Settings,
      status: 'Manage',
      statusTone: 'live',
      action: () => navigate('/admin/operations'),
    },
    {
      title: 'Security',
      description: 'Current admin-key access remains available; role-based admin accounts should replace it before scaling.',
      icon: ShieldCheck,
      status: 'Upgrade advised',
      statusTone: 'attention',
      action: () => navigate('/admin/operations'),
    },
  ]

  if (!adminKey) {
    return (
      <div className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <div className="mx-auto flex min-h-[80vh] max-w-md items-center">
          <div className="w-full rounded-3xl border border-white/10 bg-white p-6 text-slate-950 shadow-2xl sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: BRAND }}>
                <ShieldCheck size={22} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">UG Souq</p>
                <h1 className="text-xl font-black">Administrator Console</h1>
              </div>
            </div>
            <p className="mt-6 text-sm leading-6 text-slate-500">Secure access to marketplace orders, sellers, payments, delivery operations and business controls.</p>
            <label className="mt-6 block text-xs font-bold uppercase tracking-wide text-slate-500">Admin key</label>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && login()}
              placeholder="Enter administrator key"
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
            <button onClick={login} className="mt-4 w-full rounded-xl py-3 text-sm font-bold text-white" style={{ backgroundColor: BRAND }}>
              Open Admin Dashboard
            </button>
            <button onClick={() => navigate('/')} className="mt-3 w-full py-2 text-sm font-semibold text-slate-500 hover:text-slate-900">
              Back to UG Souq
            </button>
          </div>
        </div>
      </div>
    )
  }

  const loading = statsQuery.isLoading || ordersQuery.isLoading
  const hasCriticalError = Boolean(statsQuery.error || ordersQuery.error)

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      {mobileMenu && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMobileMenu(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-800 bg-slate-950 text-white transition-transform lg:translate-x-0 ${mobileMenu ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="border-b border-white/10 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: BRAND }}>
                <Store size={20} />
              </div>
              <div>
                <p className="font-black">UG Souq Admin</p>
                <p className="text-xs text-slate-400">Control Center</p>
              </div>
            </div>
            <button className="lg:hidden" onClick={() => setMobileMenu(false)}><X size={20} /></button>
          </div>
        </div>

        <nav className="space-y-1 p-4 text-sm">
          <button className="flex w-full items-center gap-3 rounded-xl bg-white/10 px-3 py-3 font-semibold text-white">
            <Activity size={18} /> Dashboard
          </button>
          <button onClick={() => navigate('/admin/operations')} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 font-semibold text-slate-300 hover:bg-white/5 hover:text-white">
            <Boxes size={18} /> Operations
          </button>
          <button onClick={() => navigate('/plus')} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 font-semibold text-slate-300 hover:bg-white/5 hover:text-white">
            <Crown size={18} /> Plus Membership
          </button>
          <button onClick={() => navigate('/admin/operations')} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 font-semibold text-slate-300 hover:bg-white/5 hover:text-white">
            <CircleDollarSign size={18} /> Finance
          </button>
          <button onClick={() => navigate('/admin/operations')} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 font-semibold text-slate-300 hover:bg-white/5 hover:text-white">
            <BellRing size={18} /> Communications
          </button>
        </nav>

        <div className="absolute inset-x-0 bottom-0 border-t border-white/10 p-4">
          <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-rose-300 hover:bg-rose-500/10">
            <LogOut size={18} /> Sign out
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <button onClick={() => setMobileMenu(true)} className="rounded-lg border border-slate-200 p-2 lg:hidden"><Menu size={20} /></button>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Administrator</p>
                <h1 className="text-lg font-black sm:text-xl">Marketplace Dashboard</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={refreshAll} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50">
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <div className="hidden rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 sm:block">Admin connected</div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
          <section className="overflow-hidden rounded-3xl bg-slate-950 p-5 text-white sm:p-7">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div className="max-w-2xl">
                <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">
                  <CheckCircle2 size={15} /> UG Souq Operations
                </div>
                <h2 className="text-2xl font-black tracking-tight sm:text-3xl">One place to run the marketplace.</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">Orders, sellers, finance, delivery, returns and the upcoming Flutterwave + Africa’s Talking operations layer are organized from this administrator-only console.</p>
              </div>
              <button onClick={() => navigate('/admin/operations')} className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white" style={{ backgroundColor: BRAND }}>
                Open detailed operations <ArrowRight size={16} />
              </button>
            </div>
          </section>

          {hasCriticalError && <QueryNotice message="Some live admin data could not be loaded. Confirm the admin key or backend connection, then refresh." />}

          <section>
            <div className="mb-3 flex items-end justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Live snapshot</p>
                <h2 className="text-lg font-black">Marketplace health</h2>
              </div>
              {loading && <span className="text-xs text-slate-500">Updating…</span>}
            </div>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <MetricCard label="Total Orders" value={String(stats?.totalOrders ?? orders.length ?? 0)} icon={ShoppingBag} note={`${paidOrders} paid in loaded results`} />
              <MetricCard label="Revenue" value={`UGX ${Number(stats?.revenue ?? 0).toLocaleString()}`} icon={CircleDollarSign} note="Marketplace revenue" />
              <MetricCard label="Sellers" value={String(stats?.totalSellers ?? sellers.length ?? 0)} icon={Store} note={`${approvedSellers} approved`} />
              <MetricCard label="Products" value={String(stats?.totalProducts ?? 0)} icon={PackageCheck} note="Marketplace catalog" />
              <MetricCard label="Active Delivery" value={String(activeDeliveries)} icon={Truck} note={`${deliveryPartners.length} partners loaded`} />
              <MetricCard label="Pending Returns" value={String(pendingReturns)} icon={RotateCcw} note="Needs operations review" />
              <MetricCard label="Seller Payouts" value={String(pendingPayouts.length)} icon={WalletCards} note="Pending settlement groups" />
              <MetricCard label="Payment Status" value={paidOrders ? `${paidOrders} paid` : 'Monitor'} icon={CreditCard} note="Flutterwave control layer next" />
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Operations queue</p>
                  <h2 className="font-black">Recent orders</h2>
                </div>
                <div className="relative sm:w-64">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search orders"
                    className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-400"
                  />
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {orders.slice(0, 6).map((order: any, index) => (
                  <div key={order?.id ?? order?.code ?? index} className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-black">{order?.code ?? `#${order?.id ?? '-'}`}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${order?.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {order?.paymentStatus === 'paid' ? 'Paid' : order?.paymentStatus ?? 'Unpaid'}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm text-slate-500">{order?.customerName ?? 'Customer'} · {order?.phone ?? 'No phone'} · {order?.status ?? 'placed'}</p>
                    </div>
                    <div className="text-right">
                      <p className="whitespace-nowrap text-sm font-black">UGX {Number(order?.total ?? 0).toLocaleString()}</p>
                      <button onClick={() => navigate('/admin/operations')} className="mt-1 text-xs font-bold text-emerald-700">Manage</button>
                    </div>
                  </div>
                ))}
                {!loading && orders.length === 0 && <div className="p-8 text-center text-sm text-slate-500">No orders found.</div>}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Integration status</p>
                <h2 className="mt-1 font-black">Payments & messaging</h2>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center gap-3"><CreditCard size={18} className="text-emerald-700" /><div><p className="text-sm font-bold">Flutterwave</p><p className="text-xs text-slate-500">Customer payments + Plus</p></div></div>
                    <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-700">Backend setup</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center gap-3"><MessageSquareText size={18} className="text-emerald-700" /><div><p className="text-sm font-bold">Africa’s Talking</p><p className="text-xs text-slate-500">SMS + tracking alerts</p></div></div>
                    <span className="rounded-full bg-slate-200 px-2 py-1 text-[11px] font-bold text-slate-600">Not connected</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-start gap-3">
                  <BadgeCheck size={20} className="mt-0.5 text-emerald-700" />
                  <div>
                    <p className="font-black text-emerald-950">Admin separation complete</p>
                    <p className="mt-1 text-sm leading-5 text-emerald-800">The administrator landing dashboard is now separate from the shopper experience. Detailed legacy operations remain accessible without losing existing controls.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Control center</p>
              <h2 className="text-lg font-black">Administrator modules</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {modules.map((module) => <ModuleCard key={module.title} module={module} />)}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
