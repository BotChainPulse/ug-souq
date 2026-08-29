import { useState } from 'react'
import { useNavigate } from 'react-router'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clipboard,
  CreditCard,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Users,
} from 'lucide-react'
import { trpc } from '../providers/trpc'

const ORDER_LABELS: Record<string, string> = {
  placed: 'Placed',
  confirmed: 'Confirmed',
  pending_delivery: 'Preparing',
  on_the_way: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

const NEXT_STATUS: Record<string, string | undefined> = {
  placed: 'confirmed',
  confirmed: 'pending_delivery',
  pending_delivery: 'on_the_way',
  on_the_way: 'delivered',
}

function money(value: unknown) {
  return `UGX ${Number(value ?? 0).toLocaleString('en-UG')}`
}

function customerMessage(order: any) {
  const code = order?.code ?? 'your order'
  switch (order?.status) {
    case 'confirmed':
      return `UG Souq: Order ${code} is confirmed and is being prepared. We will update you when it leaves for delivery.`
    case 'pending_delivery':
      return `UG Souq: Order ${code} is ready for delivery. We will update you once a rider is on the way.`
    case 'on_the_way':
      return `UG Souq: Order ${code} is out for delivery. Keep your phone available for the rider.`
    case 'delivered':
      return `UG Souq: Order ${code} has been delivered. Thank you for shopping with UG Souq.`
    case 'cancelled':
      return `UG Souq: Order ${code} has been cancelled. Contact support if you need help.`
    default:
      return `UG Souq: We received order ${code}. We will confirm it shortly.`
  }
}

export default function AdminLaunch() {
  const navigate = useNavigate()
  const [adminKey, setAdminKey] = useState(() => localStorage.getItem('ug_admin_key') || '')
  const [keyInput, setKeyInput] = useState('')
  const [loginError, setLoginError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [copied, setCopied] = useState<string | null>(null)

  const login = trpc.admin.login.useMutation({
    onSuccess: () => {
      const key = keyInput.trim()
      localStorage.setItem('ug_admin_key', key)
      setAdminKey(key)
      setLoginError('')
    },
    onError: (error) => setLoginError(error.message),
  })

  const stats = trpc.admin.stats.useQuery({ key: adminKey }, { enabled: !!adminKey, retry: false })
  const orders = trpc.admin.orders.useQuery(
    {
      key: adminKey,
      search: search || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter as any,
      limit: 100,
    },
    { enabled: !!adminKey, retry: false },
  )
  const partners = trpc.admin.deliveryPartners.useQuery(
    { key: adminKey },
    { enabled: !!adminKey, retry: false },
  )

  const refresh = () => {
    stats.refetch()
    orders.refetch()
    partners.refetch()
  }

  const setOrderStatus = trpc.admin.setOrderStatus.useMutation({ onSuccess: refresh })
  const setPaymentStatus = trpc.admin.setPaymentStatus.useMutation({ onSuccess: refresh })
  const assignDeliveryPartner = trpc.admin.assignDeliveryPartner.useMutation({ onSuccess: refresh })

  const logout = () => {
    localStorage.removeItem('ug_admin_key')
    setAdminKey('')
    setKeyInput('')
  }

  if (!adminKey) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center"><ShieldCheck size={20} /></div>
            <div>
              <h1 className="font-extrabold text-lg">UG Souq Admin</h1>
              <p className="text-xs text-slate-500">Launch Control</p>
            </div>
          </div>
          <input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && keyInput.trim() && login.mutate({ key: keyInput.trim() })}
            placeholder="Administrator key"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {loginError && <p className="mt-2 text-sm text-red-600">{loginError}</p>}
          <button
            onClick={() => login.mutate({ key: keyInput.trim() })}
            disabled={!keyInput.trim() || login.isLoading}
            className="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {login.isLoading ? 'Checking…' : 'Open Launch Control'}
          </button>
          <button onClick={() => navigate('/')} className="mt-3 w-full text-sm text-slate-500">Back to marketplace</button>
        </div>
      </div>
    )
  }

  const allOrders = (orders.data as any[]) ?? []
  const approvedPartners = ((partners.data as any[]) ?? []).filter((partner: any) => partner?.status === 'approved')
  const s = (stats.data as any) ?? {}
  const busy = setOrderStatus.isLoading || setPaymentStatus.isLoading || assignDeliveryPartner.isLoading

  if (stats.error || orders.error || partners.error) {
    const error = stats.error || orders.error || partners.error
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <div className="max-w-lg w-full rounded-2xl border border-red-200 bg-white p-6">
          <div className="flex items-center gap-2 text-red-700 font-bold"><AlertTriangle size={20} /> Admin data could not load</div>
          <p className="mt-2 text-sm text-slate-600">{error?.message}</p>
          <div className="mt-4 flex gap-2">
            <button onClick={refresh} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white">Retry</button>
            <button onClick={logout} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold">Sign out</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 lg:px-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center"><ShieldCheck size={17} /></div>
              <h1 className="font-extrabold">UG Souq Launch Control</h1>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">Operate orders and deliveries now — paid providers can be connected later.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refresh} className="p-2 rounded-lg border border-slate-200 text-slate-600" aria-label="Refresh"><RefreshCw size={17} /></button>
            <button onClick={() => navigate('/admin/operations')} className="hidden sm:block rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold">Detailed operations</button>
            <button onClick={logout} className="p-2 rounded-lg border border-slate-200 text-red-600" aria-label="Sign out"><LogOut size={17} /></button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 lg:p-6 space-y-6">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl bg-white border border-slate-200 p-4"><ShoppingCart size={18} className="text-emerald-600" /><p className="mt-3 text-2xl font-extrabold">{s.orderCount ?? 0}</p><p className="text-xs text-slate-500">Orders</p></div>
          <div className="rounded-2xl bg-white border border-slate-200 p-4"><CreditCard size={18} className="text-emerald-600" /><p className="mt-3 text-xl sm:text-2xl font-extrabold">{money(s.revenue ?? 0)}</p><p className="text-xs text-slate-500">Booked revenue</p></div>
          <div className="rounded-2xl bg-white border border-slate-200 p-4"><Users size={18} className="text-emerald-600" /><p className="mt-3 text-2xl font-extrabold">{s.customerCount ?? 0}</p><p className="text-xs text-slate-500">Customers</p></div>
          <div className="rounded-2xl bg-white border border-slate-200 p-4"><Truck size={18} className="text-emerald-600" /><p className="mt-3 text-2xl font-extrabold">{approvedPartners.length}</p><p className="text-xs text-slate-500">Approved delivery partners</p></div>
        </section>

        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 text-emerald-700" size={20} />
            <div>
              <h2 className="font-bold text-emerald-950">Provider-free launch mode</h2>
              <p className="mt-1 text-sm text-emerald-900/75">Cash on delivery and manual Mobile Money verification can run now. Customer SMS is shown as a ready-to-send message instead of being charged through an SMS provider.</p>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-extrabold">Orders & fulfilment</h2>
              <p className="text-sm text-slate-500">Confirm payments, move orders forward, assign riders and prepare customer updates.</p>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Order, name or phone" className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                <option value="all">All</option>
                {Object.entries(ORDER_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
          </div>

          {orders.isLoading ? (
            <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center text-slate-500"><RefreshCw className="mx-auto mb-2 animate-spin" size={18} />Loading orders…</div>
          ) : allOrders.length === 0 ? (
            <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center text-slate-500">No orders found.</div>
          ) : (
            <div className="space-y-3">
              {allOrders.map((order: any) => {
                const next = NEXT_STATUS[order.status]
                const message = customerMessage(order)
                return (
                  <article key={order.id} className="rounded-2xl bg-white border border-slate-200 p-4 lg:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-extrabold">{order.code}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{ORDER_LABELS[order.status] ?? order.status}</span>
                          <span className={`rounded-full px-2 py-1 text-xs font-bold ${order.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' : order.paymentStatus === 'pending_confirmation' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{String(order.paymentStatus).replace('_', ' ')}</span>
                        </div>
                        <p className="mt-2 text-xl font-extrabold">{money(order.total)}</p>
                        <p className="mt-1 text-sm text-slate-600">{order.customerName} · {order.phone}</p>
                        <p className="mt-1 text-sm text-slate-500">{order.address}</p>
                        <p className="mt-2 text-xs text-slate-400">{order.items?.length ?? 0} item(s) · {String(order.paymentMethod ?? '').replaceAll('_', ' ')}</p>
                      </div>

                      <div className="w-full lg:w-80 space-y-2">
                        {order.paymentStatus === 'pending_confirmation' && (
                          <button disabled={busy} onClick={() => setPaymentStatus.mutate({ key: adminKey, id: Number(order.id), status: 'paid' })} className="w-full rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Confirm payment received</button>
                        )}
                        {order.paymentStatus === 'unpaid' && order.paymentMethod === 'cash' && (
                          <button disabled={busy} onClick={() => setPaymentStatus.mutate({ key: adminKey, id: Number(order.id), status: 'paid' })} className="w-full rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800 disabled:opacity-50">Mark cash collected</button>
                        )}

                        {order.status === 'pending_delivery' && approvedPartners.length > 0 && !order.deliveryPartnerId && (
                          <select
                            defaultValue=""
                            disabled={busy}
                            onChange={(e) => {
                              const partnerId = Number(e.target.value)
                              if (partnerId) assignDeliveryPartner.mutate({ key: adminKey, orderId: Number(order.id), partnerId })
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                          >
                            <option value="">Assign delivery partner…</option>
                            {approvedPartners.map((partner: any) => <option key={partner.id} value={partner.id}>{partner.fullName ?? partner.name} · {partner.area ?? partner.zone ?? ''}</option>)}
                          </select>
                        )}

                        {next && !(order.status === 'pending_delivery' && approvedPartners.length > 0 && !order.deliveryPartnerId) && (
                          <button disabled={busy} onClick={() => setOrderStatus.mutate({ key: adminKey, id: Number(order.id), status: next as any })} className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Move to {ORDER_LABELS[next]} <ArrowRight size={15} /></button>
                        )}

                        {order.status !== 'delivered' && order.status !== 'cancelled' && (
                          <button disabled={busy} onClick={() => window.confirm(`Cancel ${order.code}?`) && setOrderStatus.mutate({ key: adminKey, id: Number(order.id), status: 'cancelled' })} className="w-full rounded-xl border border-red-200 px-3 py-2 text-sm font-bold text-red-600 disabled:opacity-50">Cancel order</button>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Customer update — manual for now</p>
                          <p className="mt-1 text-sm text-slate-700">{message}</p>
                        </div>
                        <button
                          onClick={async () => {
                            await navigator.clipboard?.writeText(message)
                            setCopied(order.code)
                            window.setTimeout(() => setCopied(null), 1500)
                          }}
                          className="shrink-0 rounded-lg border border-slate-200 bg-white p-2 text-slate-600"
                          title="Copy customer message"
                        >
                          {copied === order.code ? <CheckCircle2 size={17} className="text-emerald-600" /> : <Clipboard size={17} />}
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
