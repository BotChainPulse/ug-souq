import { Bell, CheckCircle2, Clock3, CreditCard, Crown, FileWarning, TrendingUp } from 'lucide-react'
import type { ReactNode } from 'react'
import { trpc } from '../../providers/trpc'
import { fmt } from '../../lib/cart'

function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">{children}</div>
}

export function PaymentsPanel({ adminKey }: { adminKey: string }) {
  const query = trpc.admin.orders.useQuery({ key: adminKey, limit: 200 })
  const orders = query.data ?? []
  const transactions = orders.flatMap((order: any) => (order.payments ?? []).map((payment: any) => ({ ...payment, order })))
  const paid = orders.filter((order: any) => order.paymentStatus === 'paid')
  const pending = orders.filter((order: any) => order.paymentStatus === 'pending_confirmation')

  if (query.isLoading) return <Empty>Loading payment records…</Empty>
  if (query.error) return <Empty>Payment records could not load: {query.error.message}</Empty>

  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border bg-white p-4"><CreditCard className="text-emerald-700" size={18} /><p className="mt-2 text-2xl font-black">{paid.length}</p><p className="text-xs text-neutral-500">Paid orders</p></div>
      <div className="rounded-xl border bg-white p-4"><Clock3 className="text-amber-600" size={18} /><p className="mt-2 text-2xl font-black">{pending.length}</p><p className="text-xs text-neutral-500">Awaiting confirmation</p></div>
      <div className="rounded-xl border bg-white p-4"><TrendingUp className="text-sky-700" size={18} /><p className="mt-2 text-2xl font-black">{fmt(paid.reduce((sum: number, order: any) => sum + Number(order.total || 0), 0))}</p><p className="text-xs text-neutral-500">Confirmed order value</p></div>
    </div>
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <h2 className="font-bold">Provider transactions</h2>
      <p className="mt-1 text-xs text-neutral-500">Server-verified gateway attempts. Manual Cash/MoMo orders remain visible under Orders.</p>
    </div>
    {transactions.length === 0 ? <Empty>No provider transaction records yet.</Empty> : <div className="space-y-3">{transactions.map((payment: any) => <article key={payment.id} className="rounded-xl border border-neutral-200 bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-mono text-sm font-bold">{payment.merchantReference}</p><span className={`rounded-full px-2 py-1 text-xs font-bold ${payment.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : payment.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{payment.status}</span></div><p className="mt-2 text-sm">Order {payment.order.code} · {fmt(payment.amount)}</p><p className="mt-1 text-xs text-neutral-500">{payment.provider} · {payment.paymentMethod || 'method pending'}{payment.confirmationCode ? ` · ${payment.confirmationCode}` : ''}</p></article>)}</div>}
  </div>
}

export function PlusMembersPanel({ adminKey }: { adminKey: string }) {
  const query = trpc.admin.plusMembers.useQuery({ key: adminKey })
  const members = query.data ?? []
  if (query.isLoading) return <Empty>Loading Plus memberships…</Empty>
  if (query.error) return <Empty>Plus memberships could not load: {query.error.message}</Empty>
  return <div className="space-y-4">
    <div className="rounded-xl border border-neutral-200 bg-white p-4"><h2 className="flex items-center gap-2 font-bold"><Crown size={18} className="text-amber-600" /> UG Souq Plus memberships</h2><p className="mt-1 text-xs text-neutral-500">Payment and expiry records. Membership activation remains provider-verified.</p></div>
    {members.length === 0 ? <Empty>No Plus memberships yet.</Empty> : members.map((member: any) => <article key={member.id} className="rounded-xl border border-neutral-200 bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold">{member.customer?.name || 'Customer'}</p><p className="text-xs text-neutral-500">{member.customer?.phone || '-'}</p></div><span className={`rounded-full px-2 py-1 text-xs font-bold ${member.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{member.status}</span></div><p className="mt-2 text-sm">{member.plan} · expires {member.expiresAt ? new Date(member.expiresAt).toLocaleDateString('en-UG') : 'not activated'}</p>{member.latestPayment && <p className="mt-1 text-xs text-neutral-500">Latest payment: {member.latestPayment.status} · {fmt(member.latestPayment.amount)}</p>}</article>)}
  </div>
}

export function NotificationsPanel({ adminKey }: { adminKey: string }) {
  const utils = trpc.useUtils()
  const query = trpc.admin.notifications.useQuery({ key: adminKey, unreadOnly: false })
  const markRead = trpc.admin.markNotificationRead.useMutation({ onSuccess: () => utils.admin.notifications.invalidate() })
  const markAll = trpc.admin.markAllNotificationsRead.useMutation({ onSuccess: () => utils.admin.notifications.invalidate() })
  const rows = query.data ?? []
  return <div className="space-y-4">
    <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4"><div><h2 className="flex items-center gap-2 font-bold"><Bell size={18} /> Operational notifications</h2><p className="mt-1 text-xs text-neutral-500">Internal order, seller, delivery and payout events.</p></div><button onClick={() => markAll.mutate({ key: adminKey })} disabled={markAll.isPending || rows.every((row: any) => row.isRead)} className="rounded-lg bg-neutral-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">Mark all read</button></div>
    {query.isLoading ? <Empty>Loading notifications…</Empty> : rows.length === 0 ? <Empty>No operational notifications.</Empty> : rows.map((row: any) => <button key={row.id} onClick={() => !row.isRead && markRead.mutate({ key: adminKey, id: Number(row.id) })} className={`w-full rounded-xl border p-4 text-left ${row.isRead ? 'border-neutral-200 bg-white' : 'border-emerald-200 bg-emerald-50'}`}><div className="flex justify-between gap-3"><div><p className="font-bold">{row.title}</p><p className="mt-1 text-sm text-neutral-600">{row.message}</p></div>{row.isRead ? <CheckCircle2 size={18} className="text-neutral-300" /> : <span className="h-2 w-2 rounded-full bg-emerald-600" />}</div><p className="mt-2 text-xs text-neutral-400">{new Date(row.createdAt).toLocaleString('en-UG')}</p></button>)}
  </div>
}

export function ReportsPanel({ adminKey }: { adminKey: string }) {
  const query = trpc.admin.orderAnalytics.useQuery({ key: adminKey, days: 30 })
  const report = query.data
  if (query.isLoading) return <Empty>Building the 30-day report…</Empty>
  if (query.error || !report) return <Empty>Report could not load{query.error ? `: ${query.error.message}` : '.'}</Empty>
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border bg-white p-4"><p className="text-xs text-neutral-500">Orders · 30 days</p><p className="mt-1 text-2xl font-black">{report.totalOrders}</p></div><div className="rounded-xl border bg-white p-4"><p className="text-xs text-neutral-500">Order value</p><p className="mt-1 text-2xl font-black">{fmt(report.totalRevenue)}</p></div><div className="rounded-xl border bg-white p-4"><p className="text-xs text-neutral-500">Commission booked</p><p className="mt-1 text-2xl font-black">{fmt(report.totalCommission)}</p></div></div>
    <div className="rounded-xl border border-neutral-200 bg-white p-4"><h2 className="font-bold">Order status</h2><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{report.statusBreakdown.map((item: any) => <div key={item.status} className="rounded-lg bg-neutral-50 p-3"><p className="text-xs capitalize text-neutral-500">{String(item.status).replaceAll('_', ' ')}</p><p className="mt-1 font-black">{item.count}</p><p className="text-xs text-neutral-500">{fmt(item.revenue)}</p></div>)}</div></div>
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><FileWarning size={18} className="mb-2" />Revenue here is operational order value. It is not a bank statement and should be reconciled against verified provider transactions and payouts.</div>
  </div>
}
