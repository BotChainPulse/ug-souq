import { useState } from 'react'
import React from 'react'
import { useNavigate } from 'react-router'
import { trpc } from '../providers/trpc'
import {
  LayoutDashboard, Store, Package, ShoppingCart, Users, CreditCard,
  Truck, RotateCcw, Megaphone, Link2, Settings, FileText, LogOut,
  Search, CheckCircle, AlertTriangle, Check, X, DollarSign,
  TrendingUp, TrendingDown, Save, RefreshCw, Mail, MessageCircle
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
  suspended: "bg-orange-100 text-orange-700",
  terminated: "bg-gray-100 text-gray-700",
}

const ORDER_STATUSES = ["placed","confirmed","pending_delivery","on_the_way","delivered","cancelled"] as const

function StatusBadge({ status }: { status: string }) {
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[status] || STATUS_COLORS.placed}`}>{STATUS_LABEL[status] || status}</span>
}

function PaymentBadge({ status }: { status: string | null | undefined }) {
  const s = status || "unpaid"
  const cls = s === "paid" ? "bg-emerald-100 text-emerald-700" : s === "pending" || s === "pending_confirmation" ? "bg-amber-100 text-amber-700" : s === "refunded" ? "bg-sky-100 text-sky-700" : "bg-red-100 text-red-700"
  const text = s === "pending_confirmation" ? "Confirming" : s.replaceAll('_', ' ')
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{text}</span>
}

function Card({ title, value, icon: Icon, color = "neutral" }: { title: string; value: string; icon: any; color?: string }) {
  const colorMap: Record<string, string> = {
    neutral: "bg-neutral-100 text-neutral-600",
    green: "bg-emerald-100 text-emerald-600",
    blue: "bg-blue-100 text-blue-600",
    amber: "bg-amber-100 text-amber-600",
    red: "bg-red-100 text-red-600",
    purple: "bg-purple-100 text-purple-600",
  }
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-neutral-500 font-medium uppercase">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color] || colorMap.neutral}`}>
          <Icon size={20} />
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

function Loading() {
  return <div className="p-8 text-center text-neutral-500 flex items-center justify-center gap-2"><RefreshCw size={16} className="animate-spin" /> Loading...</div>
}

