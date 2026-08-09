import { useState } from 'react'
import { useNavigate } from 'react-router'
import { trpc } from '../providers/trpc'
import { fmt } from '../lib/cart'
import {
  LayoutDashboard, Store, Package, ShoppingCart, Users, CreditCard,
  Truck, RotateCcw, Megaphone, Link2, Settings, FileText, LogOut,
  Search, ChevronDown, CheckCircle, AlertTriangle
} from 'lucide-react'

const STATUS_LABEL: Record<string, string> = {
  placed: "Placed", confirmed: "Confirmed", pending_delivery: "Preparing",
  on_the_way: "Delivering", delivered: "Delivered", cancelled: "Cancelled",
}

const STATUS_COLORS: Record<string, string> = {
  placed: "bg-neutral-100 text-neutral-700",
  confirmed: "bg-blue-100 text-blue-700",
  pending_delivery: "bg-amber-100 text-amber-700",
  on_the_way: "bg-sky-100 text-sky-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
}

const ORDER_STATUSES = ["placed","confirmed","pending_delivery","on_the_way","delivered","cancelled"] as const

function StatusBadge({ status }: { status: string }) {
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[status] || STATUS_COLORS.placed}`}>{STATUS_LABEL[status] || status}</span>
}

function PaymentBadge({ status }: { status: string | null | undefined }) {
  const s = status || "unpaid"
  const cls = s === "paid" ? "bg-emerald-100 text-emerald-700" : s === "pending_confirmation" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
  const text = s === "paid" ? "Paid" : s === "pending_confirmation" ? "Confirming" : "Unpaid"
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{text}</span>
}

function Card({ title, value, icon: Icon }: { title: string; value: string; icon: any }) {
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
  const [tab, setTab] = useState("overview")
  const [adminKey, setAdminKey] = useState(() => localStorage.getItem("ug_admin_key") || "")
  const [keyInput, setKeyInput] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { data: stats, isLoading: statsLoading } = trpc.admin.stats.useQuery(
    { key: adminKey }, { enabled: !!adminKey, retry: false }
  )

  const login = () => {
    if (keyInput.trim()) {
      localStorage.setItem("ug_admin_key", keyInput.trim())
      setAdminKey(keyInput.trim())
    }
  }

  const logout = () => {
    localStorage.removeItem("ug_admin_key")
    setAdminKey("")
    setKeyInput("")
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
          <input type="password" placeholder="Admin key" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()} className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-orange-500 mb-3" />
          <button onClick={login} className="w-full rounded-lg bg-orange-500 text-white py-2.5 text-sm font-semibold hover:bg-orange-600 transition">Sign In</button>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "sellers", label: "Sellers", icon: Store },
    { id: "listings", label: "Listings", icon: Package },
    { id: "orders", label: "Orders", icon: ShoppingCart },
    { id: "accounts", label: "Accounts", icon: Users },
    { id: "payouts", label: "Payouts", icon: CreditCard },
    { id: "deliveries", label: "Deliveries", icon: Truck },
    { id: "returns", label: "Returns", icon: RotateCcw },
    { id: "ads", label: "Seller Ads", icon: Megaphone },
    { id: "affiliates", label: "Affiliates", icon: Link2 },
    { id: "audit", label: "Audit Log", icon: FileText },
    { id: "settings", label: "Settings", icon: Settings },
  ]

  const safeNum = (n: any) => Number(n || 0)

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      <aside className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-neutral-200 transition-transform lg:translate-x-0 lg:static`}>
        <div className="p-4 border-b border-neutral-200 flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center"><Store size={16} className="text-white" /></div>
          <span className="font-bold text-lg">UG Souq</span>
        </div>
        <nav className="p-2 space-y-1">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => { setTab(t.id); setSidebarOpen(false) }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${tab === t.id ? "bg-orange-50 text-orange-700" : "text-neutral-600 hover:bg-neutral-100"}`}>
              <t.icon size={18} /> {t.label}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-neutral-200">
          <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 font-medium"><LogOut size={18} /> Sign Out</button>
        </div>
      </aside>
      {sidebarOpen && <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <main className="flex-1 min-w-0">
        <header className="bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-neutral-100 rounded-lg"><LayoutDashboard size={20} /></button>
            <h2 className="font-semibold text-lg">{tabs.find((t) => t.id === tab)?.label}</h2>
          </div>
          <button onClick={() => navigate("/")} className="text-sm text-neutral-600 hover:text-neutral-900 font-medium">View Store</button>
        </header>
        <div className="p-4 lg:p-6 max-w-7xl mx-auto">
          {tab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card title="Revenue" value={fmt(safeNum(stats?.revenue))} icon={CreditCard} />
                <Card title="Orders" value={String(safeNum(stats?.orderCount))} icon={ShoppingCart} />
                <Card title="Sellers" value={String(safeNum(stats?.sellerCount))} icon={Store} />
                <Card title="Pending" value={String(safeNum(stats?.pendingSellerCount))} icon={Users} />
              </div>
            </div>
          )}
          {tab === "orders" && <Orders adminKey={adminKey} />}
          {tab !== "overview" && tab !== "orders" && (
            <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center">
              <p className="text-neutral-500">{tabs.find((t) => t.id === tab)?.label} coming soon.</p>
            </div>
          )}
        </div>
        <footer className="border-t border-neutral-200 bg-white px-4 py-3 text-xs text-neutral-500 flex flex-wrap items-center justify-between gap-2">
          <span>© UG Souq — 2026</span><span>Admin v1.0.0</span><span className="text-emerald-600 font-medium">● System Online</span>
        </footer>
      </main>
    </div>
  )
}

function Orders({ adminKey }: { adminKey: string }) {
  const utils = trpc.useUtils()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null)

  const { data, isLoading, isError, error, refetch } = trpc.admin.orders.useQuery(
    { key: adminKey, search: search || undefined, status: statusFilter !== "all" ? statusFilter as any : undefined },
    { retry: false }
  )
  const { data: partnersData } = trpc.admin.deliveryPartners.useQuery({ key: adminKey })
  const setStatus = trpc.admin.setOrderStatus.useMutation({ 
    onSuccess: () => { 
      utils.admin.orders.invalidate(); 
      utils.admin.stats.invalidate() 
    } 
  })
  const setPayment = trpc.admin.setPaymentStatus.useMutation({ 
    onSuccess: () => utils.admin.orders.invalidate() 
  })
  const assignDelivery = trpc.admin.assignDeliveryPartner.useMutation({ 
    onSuccess: () => { 
      utils.admin.orders.invalidate(); 
      utils.admin.deliveryPartners.invalidate() 
    } 
  })
  const unassignDelivery = trpc.admin.unassignDeliveryPartner.useMutation({ 
    onSuccess: () => utils.admin.orders.invalidate() 
  })
  const markDelivered = trpc.admin.markDelivered.useMutation({ 
    onSuccess: () => { 
      utils.admin.orders.invalidate(); 
      utils.admin.stats.invalidate() 
    } 
  })

  if (isLoading) return <p className="text-neutral-500 p-4">Loading orders...</p>
  if (isError) return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 m-4">
      <p className="text-red-700 font-medium">Could not load orders</p>
      <p className="text-sm text-red-600 mt-1">{error?.message ?? "Unknown error"}</p>
      <button onClick={() => refetch()} className="mt-2 text-sm px-3 py-1.5 bg-red-600 text-white rounded-lg">Retry</button>
    </div>
  )
  if (!data) return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 m-4">
      <p className="text-red-700 font-medium">No response from server.</p>
      <button onClick={() => refetch()} className="mt-2 text-sm px-3 py-1.5 bg-red-600 text-white rounded-lg">Retry</button>
    </div>
  )

  const approvedPartners = Array.isArray(partnersData?.partners) 
    ? partnersData.partners.filter((p: any) => p?.status === "approved") 
    : []
  const ordersList = Array.isArray(data) ? data : []

  return (
    <div className="space-y-4 p-4">
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
        {ordersList.length === 0 && <p className="text-neutral-500">No orders found.</p>}
        {ordersList.map((o: any) => {
          if (!o) return null
          const safeTotal = Number(o?.total ?? 0)
          const safeDelivery = Number(o?.deliveryFee ?? 0)
          const safeCommission = Number(o?.commissionFee ?? 0)
          const items = Array.isArray(o?.items) ? o.items : []
          const orderId = Number(o?.id ?? 0)
          const orderCode = String(o?.code ?? "N/A")
          const orderStatus = String(o?.status ?? "placed")
          const paymentStatus = String(o?.paymentStatus ?? "unpaid")
          const customerName = String(o?.customerName ?? "Unknown")
          const phone = String(o?.phone ?? "-")
          const address = String(o?.address ?? "")
          const paymentMethod = String(o?.paymentMethod ?? "-")
          const createdAt = o?.createdAt ? new Date(o.createdAt).toLocaleString("en-UG") : "-"
          const deliveryPartnerId = o?.deliveryPartnerId ?? null
          const isPaidOut = Boolean(o?.paidOut)

          return (
            <div key={orderId || Math.random()} className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
              <div className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => setExpandedOrder(expandedOrder === orderId ? null : orderId)} className="flex items-center gap-1">
                    {expandedOrder === orderId ? <ChevronDown size={16} /> : <ChevronDown size={16} className="rotate-[-90deg]" />}
                  </button>
                  <span className="font-mono font-bold text-sm">{orderCode}</span>
                  <StatusBadge status={orderStatus} />
                  <PaymentBadge status={paymentStatus} />
                  {isPaidOut && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">Paid Out</span>}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className="font-extrabold text-lg">{fmt(safeTotal)}</span>
                  <select 
                    value={orderStatus} 
                    onChange={(e) => { 
                      if (orderId) setStatus.mutate({ key: adminKey, id: orderId, status: e.target.value as any }) 
                    }} 
                    className="text-sm rounded-lg border border-neutral-300 px-3 py-1.5 bg-white"
                  >
                    {ORDER_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                  <select 
                    value={paymentStatus} 
                    onChange={(e) => { 
                      if (orderId) setPayment.mutate({ key: adminKey, id: orderId, status: e.target.value as any }) 
                    }} 
                    className="text-sm rounded-lg border border-neutral-300 px-3 py-1.5 bg-white"
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="pending_confirmation">Confirming</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                <p className="mt-2 text-sm text-neutral-600">
                  {customerName} · {phone} · {address.slice(0,60)}{address.length > 60 ? "..." : ""} · {paymentMethod} · {createdAt}
                </p>
                {orderStatus !== "cancelled" && orderStatus !== "delivered" && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {deliveryPartnerId ? (
                      <div className="flex items-center gap-2">
                        <Truck size={14} className="text-sky-600" />
                        <span className="text-xs text-sky-700 font-medium">Rider assigned</span>
                        <button 
                          onClick={() => { if (orderId) unassignDelivery.mutate({ key: adminKey, orderId }) }} 
                          disabled={unassignDelivery.isPending} 
                          className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 font-medium disabled:opacity-50"
                        >
                          Unassign
                        </button>
                        <button 
                          onClick={() => { if (orderId) markDelivered.mutate({ key: adminKey, orderId }) }} 
                          disabled={markDelivered.isPending} 
                          className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-700 font-medium disabled:opacity-50"
                        >
                          <CheckCircle size={12} className="inline mr-1" /> Mark Delivered
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-500">Assign rider:</span>
                        <select 
                          value={""} 
                          onChange={(e) => { 
                            const pid = e.target.value ? parseInt(e.target.value) : null
                            if (pid && orderId) assignDelivery.mutate({ key: adminKey, orderId, partnerId: pid }) 
                          }} 
                          className="text-xs rounded-lg border border-neutral-300 px-2 py-1 bg-white"
                        >
                          <option value="">Select rider...</option>
                          {approvedPartners.map((p: any) => (
                            <option key={p?.id ?? Math.random()} value={p?.id ?? ""}>
                              {String(p?.fullName ?? "Unknown")} ({String(p?.vehicleType ?? "-")})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {expandedOrder === orderId && items.length > 0 && (
                <div className="border-t border-neutral-100 p-4 bg-neutral-50">
                  <h4 className="text-xs font-bold text-neutral-500 uppercase mb-2">Order Items</h4>
                  <div className="space-y-2">
                    {items.map((it: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{Number(it?.qty ?? 1)} × {String(it?.name ?? "Item")}</span>
                        <span className="font-medium">{fmt(Number(it?.price ?? 0) * Number(it?.qty ?? 1))}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm text-neutral-500 pt-2 border-t border-neutral-200"><span>Delivery</span><span>{fmt(safeDelivery)}</span></div>
                    <div className="flex justify-between text-sm text-neutral-500"><span>Commission</span><span>{fmt(safeCommission)}</span></div>
                    <div className="flex justify-between font-bold text-sm pt-2 border-t border-neutral-200"><span>Total</span><span>{fmt(safeTotal)}</span></div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
