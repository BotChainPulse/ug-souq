import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Boxes,
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

type Icon = typeof Activity

function Metric({ label, value, icon: IconComponent, note }: { label: string; value: string; icon: Icon; note: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{note}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          <IconComponent size={20} />
        </div>
      </div>
    </div>
  )
}

function AdminModule({ title, description, status, icon: IconComponent, onClick }: {
  title: string
  description: string
  status: string
  icon: Icon
  onClick: () => void
}) {
  return (
    <button onClick={onClick} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white"><IconComponent size={19} /></div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">{status}</span>
      </div>
      <h3 className="mt-4 font-black text-slate-950">{title}</h3>
      <p className="mt-1 min-h-10 text-sm leading-5 text-slate-500">{description}</p>
      <div className="mt-4 flex items-center gap-1 text-sm font-bold text-emerald-700">Open <ArrowRight size={15} /></div>
    </button>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [adminKey, setAdminKey] = useState(() => localStorage.getItem('ug_admin_key') || '')
  const [keyInput, setKeyInput] = useState('')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [orderSearch, setOrderSearch] = useState('')

  const statsQuery = trpc.admin.stats.useQuery({ key: adminKey }, { enabled: !!adminKey, retry: false })
  const ordersQuery = trpc.admin.orders.useQuery({ key: adminKey, search: orderSearch || undefined }, { enabled: !!adminKey, retry: false })
  const sellersQuery = trpc.admin.sellers.useQuery({ key: adminKey }, { enabled: !!adminKey, retry: false })
  const payoutsQuery = trpc.admin.pendingPayouts.useQuery({ key: adminKey }, { enabled: !!adminKey, retry: false })

  const stats = (statsQuery.data as any) ?? {}
  const orders = ((ordersQuery.data as any)?.orders ?? ordersQuery.data ?? []) as any[]
  const sellers = (sellersQuery.data ?? []) as any[]
  const payouts = ((payoutsQuery.data as any)?.pending ?? []) as any[]

  const paidOrders = useMemo(() => orders.filter((order) => order?.paymentStatus === 'paid').length, [orders])
  const activeDeliveries = useMemo(() => orders.filter((order) => ['pending_delivery', 'on_the_way'].includes(String(order?.status))).length, [orders])
  const approvedSellers = useMemo(() => sellers.filter((seller) => seller?.status === 'approved').length, [sellers])
  const loading = statsQuery.isLoading || ordersQuery.isLoading
  const hasError = Boolean(statsQuery.error || ordersQuery.error)

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

  const refresh = () => {
    statsQuery.refetch()
    ordersQuery.refetch()
    sellersQuery.refetch()
    payoutsQuery.refetch()
  }

  if (!adminKey) {
    return (
      <div className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <div className="mx-auto flex min-h-[80vh] max-w-md items-center">
          <div className="w-full rounded-3xl bg-white p-7 text-slate-950 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: BRAND }}><ShieldCheck size={22} /></div>
              <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">UG Souq</p><h1 className="text-xl font-black">Administrator Console</h1></div>
            </div>
            <p className="mt-5 text-sm leading-6 text-slate-500">Private marketplace control for orders, sellers, payments, deliveries and business operations.</p>
            <input type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && login()} placeholder="Administrator key" className="mt-6 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500" />
            <button onClick={login} className="mt-3 w-full rounded-xl py-3 text-sm font-bold text-white" style={{ backgroundColor: BRAND }}>Open Dashboard</button>
            <button onClick={() => navigate('/')} className="mt-2 w-full py-2 text-sm font-semibold text-slate-500">Back to UG Souq</button>
          </div>
        </div>
      </div>
    )
  }

  const modules = [
    ['Orders', 'Payments, fulfillment status and customer order operations.', `${orders.length} loaded`, ShoppingBag],
    ['Payments', 'Flutterwave payment monitoring and reconciliation layer.', paidOrders ? `${paidOrders} paid` : 'Gateway setup', CreditCard],
    ['UG Souq Plus', 'Memberships, renewals and unlimited-delivery benefits.', 'Integration stage', Crown],
    ['Customers', 'Customer account, order history and support operations.', 'Operations', Users],
    ['Sellers & Products', 'Seller approvals, listing moderation and catalog health.', `${approvedSellers} approved`, Store],
    ['Delivery Control', 'Delivery partners, dispatch queue and tracking operations.', `${activeDeliveries} active`, Truck],
    ['SMS & Notifications', 'Africa’s Talking confirmations and delivery alerts.', 'Setup required', MessageSquareText],
    ['Returns & Refunds', 'Return requests, pickup, refunds and closure.', 'Operations', RotateCcw],
    ['Seller Payouts', 'Commission settlement and seller payout queue.', `${payouts.length} pending`, WalletCards],
    ['Reports', 'Revenue, commissions, operational performance and audit history.', 'Live', BarChart3],
    ['Marketplace Settings', 'Commission, delivery fees and platform configuration.', 'Manage', Settings],
    ['Detailed Operations', 'Open the existing full administrator operations console.', 'Available', Boxes],
  ] as const

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      {mobileMenu && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMobileMenu(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-950 text-white transition-transform lg:translate-x-0 ${mobileMenu ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="border-b border-white/10 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: BRAND }}><Store size={20} /></div><div><p className="font-black">UG Souq Admin</p><p className="text-xs text-slate-400">Control Center</p></div></div>
            <button className="lg:hidden" onClick={() => setMobileMenu(false)}><X size={20} /></button>
          </div>
        </div>
        <nav className="space-y-1 p-4 text-sm">
          <button className="flex w-full items-center gap-3 rounded-xl bg-white/10 px-3 py-3 font-bold"><Activity size={18} /> Dashboard</button>
          <button onClick={() => navigate('/admin/operations')} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 font-semibold text-slate-300 hover:bg-white/5"><Boxes size={18} /> Operations</button>
          <button onClick={() => navigate('/plus')} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 font-semibold text-slate-300 hover:bg-white/5"><Crown size={18} /> Plus Membership</button>
        </nav>
        <div className="absolute inset-x-0 bottom-0 border-t border-white/10 p-4"><button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-rose-300"><LogOut size={18} /> Sign out</button></div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3"><button onClick={() => setMobileMenu(true)} className="rounded-lg border border-slate-200 p-2 lg:hidden"><Menu size={20} /></button><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Administrator</p><h1 className="text-lg font-black">Marketplace Dashboard</h1></div></div>
            <button onClick={refresh} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /><span className="hidden sm:inline">Refresh</span></button>
          </div>
        </header>

        <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
          <section className="rounded-3xl bg-slate-950 p-6 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">UG Souq Operations</p>
            <div className="mt-3 flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><h2 className="text-2xl font-black sm:text-3xl">One place to run the marketplace.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">This administrator-only dashboard separates business operations from the shopper experience and creates dedicated space for payments, Plus membership, SMS and delivery control.</p></div><button onClick={() => navigate('/admin/operations')} className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold" style={{ backgroundColor: BRAND }}>Detailed operations <ArrowRight size={16} /></button></div>
          </section>

          {hasError && <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"><AlertTriangle size={17} />Some live admin data could not be loaded. Check the admin key or backend connection.</div>}

          <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Metric label="Total Orders" value={String(stats?.totalOrders ?? orders.length)} icon={ShoppingBag} note={`${paidOrders} paid in loaded orders`} />
            <Metric label="Revenue" value={`UGX ${Number(stats?.revenue ?? 0).toLocaleString()}`} icon={CircleDollarSign} note="Marketplace revenue" />
            <Metric label="Sellers" value={String(stats?.totalSellers ?? sellers.length)} icon={Store} note={`${approvedSellers} approved`} />
            <Metric label="Products" value={String(stats?.totalProducts ?? 0)} icon={PackageCheck} note="Marketplace catalog" />
            <Metric label="Active Delivery" value={String(activeDeliveries)} icon={Truck} note="Preparing or on the way" />
            <Metric label="Paid Orders" value={String(paidOrders)} icon={CreditCard} note="Loaded payment results" />
            <Metric label="Pending Payouts" value={String(payouts.length)} icon={WalletCards} note="Seller settlements" />
            <Metric label="Plus & SMS" value="Setup" icon={Crown} note="Flutterwave + Africa’s Talking" />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Operations queue</p><h2 className="font-black">Recent orders</h2></div><div className="relative sm:w-64"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} placeholder="Search orders" className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-400" /></div></div>
              <div className="divide-y divide-slate-100">
                {orders.slice(0, 6).map((order, index) => <div key={order?.id ?? order?.code ?? index} className="flex items-center justify-between gap-4 p-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm font-black">{order?.code ?? `#${order?.id ?? '-'}`}</span><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${order?.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{order?.paymentStatus === 'paid' ? 'Paid' : order?.paymentStatus ?? 'Unpaid'}</span></div><p className="mt-1 truncate text-sm text-slate-500">{order?.customerName ?? 'Customer'} · {order?.status ?? 'placed'}</p></div><div className="text-right"><p className="whitespace-nowrap text-sm font-black">UGX {Number(order?.total ?? 0).toLocaleString()}</p><button onClick={() => navigate('/admin/operations')} className="mt-1 text-xs font-bold text-emerald-700">Manage</button></div></div>)}
                {!loading && orders.length === 0 && <div className="p-8 text-center text-sm text-slate-500">No orders found.</div>}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Integration status</p><h2 className="mt-1 font-black">Payments & messaging</h2>
              <div className="mt-4 space-y-3"><div className="rounded-xl bg-slate-50 p-3"><div className="flex items-center gap-3"><CreditCard size={18} className="text-emerald-700" /><div><p className="text-sm font-bold">Flutterwave</p><p className="text-xs text-slate-500">Payments + Plus membership</p></div></div><p className="mt-2 text-xs font-semibold text-amber-700">Backend transaction controls still need to be connected.</p></div><div className="rounded-xl bg-slate-50 p-3"><div className="flex items-center gap-3"><MessageSquareText size={18} className="text-emerald-700" /><div><p className="text-sm font-bold">Africa’s Talking</p><p className="text-xs text-slate-500">SMS confirmations + tracking alerts</p></div></div><p className="mt-2 text-xs font-semibold text-slate-600">Provider connection not added yet.</p></div></div>
            </div>
          </section>

          <section><div className="mb-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Control center</p><h2 className="text-lg font-black">Administrator modules</h2></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{modules.map(([title, description, status, icon]) => <AdminModule key={title} title={title} description={description} status={status} icon={icon} onClick={() => title === 'UG Souq Plus' ? navigate('/plus') : navigate('/admin/operations')} />)}</div></section>
        </main>
      </div>
    </div>
  )
}
