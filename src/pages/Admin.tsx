import { useState } from 'react'
import React from 'react'
import { useNavigate } from 'react-router'
import { trpc } from '../providers/trpc'
import { fmt } from '../lib/cart'
import {
  LayoutDashboard, Store, Package, ShoppingCart, Users, CreditCard,
  Truck, RotateCcw, Megaphone, Link2, Settings, FileText, LogOut,
  Search, ChevronDown, CheckCircle, AlertTriangle, Eye, Check, X
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

const SELLER_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
}

const LISTING_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
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

// ============================================
// SELLERS COMPONENT
// ============================================
function Sellers({ adminKey }: { adminKey: string }) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all")

  const { data: sellersData, isLoading, error, refetch } = trpc.admin.sellers.useQuery(
    { key: adminKey, search: search || undefined, status: statusFilter === "all" ? undefined : statusFilter },
    { enabled: !!adminKey }
  )

  const setSellerStatus = trpc.admin.setSellerStatus.useMutation({
    onSuccess: () => refetch()
  })

  const sellersList = sellersData ?? []

  if (isLoading) return <div className="p-8 text-center text-neutral-500">Loading sellers...</div>

  if (error) {
    return <QueryError title="Failed to load sellers" error={error.message} onRetry={() => refetch()} />
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by shop, owner, phone, district..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3 py-2 rounded-lg border border-neutral-200 text-sm bg-white"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="space-y-3">
        {sellersList.length === 0 && <p className="text-neutral-500">No sellers found.</p>}

        {sellersList.map((s: any) => {
          const sid = Number(s?.id ?? 0)
          const shopName = String(s?.shopName ?? "Unknown Shop")
          const ownerName = String(s?.ownerName ?? "-")
          const phone = String(s?.phone ?? "-")
          const district = String(s?.district ?? "-")
          const status = String(s?.status ?? "pending")
          const verified = Boolean(s?.verified ?? false)
          const contracts = s?.contracts ?? []

          return (
            <div key={sid || Math.random()} className="bg-white rounded-xl border border-neutral-200 p-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-bold text-sm">{shopName}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SELLER_STATUS_COLORS[status] || SELLER_STATUS_COLORS.pending}`}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
                {verified && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium flex items-center gap-1">
                    <CheckCircle size={12} /> Verified
                  </span>
                )}
              </div>
              <p className="text-sm text-neutral-600">
                {ownerName} · {phone} · {district}
              </p>
              {contracts.length > 0 && (
                <p className="text-xs text-neutral-500 mt-1">{contracts.length} contract(s) on file</p>
              )}

              {status === "pending" && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => {
                      if (!sid) return
                      const ok = window.confirm(`Approve ${shopName}?`)
                      if (!ok) return
                      setSellerStatus.mutate({ key: adminKey, id: sid, status: "approved" })
                    }}
                    disabled={setSellerStatus.isLoading}
                    className="text-sm px-3 py-1.5 bg-emerald-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-1"
                  >
                    <Check size={14} /> Approve
                  </button>
                  <button
                    onClick={() => {
                      if (!sid) return
                      const ok = window.confirm(`Reject ${shopName}?`)
                      if (!ok) return
                      setSellerStatus.mutate({ key: adminKey, id: sid, status: "rejected" })
                    }}
                    disabled={setSellerStatus.isLoading}
                    className="text-sm px-3 py-1.5 bg-red-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-1"
                  >
                    <X size={14} /> Reject
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================
// LISTINGS COMPONENT
// ============================================
function Listings({ adminKey }: { adminKey: string }) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all")

  const { data: listingsData, isLoading, error, refetch } = trpc.admin.listings.useQuery(
    { key: adminKey, search: search || undefined, status: statusFilter === "all" ? undefined : statusFilter },
    { enabled: !!adminKey }
  )

  const setListingStatus = trpc.admin.setListingStatus.useMutation({
    onSuccess: () => refetch()
  })

  const listingsList = listingsData ?? []

  if (isLoading) return <div className="p-8 text-center text-neutral-500">Loading listings...</div>

  if (error) {
    return <QueryError title="Failed to load listings" error={error.message} onRetry={() => refetch()} />
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name or seller..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3 py-2 rounded-lg border border-neutral-200 text-sm bg-white"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="space-y-3">
        {listingsList.length === 0 && <p className="text-neutral-500">No listings found.</p>}

        {listingsList.map((l: any) => {
          const lid = Number(l?.id ?? 0)
          const name = String(l?.name ?? "Unnamed Product")
          const price = Number(l?.price ?? 0)
          const sellerName = String(l?.sellerName ?? "Unknown Seller")
          const sellerVerified = Boolean(l?.sellerVerified ?? false)
          const status = String(l?.status ?? "pending")

          return (
            <div key={lid || Math.random()} className="bg-white rounded-xl border border-neutral-200 p-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-bold text-sm">{name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${LISTING_STATUS_COLORS[status] || LISTING_STATUS_COLORS.pending}`}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
                {sellerVerified && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium flex items-center gap-1">
                    <CheckCircle size={12} /> Verified Seller
                  </span>
                )}
              </div>
              <p className="text-sm text-neutral-600">
                UGX {price.toLocaleString()} · by {sellerName}
              </p>

              {status === "pending" && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => {
                      if (!lid) return
                      const ok = window.confirm(`Approve listing "${name}"?`)
                      if (!ok) return
                      setListingStatus.mutate({ key: adminKey, id: lid, status: "approved" })
                    }}
                    disabled={setListingStatus.isLoading}
                    className="text-sm px-3 py-1.5 bg-emerald-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-1"
                  >
                    <Check size={14} /> Approve
                  </button>
                  <button
                    onClick={() => {
                      if (!lid) return
                      const ok = window.confirm(`Reject listing "${name}"?`)
                      if (!ok) return
                      setListingStatus.mutate({ key: adminKey, id: lid, status: "rejected" })
                    }}
                    disabled={setListingStatus.isLoading}
                    className="text-sm px-3 py-1.5 bg-red-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-1"
                  >
                    <X size={14} /> Reject
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================
// ORDERS COMPONENT (existing, preserved)
// ============================================
class OrderErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: string }> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: "" }
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error: String(error?.message || error) }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-700 font-medium">
            <AlertTriangle size={16} />
            <span>Orders failed to load</span>
          </div>
          <p className="text-sm text-red-600 mt-1">{this.state.error}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: "" })}
            className="mt-2 text-sm px-3 py-1.5 bg-red-600 text-white rounded-lg font-medium"
          >
            Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function Orders({ adminKey }: { adminKey: string }) {
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [search, setSearch] = useState("")

  const { data: ordersData, isLoading, refetch } = trpc.admin.orders.useQuery(
    { key: adminKey, status: statusFilter === "all" ? undefined : statusFilter },
    { enabled: !!adminKey, retry: false }
  )

  const setStatus = trpc.admin.setOrderStatus.useMutation({
    onSuccess: () => refetch()
  })

  const ordersList = ordersData?.orders ?? ordersData ?? []

  if (isLoading) return <div className="p-8 text-center text-neutral-500">Loading orders...</div>

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-neutral-200 text-sm bg-white"
        >
          <option value="all">All Status</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {ordersList.length === 0 && <p className="text-neutral-500">No orders found.</p>}

        {ordersList.map((o: any) => {
          if (!o) return null
          const orderId = Number(o?.id ?? 0)
          const orderCode = String(o?.code ?? `#${orderId}`)
          const orderStatus = String(o?.status ?? "placed")
          const paymentStatus = String(o?.paymentStatus ?? "unpaid")
          const customerName = String(o?.customerName ?? "Unknown")
          const phone = String(o?.phone ?? "-")
          const address = String(o?.address ?? "")
          const total = Number(o?.total ?? 0)
          const createdAt = o?.createdAt ? new Date(o.createdAt).toLocaleString("en-UG") : "-"
          const cancelledBy = o?.cancelledBy ?? o?.cancelled_by ?? o?.canceledBy ?? null
          const cancelReason = o?.cancelReason ?? o?.cancellationReason ?? o?.cancel_reason ?? o?.cancellation_reason ?? ""

          const canCancel = orderStatus !== "cancelled" && orderStatus !== "delivered"

          return (
            <div key={orderId || Math.random()} className="bg-white rounded-xl border border-neutral-200 p-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-mono font-bold text-sm">{orderCode}</span>
                <StatusBadge status={orderStatus} />
                <PaymentBadge status={paymentStatus} />
                {orderStatus === "cancelled" && cancelledBy === "customer" && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Cancelled by customer</span>
                )}
              </div>
              <p className="font-extrabold text-lg mb-1">UGX {total.toLocaleString()}</p>
              <p className="text-sm text-neutral-600">
                {customerName} · {phone} · {address.slice(0,60)}{address.length > 60 ? "..." : ""} · {createdAt}
              </p>

              {cancelReason && (
                <p className="mt-2 text-sm text-neutral-600"><strong>Cancel reason:</strong> {String(cancelReason)}</p>
              )}

              {canCancel && (
                <div className="mt-3">
                  <button
                    onClick={() => {
                      if (!orderId) return
                      const ok = window.confirm('Cancel this order? This will set status to cancelled.')
                      if (!ok) return
                      setStatus.mutate({ key: adminKey, id: orderId, status: 'cancelled' })
                    }}
                    disabled={setStatus.isLoading}
                    className="text-sm px-3 py-1.5 bg-red-600 text-white rounded-lg disabled:opacity-50"
                  >
                    Cancel order
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================
// MAIN ADMIN PAGE
// ============================================
export default function Admin() {
  const navigate = useNavigate()
  const [tab, setTab] = useState("overview")
  const [adminKey, setAdminKey] = useState(() => localStorage.getItem("ug_admin_key") || "")
  const [keyInput, setKeyInput] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = trpc.admin.stats.useQuery(
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
            <h1 className="text-lg font-bold">UG Souq Admin</h1>
          </div>
          <p className="text-sm text-neutral-600 mb-4">Enter your admin key to continue.</p>
          <input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
            placeholder="Admin key"
            className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 mb-3"
          />
          <button
            onClick={login}
            className="w-full py-2 bg-orange-500 text-white rounded-lg font-medium text-sm hover:bg-orange-600 transition"
          >
            Login
          </button>
          <button
            onClick={() => navigate("/")}
            className="w-full mt-2 py-2 text-neutral-600 text-sm hover:text-neutral-900"
          >
            ← Back to site
          </button>
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

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-neutral-200 transform transition-transform duration-200 lg:transform-none ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <Store size={16} className="text-white" />
            </div>
            <span className="font-bold text-sm">UG Souq Admin</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 text-neutral-500">
            <X size={18} />
          </button>
        </div>
        <nav className="px-3 py-2 space-y-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setSidebarOpen(false) }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${tab === t.id ? "bg-neutral-100 text-neutral-900" : "text-neutral-600 hover:bg-neutral-50"}`}
            >
              <t.icon size={18} />
              {t.label}
            </button>
          ))}
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition mt-4"
          >
            <LogOut size={18} />
            Logout
          </button>
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">
        <header className="bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1 text-neutral-500">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <h2 className="font-semibold text-sm">{tabs.find((t) => t.id === tab)?.label}</h2>
          </div>
          <div className="text-xs text-neutral-500">Key: {adminKey.slice(0, 8)}...</div>
        </header>

        <div className="p-4 lg:p-6 max-w-6xl mx-auto">
          {tab === "overview" && (
            <div className="space-y-6">
              {statsError ? (
                <QueryError title="Failed to load stats" error={statsError.message} onRetry={() => refetchStats()} />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card title="Total Orders" value={String(stats?.totalOrders ?? 0)} icon={ShoppingCart} />
                  <Card title="Revenue" value={`UGX ${(stats?.revenue ?? 0).toLocaleString()}`} icon={CreditCard} />
                  <Card title="Sellers" value={String(stats?.totalSellers ?? 0)} icon={Store} />
                  <Card title="Products" value={String(stats?.totalProducts ?? 0)} icon={Package} />
                </div>
              )}

              <div className="bg-white rounded-xl border border-neutral-200 p-4">
                <h3 className="font-semibold text-sm mb-3">Quick Actions</h3>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setTab("orders")} className="px-3 py-1.5 bg-neutral-900 text-white rounded-lg text-sm font-medium">View Orders</button>
                  <button onClick={() => setTab("sellers")} className="px-3 py-1.5 bg-neutral-100 text-neutral-900 rounded-lg text-sm font-medium">Review Sellers</button>
                  <button onClick={() => setTab("listings")} className="px-3 py-1.5 bg-neutral-100 text-neutral-900 rounded-lg text-sm font-medium">Review Listings</button>
                </div>
              </div>
            </div>
          )}

          {tab === "sellers" && <Sellers adminKey={adminKey} />}
          {tab === "listings" && <Listings adminKey={adminKey} />}
          {tab === "orders" && <OrderErrorBoundary><Orders adminKey={adminKey} /></OrderErrorBoundary>}

          {["accounts", "payouts", "deliveries", "returns", "ads", "affiliates", "audit", "settings"].includes(tab) && (
            <div className="bg-white rounded-xl border border-neutral-200 p-12 text-center">
              <p className="text-4xl mb-3">🚧</p>
              <p className="text-neutral-500 font-medium">{tabs.find((t) => t.id === tab)?.label} coming soon.</p>
              <p className="text-sm text-neutral-400 mt-1">This section is under development.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