// ============================================
// SELLERS
// ============================================
function Sellers({ adminKey }: { adminKey: string }) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected" | "suspended" | "terminated">("all")
  const { data, isLoading, error, refetch } = trpc.admin.sellers.useQuery(
    { key: adminKey, search: search || undefined, status: statusFilter === "all" ? undefined : statusFilter },
    { enabled: !!adminKey }
  )
  const setSellerStatus = trpc.admin.setSellerStatus.useMutation({ onSuccess: () => refetch() })
  const list = (data as any[]) ?? []
  if (isLoading) return <Loading />
  if (error) return <QueryError title="Failed to load sellers" error={error.message} onRetry={() => refetch()} />
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by shop, owner, phone, district..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3 py-2 rounded-lg border border-neutral-200 text-sm bg-white">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="suspended">Suspended</option>
          <option value="terminated">Terminated</option>
        </select>
      </div>
      <div className="space-y-3">
        {list.length === 0 && <p className="text-neutral-500">No sellers found.</p>}
        {list.map((s: any) => {
          const sid = Number(s?.id ?? 0)
          const status = String(s?.status ?? "pending")
          return (
            <div key={sid || Math.random()} className="bg-white rounded-xl border border-neutral-200 p-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-bold text-sm">{s?.shopName ?? "Unknown"}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SELLER_STATUS_COLORS[status] || SELLER_STATUS_COLORS.pending}`}>{status}</span>
                {s?.verified && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium flex items-center gap-1"><CheckCircle size={12} /> Verified</span>}
              </div>
              <p className="text-sm text-neutral-600">{s?.ownerName ?? "-"} · {s?.phone ?? "-"} · {s?.district ?? "-"}</p>
              <p className="text-xs text-neutral-400 mt-1">{s?.totalListings ?? 0} listings · {s?.totalOrders ?? 0} orders · Joined {s?.createdAt ? new Date(s.createdAt).toLocaleDateString() : "-"}</p>
              {status === "pending" && (
                <div className="mt-3 flex gap-2">
                  <button onClick={() => { if (!sid) return; if (window.confirm(`Approve ${s?.shopName}?`)) setSellerStatus.mutate({ key: adminKey, id: sid, status: "approved" }) }} disabled={setSellerStatus.isLoading}
                    className="text-sm px-3 py-1.5 bg-emerald-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-1"><Check size={14} /> Approve</button>
                  <button onClick={() => { if (!sid) return; if (window.confirm(`Reject ${s?.shopName}?`)) setSellerStatus.mutate({ key: adminKey, id: sid, status: "rejected" }) }} disabled={setSellerStatus.isLoading}
                    className="text-sm px-3 py-1.5 bg-red-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-1"><X size={14} /> Reject</button>
                </div>
              )}
              {status === "approved" && (
                <div className="mt-3 flex gap-2">
                  <button onClick={() => { if (!sid) return; if (window.confirm(`Suspend ${s?.shopName}? They won't be able to list new items.`)) setSellerStatus.mutate({ key: adminKey, id: sid, status: "suspended" }) }} disabled={setSellerStatus.isLoading}
                    className="text-sm px-3 py-1.5 bg-amber-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-1"><AlertTriangle size={14} /> Suspend</button>
                  <button onClick={() => { if (!sid) return; if (window.confirm(`TERMINATE ${s?.shopName}? This is permanent!`)) setSellerStatus.mutate({ key: adminKey, id: sid, status: "terminated" }) }} disabled={setSellerStatus.isLoading}
                    className="text-sm px-3 py-1.5 bg-red-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-1"><X size={14} /> Terminate</button>
                </div>
              )}
              {(status === "suspended" || status === "terminated") && (
                <div className="mt-3 flex gap-2">
                  <button onClick={() => { if (!sid) return; if (window.confirm(`Reinstate ${s?.shopName}?`)) setSellerStatus.mutate({ key: adminKey, id: sid, status: "approved" }) }} disabled={setSellerStatus.isLoading}
                    className="text-sm px-3 py-1.5 bg-emerald-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-1"><Check size={14} /> Reinstate</button>
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
// LISTINGS
// ============================================
function Listings({ adminKey }: { adminKey: string }) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected" | "suspended" | "terminated">("all")
  const { data, isLoading, error, refetch } = trpc.admin.listings.useQuery(
    { key: adminKey, search: search || undefined, status: statusFilter === "all" ? undefined : statusFilter },
    { enabled: !!adminKey }
  )
  const setListingStatus = trpc.admin.setListingStatus.useMutation({ onSuccess: () => refetch() })
  const list = (data as any[]) ?? []
  if (isLoading) return <Loading />
  if (error) return <QueryError title="Failed to load listings" error={error.message} onRetry={() => refetch()} />
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by product name or seller..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3 py-2 rounded-lg border border-neutral-200 text-sm bg-white">
          <option value="all">All Status</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
        </select>
      </div>
      <div className="space-y-3">
        {list.length === 0 && <p className="text-neutral-500">No listings found.</p>}
        {list.map((l: any) => {
          const lid = Number(l?.id ?? 0)
          const status = String(l?.status ?? "pending")
          return (
            <div key={lid || Math.random()} className="bg-white rounded-xl border border-neutral-200 p-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-bold text-sm">{l?.name ?? "Unnamed"}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SELLER_STATUS_COLORS[status] || SELLER_STATUS_COLORS.pending}`}>{status}</span>
                {l?.sellerVerified && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium flex items-center gap-1"><CheckCircle size={12} /> Verified Seller</span>}
              </div>
              <p className="text-sm text-neutral-600">UGX {Number(l?.price ?? 0).toLocaleString()} · by {l?.sellerName ?? "-"}</p>
              {status === "pending" && (
                <div className="mt-3 flex gap-2">
                  <button onClick={() => { if (!lid) return; if (window.confirm(`Approve "${l?.name}"?`)) setListingStatus.mutate({ key: adminKey, id: lid, status: "approved" }) }} disabled={setListingStatus.isLoading}
                    className="text-sm px-3 py-1.5 bg-emerald-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-1"><Check size={14} /> Approve</button>
                  <button onClick={() => { if (!lid) return; if (window.confirm(`Reject "${l?.name}"?`)) setListingStatus.mutate({ key: adminKey, id: lid, status: "rejected" }) }} disabled={setListingStatus.isLoading}
                    className="text-sm px-3 py-1.5 bg-red-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-1"><X size={14} /> Reject</button>
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
// ORDERS
// ============================================
class OrderErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: string }> {
  constructor(props: { children: React.ReactNode }) { super(props); this.state = { hasError: false, error: "" } }
  static getDerivedStateFromError(error: any) { return { hasError: true, error: String(error?.message || error) } }
  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-700 font-medium"><AlertTriangle size={16} /><span>Orders failed to load</span></div>
          <p className="text-sm text-red-600 mt-1">{this.state.error}</p>
          <button onClick={() => this.setState({ hasError: false, error: "" })} className="mt-2 text-sm px-3 py-1.5 bg-red-600 text-white rounded-lg font-medium">Retry</button>
        </div>
      )
    }
    return this.props.children
  }
}

function Orders({ adminKey }: { adminKey: string }) {
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [search, setSearch] = useState("")
  const { data, isLoading, refetch } = trpc.admin.orders.useQuery(
    { key: adminKey, status: statusFilter === "all" ? undefined : statusFilter, search: search || undefined },
    { enabled: !!adminKey, retry: false }
  )
  const setStatus = trpc.admin.setOrderStatus.useMutation({ onSuccess: () => refetch() })
  const list = (data as any)?.orders ?? (data as any[]) ?? []
  if (isLoading) return <Loading />
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search orders..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-neutral-200 text-sm bg-white">
          <option value="all">All Status</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </div>
      <div className="space-y-3">
        {list.length === 0 && <p className="text-neutral-500">No orders found.</p>}
        {list.map((o: any) => {
          if (!o) return null
          const oid = Number(o?.id ?? 0)
          const status = String(o?.status ?? "placed")
          const canCancel = status !== "cancelled" && status !== "delivered"
          return (
            <div key={oid || Math.random()} className="bg-white rounded-xl border border-neutral-200 p-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-mono font-bold text-sm">{o?.code ?? `#${oid}`}</span>
                <StatusBadge status={status} />
                <PaymentBadge status={o?.paymentStatus} />
              </div>
              <p className="font-extrabold text-lg mb-1">UGX {Number(o?.total ?? 0).toLocaleString()}</p>
              <p className="text-sm text-neutral-600">{o?.customerName ?? "-"} · {o?.phone ?? "-"} · {String(o?.address ?? "").slice(0,60)} · {o?.createdAt ? new Date(o.createdAt).toLocaleString("en-UG") : "-"}</p>
              {o?.paymentRef && <p className="mt-1 break-all text-xs text-neutral-500">Payment reference: {o.paymentRef}</p>}
              {canCancel && (
                <div className="mt-3">
                  <button onClick={() => { if (!oid) return; if (window.confirm('Cancel this order?')) setStatus.mutate({ key: adminKey, id: oid, status: 'cancelled' }) }} disabled={setStatus.isLoading}
                    className="text-sm px-3 py-1.5 bg-red-600 text-white rounded-lg disabled:opacity-50">Cancel order</button>
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
// ACCOUNTS
// ============================================
function Accounts({ adminKey }: { adminKey: string }) {
  const { data: accountsData, isLoading, error, refetch } = trpc.admin.accounts.useQuery({ key: adminKey }, { enabled: !!adminKey })
  const { data: commissionData, isLoading: cLoading, error: cError } = trpc.admin.commissionBreakdown.useQuery({ key: adminKey }, { enabled: !!adminKey })
  if (isLoading || cLoading) return <Loading />
  if (error) return <QueryError title="Failed to load accounts" error={error.message} onRetry={() => refetch()} />
  const a = (accountsData as any) ?? {}
  const c = (commissionData as any) ?? {}
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Total Revenue" value={`UGX ${(a?.totalRevenue ?? 0).toLocaleString()}`} icon={DollarSign} color="green" />
        <Card title="Total Commission" value={`UGX ${(a?.totalCommission ?? 0).toLocaleString()}`} icon={TrendingUp} color="blue" />
        <Card title="Net Payout" value={`UGX ${(a?.netPayout ?? 0).toLocaleString()}`} icon={CreditCard} color="purple" />
        <Card title="Pending Payouts" value={`UGX ${(a?.pendingPayouts ?? 0).toLocaleString()}`} icon={TrendingDown} color="amber" />
      </div>
      <div className="bg-white rounded-xl border border-neutral-200 p-4">
        <h3 className="font-semibold text-sm mb-3">Commission Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-neutral-200"><th className="text-left py-2 px-3 text-neutral-500 font-medium">Seller</th><th className="text-right py-2 px-3 text-neutral-500 font-medium">Sales</th><th className="text-right py-2 px-3 text-neutral-500 font-medium">Commission</th><th className="text-right py-2 px-3 text-neutral-500 font-medium">Net</th></tr></thead>
            <tbody>
              {(c?.breakdown ?? []).length === 0 && <tr><td colSpan={4} className="py-4 text-center text-neutral-400">No commission data yet.</td></tr>}
              {(c?.breakdown ?? []).map((item: any, i: number) => (
                <tr key={i} className="border-b border-neutral-100">
                  <td className="py-2 px-3">{item?.sellerName ?? "-"}</td>
                  <td className="py-2 px-3 text-right">UGX {(item?.totalSales ?? 0).toLocaleString()}</td>
                  <td className="py-2 px-3 text-right text-emerald-600">UGX {(item?.commission ?? 0).toLocaleString()}</td>
                  <td className="py-2 px-3 text-right font-medium">UGX {(item?.net ?? 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ============================================
// PAYOUTS
// ============================================
function Payouts({ adminKey }: { adminKey: string }) {
  const [subTab, setSubTab] = useState<"pending" | "history">("pending")
  const { data: pData, isLoading: pLoading, error: pError, refetch: pRefetch } = trpc.admin.pendingPayouts.useQuery({ key: adminKey }, { enabled: !!adminKey })
  const { data: hData, isLoading: hLoading, error: hError, refetch: hRefetch } = trpc.admin.payoutHistory.useQuery({ key: adminKey, limit: 100 }, { enabled: !!adminKey })
  const processPayout = trpc.admin.processPayout.useMutation({ onSuccess: () => { pRefetch(); hRefetch(); } })
  if (pLoading || hLoading) return <Loading />
  if (subTab === "pending" && pError) return <QueryError title="Failed to load pending payouts" error={pError.message} onRetry={() => pRefetch()} />
  if (subTab === "history" && hError) return <QueryError title="Failed to load history" error={hError.message} onRetry={() => hRefetch()} />
  const pending = (pData as any)?.pending ?? []
  const history = (hData as any)?.payouts ?? []
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setSubTab("pending")} className={`px-4 py-2 rounded-lg text-sm font-medium ${subTab === "pending" ? "bg-orange-500 text-white" : "bg-neutral-100 text-neutral-700"}`}>Pending ({pending.length})</button>
        <button onClick={() => setSubTab("history")} className={`px-4 py-2 rounded-lg text-sm font-medium ${subTab === "history" ? "bg-orange-500 text-white" : "bg-neutral-100 text-neutral-700"}`}>History ({history.length})</button>
      </div>
      <div className="space-y-3">
        {subTab === "pending" && pending.length === 0 && <p className="text-neutral-500">No pending payouts.</p>}
        {subTab === "pending" && pending.map((p: any, i: number) => (
          <div key={i} className="bg-white rounded-xl border border-neutral-200 p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-sm">{p?.sellerName ?? "Unknown"}</p>
                <p className="text-sm text-neutral-600">UGX {(p?.amount ?? 0).toLocaleString()} · {p?.phone ?? "-"}</p>
                <p className="text-xs text-neutral-400 mt-1">{p?.ordersCount ?? 0} orders</p>
              </div>
              <button onClick={() => { if (window.confirm(`Process payout of UGX ${(p?.amount ?? 0).toLocaleString()}?`)) processPayout.mutate({ key: adminKey, sellerId: Number(p?.sellerId), amount: Number(p?.amount), payoutNumber: `PAY-${Date.now()}`, sellerName: String(p?.sellerName) }) }} disabled={processPayout.isLoading}
                className="text-sm px-3 py-1.5 bg-emerald-600 text-white rounded-lg disabled:opacity-50">Pay Now</button>
            </div>
          </div>
        ))}
        {subTab === "history" && history.length === 0 && <p className="text-neutral-500">No payout history.</p>}
        {subTab === "history" && history.map((h: any, i: number) => (
          <div key={i} className="bg-white rounded-xl border border-neutral-200 p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-sm">{h?.sellerName ?? "Unknown"}</p>
                <p className="text-sm text-neutral-600">UGX {(h?.amount ?? 0).toLocaleString()}</p>
                <p className="text-xs text-neutral-400 mt-1">{h?.payoutNumber ?? "-"} · {h?.createdAt ? new Date(h.createdAt).toLocaleString() : "-"}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${h?.status === "completed" ? "bg-emerald-100 text-emerald-700" : h?.status === "failed" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{h?.status ?? "pending"}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================
// DELIVERIES
// ============================================
function Deliveries({ adminKey }: { adminKey: string }) {
  const [search, setSearch] = useState("")
  const { data, isLoading, error, refetch } = trpc.admin.deliveryPartners.useQuery({ key: adminKey, search: search || undefined }, { enabled: !!adminKey })
  const setStatus = trpc.admin.setDeliveryPartnerStatus.useMutation({ onSuccess: () => refetch() })
  if (isLoading) return <Loading />
  if (error) return <QueryError title="Failed to load delivery partners" error={error.message} onRetry={() => refetch()} />
  const list = (data as any[]) ?? []
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search delivery partners..."
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
      </div>
      <div className="space-y-3">
        {list.length === 0 && <p className="text-neutral-500">No delivery partners found.</p>}
        {list.map((p: any, i: number) => (
          <div key={i} className="bg-white rounded-xl border border-neutral-200 p-4">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-bold text-sm">{p?.name ?? "Unknown"}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SELLER_STATUS_COLORS[p?.status] || SELLER_STATUS_COLORS.pending}`}>{p?.status ?? "pending"}</span>
            </div>
            <p className="text-sm text-neutral-600">{p?.phone ?? "-"} · {p?.vehicleType ?? "-"} · {p?.zone ?? "-"}</p>
            {p?.status === "pending" && (
              <div className="mt-3 flex gap-2">
                <button onClick={() => { if (window.confirm(`Approve ${p?.name}?`)) setStatus.mutate({ key: adminKey, id: Number(p?.id), status: "approved" }) }} disabled={setStatus.isLoading}
                  className="text-sm px-3 py-1.5 bg-emerald-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-1"><Check size={14} /> Approve</button>
                <button onClick={() => { if (window.confirm(`Reject ${p?.name}?`)) setStatus.mutate({ key: adminKey, id: Number(p?.id), status: "rejected" }) }} disabled={setStatus.isLoading}
                  className="text-sm px-3 py-1.5 bg-red-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-1"><X size={14} /> Reject</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================
// RETURNS
// ============================================
function Returns({ adminKey }: { adminKey: string }) {
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const { data, isLoading, error, refetch } = trpc.admin.returns.useQuery({ key: adminKey, status: statusFilter === "all" ? undefined : statusFilter }, { enabled: !!adminKey })
  const updateReturn = trpc.admin.updateReturnStatus.useMutation({ onSuccess: () => refetch() })
  if (isLoading) return <Loading />
  if (error) return <QueryError title="Failed to load returns" error={error.message} onRetry={() => refetch()} />
  const list = (data as any[]) ?? []
  const rColors: Record<string, string> = { requested: "bg-amber-100 text-amber-700", approved: "bg-blue-100 text-blue-700", rejected: "bg-red-100 text-red-700", picked_up: "bg-sky-100 text-sky-700", refunded: "bg-emerald-100 text-emerald-700", closed: "bg-neutral-100 text-neutral-700" }
  return (
    <div className="space-y-4">
      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-neutral-200 text-sm bg-white w-full sm:w-auto">
        <option value="all">All Status</option>
        {["requested","approved","rejected","picked_up","refunded","closed"].map(s => <option key={s} value={s}>{s.replace("_", " ").toUpperCase()}</option>)}
      </select>
      <div className="space-y-3">
        {list.length === 0 && <p className="text-neutral-500">No returns found.</p>}
        {list.map((r: any, i: number) => (
          <div key={i} className="bg-white rounded-xl border border-neutral-200 p-4">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-bold text-sm">Order #{r?.orderId ?? r?.orderCode ?? "-"}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rColors[r?.status] || rColors.requested}`}>{r?.status ?? "requested"}</span>
            </div>
            <p className="text-sm text-neutral-600">{r?.customerName ?? "-"} · {r?.phone ?? "-"}</p>
            <p className="text-sm text-neutral-600 mt-1"><strong>Reason:</strong> {r?.reason ?? "-"}</p>
            <p className="text-sm text-neutral-600"><strong>Refund:</strong> UGX {(r?.refundAmount ?? 0).toLocaleString()}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {r?.status === "requested" && (
                <><button onClick={() => { if (window.confirm("Approve return?")) updateReturn.mutate({ key: adminKey, id: Number(r?.id), status: "approved" }) }} disabled={updateReturn.isLoading}
                  className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg disabled:opacity-50">Approve</button>
                  <button onClick={() => { if (window.confirm("Reject return?")) updateReturn.mutate({ key: adminKey, id: Number(r?.id), status: "rejected" }) }} disabled={updateReturn.isLoading}
                    className="text-sm px-3 py-1.5 bg-red-600 text-white rounded-lg disabled:opacity-50">Reject</button></>
              )}
              {r?.status === "approved" && (
                <button onClick={() => { if (window.confirm("Mark picked up?")) updateReturn.mutate({ key: adminKey, id: Number(r?.id), status: "picked_up" }) }} disabled={updateReturn.isLoading}
                  className="text-sm px-3 py-1.5 bg-sky-600 text-white rounded-lg disabled:opacity-50">Mark Picked Up</button>
              )}
              {r?.status === "picked_up" && (
                <button onClick={() => { if (window.confirm("Process refund?")) updateReturn.mutate({ key: adminKey, id: Number(r?.id), status: "refunded" }) }} disabled={updateReturn.isLoading}
                  className="text-sm px-3 py-1.5 bg-emerald-600 text-white rounded-lg disabled:opacity-50">Process Refund</button>
              )}
              {r?.status === "refunded" && (
                <button onClick={() => { if (window.confirm("Close return?")) updateReturn.mutate({ key: adminKey, id: Number(r?.id), status: "closed" }) }} disabled={updateReturn.isLoading}
                  className="text-sm px-3 py-1.5 bg-neutral-600 text-white rounded-lg disabled:opacity-50">Close</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================
// SELLER ADS
// ============================================
function SellerAds({ adminKey }: { adminKey: string }) {
  const { data, isLoading, error, refetch } = trpc.admin.adBookings.useQuery({ key: adminKey }, { enabled: !!adminKey })
  const setAdStatus = trpc.admin.setAdBookingStatus.useMutation({ onSuccess: () => refetch() })
  if (isLoading) return <Loading />
  if (error) return <QueryError title="Failed to load ad bookings" error={error.message} onRetry={() => refetch()} />
  const ads = (data as any)?.rows ?? []
  const adColors: Record<string, string> = { booked: "bg-amber-100 text-amber-700", paid: "bg-blue-100 text-blue-700", active: "bg-emerald-100 text-emerald-700", completed: "bg-neutral-100 text-neutral-700", cancelled: "bg-red-100 text-red-700" }
  return (
    <div className="space-y-3">
      {ads.length === 0 && <p className="text-neutral-500">No ad bookings found.</p>}
      {ads.map((a: any, i: number) => (
        <div key={i} className="bg-white rounded-xl border border-neutral-200 p-4">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="font-bold text-sm">{a?.sellerName ?? "Unknown"}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${adColors[a?.status] || adColors.booked}`}>{a?.status ?? "booked"}</span>
          </div>
          <p className="text-sm text-neutral-600">{a?.adType ?? "-"} · UGX {(a?.amount ?? 0).toLocaleString()}</p>
          <p className="text-xs text-neutral-400 mt-1">{a?.startDate ? new Date(a.startDate).toLocaleDateString() : "-"} → {a?.endDate ? new Date(a.endDate).toLocaleDateString() : "-"}</p>
          {a?.status === "booked" && (
            <div className="mt-3 flex gap-2">
              <button onClick={() => { if (window.confirm("Mark as paid?")) setAdStatus.mutate({ key: adminKey, id: Number(a?.id), status: "paid" }) }} disabled={setAdStatus.isLoading}
                className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg disabled:opacity-50">Mark Paid</button>
              <button onClick={() => { if (window.confirm("Cancel ad?")) setAdStatus.mutate({ key: adminKey, id: Number(a?.id), status: "cancelled" }) }} disabled={setAdStatus.isLoading}
                className="text-sm px-3 py-1.5 bg-red-600 text-white rounded-lg disabled:opacity-50">Cancel</button>
            </div>
          )}
          {a?.status === "paid" && (
            <button onClick={() => { if (window.confirm("Activate ad?")) setAdStatus.mutate({ key: adminKey, id: Number(a?.id), status: "active" }) }} disabled={setAdStatus.isLoading}
              className="mt-3 text-sm px-3 py-1.5 bg-emerald-600 text-white rounded-lg disabled:opacity-50">Activate</button>
          )}
        </div>
      ))}
    </div>
  )
}

// ============================================
// AFFILIATES
// ============================================
function Affiliates({ adminKey }: { adminKey: string }) {
  const { data, isLoading, error, refetch } = trpc.admin.affiliates.useQuery({ key: adminKey }, { enabled: !!adminKey })
  if (isLoading) return <Loading />
  if (error) return <QueryError title="Failed to load affiliates" error={error.message} onRetry={() => refetch()} />
  const list = (data as any[]) ?? []
  return (
    <div className="space-y-3">
      {list.length === 0 && <p className="text-neutral-500">No affiliates found.</p>}
      {list.map((a: any, i: number) => (
        <div key={i} className="bg-white rounded-xl border border-neutral-200 p-4">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="font-bold text-sm">{a?.name ?? a?.code ?? "Unknown"}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a?.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-700"}`}>{a?.status ?? "inactive"}</span>
          </div>
          <p className="text-sm text-neutral-600">{a?.email ?? "-"} · {a?.phone ?? "-"}</p>
          <p className="text-xs text-neutral-400 mt-1">Code: {a?.referralCode ?? "-"} · Clicks: {a?.clicks ?? 0} · Conversions: {a?.conversions ?? 0}</p>
          <p className="text-sm text-neutral-600 mt-1">Earnings: <span className="font-medium text-emerald-600">UGX {(a?.earnings ?? 0).toLocaleString()}</span></p>
        </div>
      ))}
    </div>
  )
}

// ============================================
// MARKETING CONSENT
// ============================================
function MarketingSubscribers({ adminKey }: { adminKey: string }) {
  const { data, isLoading, error, refetch } = trpc.admin.marketingSubscribers.useQuery({ key: adminKey }, { enabled: !!adminKey })
  if (isLoading) return <Loading />
  if (error) return <QueryError title="Failed to load marketing subscribers" error={error.message} onRetry={() => refetch()} />
  const rows = data?.rows ?? []
  const totals = data?.totals ?? { subscribers: 0, email: 0, whatsapp: 0 }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card title="Active subscribers" value={String(totals.subscribers)} icon={Users} color="green" />
        <Card title="Email opt-ins" value={String(totals.email)} icon={Mail} color="blue" />
        <Card title="WhatsApp opt-ins" value={String(totals.whatsapp)} icon={MessageCircle} color="green" />
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Sending is not connected yet. These are consented contacts ready for Brevo and Africa’s Talking after provider credentials are added.
      </div>
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 p-4"><h3 className="font-semibold">Subscriber consent register</h3><p className="mt-1 text-xs text-neutral-500">Only active channel opt-ins should receive promotional campaigns.</p></div>
        {rows.length === 0 ? <p className="p-6 text-sm text-neutral-500">No marketing subscribers yet.</p> : (
          <div className="divide-y divide-neutral-100">
            {rows.map((row) => (
              <div key={row.id} className="grid gap-2 p-4 text-sm sm:grid-cols-[1fr_1fr_auto] sm:items-center">
                <div className="min-w-0"><p className="truncate font-semibold">{row.name || 'UGSouq shopper'}</p><p className="truncate text-xs text-neutral-500">{row.email || 'No email'} · {row.phone || 'No WhatsApp number'}</p></div>
                <div className="flex flex-wrap gap-2"><span className={`rounded-full px-2 py-1 text-[11px] font-bold ${row.emailOptIn ? 'bg-blue-50 text-blue-700' : 'bg-neutral-100 text-neutral-400'}`}>Email {row.emailOptIn ? 'active' : 'off'}</span><span className={`rounded-full px-2 py-1 text-[11px] font-bold ${row.whatsappOptIn ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-400'}`}>WhatsApp {row.whatsappOptIn ? 'active' : 'off'}</span></div>
                <div className="text-xs text-neutral-400 sm:text-right"><p>{row.consentSource}</p><p>{new Date(row.consentedAt).toLocaleDateString()}</p></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// AUDIT LOG
// ============================================
function AuditLog({ adminKey }: { adminKey: string }) {
  const { data, isLoading, error, refetch } = trpc.admin.auditLog.useQuery({ key: adminKey }, { enabled: !!adminKey })
  if (isLoading) return <Loading />
  if (error) return <QueryError title="Failed to load audit log" error={error.message} onRetry={() => refetch()} />
  const logs = (data as any[]) ?? []
  const actionColors: Record<string, string> = {
    order_cancelled: "bg-red-100 text-red-700", order_status_changed: "bg-blue-100 text-blue-700",
    seller_approved: "bg-emerald-100 text-emerald-700", seller_rejected: "bg-red-100 text-red-700",
    listing_approved: "bg-emerald-100 text-emerald-700", listing_rejected: "bg-red-100 text-red-700",
    payout_processed: "bg-purple-100 text-purple-700", settings_changed: "bg-amber-100 text-amber-700",
  }
  return (
    <div className="space-y-3">
      {logs.length === 0 && <p className="text-neutral-500">No audit entries found.</p>}
      {logs.map((log: any, i: number) => (
        <div key={i} className="bg-white rounded-xl border border-neutral-200 p-4">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${actionColors[log?.action] || "bg-neutral-100 text-neutral-700"}`}>{log?.action ?? "unknown"}</span>
            <span className="text-xs text-neutral-400">{log?.createdAt ? new Date(log.createdAt).toLocaleString() : "-"}</span>
          </div>
          <p className="text-sm text-neutral-700">{log?.description ?? "-"}</p>
          <p className="text-xs text-neutral-400 mt-1">By: {log?.adminName ?? log?.adminKey?.slice(0, 8) ?? "system"}</p>
        </div>
      ))}
    </div>
  )
}

// ============================================
// SETTINGS
// ============================================
function AdminSettings({ adminKey }: { adminKey: string }) {
  const { data: settingsData, isLoading, error, refetch } = trpc.admin.settings.useQuery({ key: adminKey }, { enabled: !!adminKey })
  const updateSettings = trpc.admin.updateSettings.useMutation({ onSuccess: () => refetch() })
  const [form, setForm] = useState<Record<string, any>>({})
  React.useEffect(() => { if (settingsData) setForm(settingsData as Record<string, any>) }, [settingsData])
  if (isLoading) return <Loading />
  if (error) return <QueryError title="Failed to load settings" error={error.message} onRetry={() => refetch()} />
  const handleChange = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }))
  const handleSave = () => updateSettings.mutate({ key: adminKey, ...form })
  const fields = [
    { key: "platformName", label: "Platform Name", type: "text" },
    { key: "platformFeePercent", label: "Platform Commission (%)", type: "number" },
    { key: "deliveryFeeBase", label: "Base Delivery Fee (UGX)", type: "number" },
    { key: "freeDeliveryThreshold", label: "Free Delivery Threshold (UGX)", type: "number" },
    { key: "minOrderAmount", label: "Minimum Order Amount (UGX)", type: "number" },
    { key: "supportPhone", label: "Support Phone", type: "text" },
    { key: "supportEmail", label: "Support Email", type: "text" },
  ]
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-4">
        {fields.map(f => (
          <div key={f.key}>
            <label className="block text-sm font-medium text-neutral-700 mb-1">{f.label}</label>
            <input type={f.type === "number" ? "number" : "text"} value={form[f.key] ?? ""}
              onChange={(e) => handleChange(f.key, f.type === "number" ? Number(e.target.value) : e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
        ))}
        <button onClick={handleSave} disabled={updateSettings.isLoading}
          className="w-full py-2.5 bg-orange-500 text-white rounded-lg font-medium text-sm hover:bg-orange-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
          <Save size={16} /> {updateSettings.isLoading ? "Saving..." : "Save Settings"}
        </button>
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
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center"><Store size={16} className="text-white" /></div>
            <h1 className="text-lg font-bold">UG Souq Admin</h1>
          </div>
          <p className="text-sm text-neutral-600 mb-4">Enter your admin key to continue.</p>
          <input type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()}
            placeholder="Admin key" className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 mb-3" />
          <button onClick={login} className="w-full py-2 bg-orange-500 text-white rounded-lg font-medium text-sm hover:bg-orange-600 transition">Login</button>
          <button onClick={() => navigate("/")} className="w-full mt-2 py-2 text-neutral-600 text-sm hover:text-neutral-900">← Back to site</button>
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
    { id: "marketing", label: "Marketing", icon: Mail },
    { id: "affiliates", label: "Affiliates", icon: Link2 },
    { id: "audit", label: "Audit Log", icon: FileText },
    { id: "settings", label: "Settings", icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-neutral-200 transform transition-transform duration-200 lg:transform-none ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center"><Store size={16} className="text-white" /></div>
            <span className="font-bold text-sm">UG Souq Admin</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 text-neutral-500"><X size={18} /></button>
        </div>
        <nav className="px-3 py-2 space-y-1">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => { setTab(t.id); setSidebarOpen(false) }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${tab === t.id ? "bg-neutral-100 text-neutral-900" : "text-neutral-600 hover:bg-neutral-50"}`}>
              <t.icon size={18} />{t.label}
            </button>
          ))}
          <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition mt-4">
            <LogOut size={18} />Logout
          </button>
        </nav>
      </aside>

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
                  <Card title="Total Orders" value={String((stats as any)?.totalOrders ?? 0)} icon={ShoppingCart} />
                  <Card title="Revenue" value={`UGX ${((stats as any)?.revenue ?? 0).toLocaleString()}`} icon={CreditCard} color="green" />
                  <Card title="Sellers" value={String((stats as any)?.totalSellers ?? 0)} icon={Store} color="blue" />
                  <Card title="Products" value={String((stats as any)?.totalProducts ?? 0)} icon={Package} color="purple" />
                </div>
              )}
              <div className="bg-white rounded-xl border border-neutral-200 p-4">
                <h3 className="font-semibold text-sm mb-3">Quick Actions</h3>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setTab("orders")} className="px-3 py-1.5 bg-neutral-900 text-white rounded-lg text-sm font-medium">View Orders</button>
                  <button onClick={() => setTab("sellers")} className="px-3 py-1.5 bg-neutral-100 text-neutral-900 rounded-lg text-sm font-medium">Review Sellers</button>
                  <button onClick={() => setTab("listings")} className="px-3 py-1.5 bg-neutral-100 text-neutral-900 rounded-lg text-sm font-medium">Review Listings</button>
                  <button onClick={() => setTab("payouts")} className="px-3 py-1.5 bg-neutral-100 text-neutral-900 rounded-lg text-sm font-medium">Process Payouts</button>
                </div>
              </div>
            </div>
          )}
          {tab === "sellers" && <Sellers adminKey={adminKey} />}
          {tab === "listings" && <Listings adminKey={adminKey} />}
          {tab === "orders" && <OrderErrorBoundary><Orders adminKey={adminKey} /></OrderErrorBoundary>}
          {tab === "accounts" && <Accounts adminKey={adminKey} />}
          {tab === "payouts" && <Payouts adminKey={adminKey} />}
          {tab === "deliveries" && <Deliveries adminKey={adminKey} />}
          {tab === "returns" && <Returns adminKey={adminKey} />}
          {tab === "ads" && <SellerAds adminKey={adminKey} />}
          {tab === "marketing" && <MarketingSubscribers adminKey={adminKey} />}
          {tab === "affiliates" && <Affiliates adminKey={adminKey} />}
          {tab === "audit" && <AuditLog adminKey={adminKey} />}
          {tab === "settings" && <AdminSettings adminKey={adminKey} />}
        </div>
      </main>
    </div>
  )
}
