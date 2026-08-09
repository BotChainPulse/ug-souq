import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { UserRound, MapPin, Phone, Package, Pencil, LogOut, CircleCheckBig, Truck, XCircle, CircleDashed, Trash2 } from 'lucide-react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { trpc } from '@/providers/trpc'
import { fmt } from '../lib/cart'
import { ORANGE } from '../lib/site'
import { getAccount, saveAccount, clearAccount, type Account } from '../lib/account'
import { paymentLabel } from '../lib/payStatus'

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; Icon: any }> = {
    placed: { label: 'Placed', cls: 'bg-blue-50 text-blue-700', Icon: CircleDashed },
    confirmed: { label: 'Confirmed', cls: 'bg-amber-50 text-amber-700', Icon: CircleCheckBig },
    on_the_way: { label: 'On the way', cls: 'bg-purple-50 text-purple-700', Icon: Truck },
    delivered: { label: 'Delivered', cls: 'bg-green-50 text-green-700', Icon: CircleCheckBig },
    cancelled: { label: 'Cancelled', cls: 'bg-red-50 text-red-700', Icon: XCircle },
  }
  const s = map[status] ?? map.placed
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${s.cls}`}>
      <s.Icon size={12} /> {s.label}
    </span>
  )
}

export default function AccountPage() {
  const [account, setAccount] = useState<Account | null>(getAccount())
  const [form, setForm] = useState<Account>(account ?? { name: '', phone: '', location: '' })
  const [editing, setEditing] = useState(!account)
  const register = trpc.customers.register.useMutation()
  const deleteAccount = trpc.customers.deleteAccount.useMutation()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { data } = trpc.customers.me.useQuery(
    { phone: account?.phone ?? '' },
    { enabled: !!account },
  )

  // If the account exists on the server (e.g. new phone), pull the saved name/location
  useEffect(() => {
    if (data?.customer && account) {
      const c = data.customer
      if (c.name !== account.name || (c.location ?? '') !== account.location) {
        const next = { name: c.name, phone: c.phone, location: c.location ?? '' }
        saveAccount(next)
        setAccount(next)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.customer?.id])

  const valid = form.name.trim().length >= 2 && form.phone.trim().length >= 9 && form.location.trim().length >= 3

  const save = async () => {
    const phone = form.phone.replace(/[\s-]+/g, '')
    const next = { name: form.name.trim(), phone, location: form.location.trim() }
    saveAccount(next)
    setAccount(next)
    setEditing(false)
    try { await register.mutateAsync(next) } catch { /* offline ok — syncs on next order */ }
  }

  const orders = data?.orders ?? []

  return (
    <div className="min-h-screen bg-[#faf9f7] text-neutral-900 antialiased flex flex-col">
      <Header />
      <div className="mx-auto max-w-2xl w-full px-4 py-8 flex-1">
        <h1 className="text-2xl font-extrabold flex items-center gap-2"><UserRound size={24} style={{ color: ORANGE }} /> My Account</h1>

        {!account || editing ? (
          <div className="mt-5 bg-white rounded-2xl border border-neutral-200 p-6">
            <h2 className="font-extrabold text-lg">{account ? 'Edit your details' : 'Create your account'}</h2>
            <p className="text-sm text-neutral-600 mt-1">
              Register once — your orders, delivery details and tracking all live here, like your noon account.
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5">Full name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-neutral-500" placeholder="e.g. Reagan Lutwama" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Phone number (we call you on delivery) *</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-neutral-500" placeholder="07XX XXX XXX" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Delivery location *</label>
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-neutral-500" placeholder="e.g. Ntinda, near Capital Shoppers, Kampala" />
                <p className="text-xs text-neutral-500 mt-1">A clear landmark helps the boda rider find you fast.</p>
              </div>
              <div className="flex gap-3">
                <button disabled={!valid || register.isPending} onClick={save} className="flex-1 text-sm font-bold text-white py-3 rounded-full disabled:opacity-40" style={{ background: ORANGE }}>
                  {register.isPending ? 'Saving…' : account ? 'Save changes' : 'Create account'}
                </button>
                {account && (
                  <button onClick={() => { setForm(account); setEditing(false) }} className="px-6 text-sm font-bold rounded-full border border-neutral-300">Cancel</button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Profile card */}
            <div className="mt-5 bg-white rounded-2xl border border-neutral-200 p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full grid place-items-center text-white text-xl font-extrabold shrink-0" style={{ background: ORANGE }}>
                    {account.name.trim()[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-extrabold text-lg truncate">{account.name}</p>
                    <p className="text-sm text-neutral-600 flex items-center gap-1.5 mt-0.5"><Phone size={13} /> {account.phone}</p>
                    <p className="text-sm text-neutral-600 flex items-center gap-1.5 mt-0.5"><MapPin size={13} /> {account.location}</p>
                  </div>
                </div>
                <button onClick={() => { setForm(account); setEditing(true) }} className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-full border border-neutral-300 hover:border-neutral-500">
                  <Pencil size={12} /> Edit
                </button>
              </div>
            </div>

            {/* Orders */}
            <div className="mt-6 flex items-center justify-between">
              <h2 className="font-extrabold text-lg flex items-center gap-2"><Package size={20} style={{ color: ORANGE }} /> My Orders</h2>
              <span className="text-xs text-neutral-500">{orders.length} order{orders.length === 1 ? '' : 's'}</span>
            </div>

            {orders.length === 0 ? (
              <div className="mt-3 bg-white rounded-2xl border border-neutral-200 p-8 text-center">
                <p className="text-neutral-500 text-sm">No orders yet on this account.</p>
                <Link to="/" className="mt-4 inline-block text-sm font-bold text-white px-6 py-3 rounded-full" style={{ background: ORANGE }}>Start shopping</Link>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {orders.map((o) => (
                  <div key={o.id} className="bg-white rounded-2xl border border-neutral-200 p-5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-extrabold font-mono tracking-widest">{o.code}</p>
                        <p className="text-xs text-neutral-500 mt-0.5">{new Date(o.createdAt).toLocaleString('en-UG')}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${paymentLabel(o).cls}`}>{paymentLabel(o).text}</span>
                        <StatusPill status={o.status} />
                      </div>
                    </div>
                    <div className="mt-3 space-y-1 text-sm border-t border-neutral-100 pt-3">
                      {o.items.map((i) => (
                        <div key={i.id} className="flex justify-between"><span className="text-neutral-600">{i.qty}× {i.name}</span><span className="font-medium">{fmt(i.price * i.qty)}</span></div>
                      ))}
                    </div>
                    <div className="mt-3 flex justify-between text-sm border-t border-neutral-100 pt-3">
                      <span className="text-neutral-500">Total ({o.paymentMethod.replace('_', ' ')})</span>
                      <span className="font-extrabold" style={{ color: ORANGE }}>{fmt(o.total)}</span>
                    </div>
                    <Link to="/track" className="mt-3 inline-block text-xs font-bold" style={{ color: ORANGE }}>Track this order →</Link>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
              <button
                onClick={() => { clearAccount(); setAccount(null); setForm({ name: '', phone: '', location: '' }); setEditing(true) }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-800">
                <LogOut size={13} /> Switch account / sign out on this device
              </button>
              {!confirmDelete ? (
                <button onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-red-600">
                  <Trash2 size={13} /> Delete my account
                </button>
              ) : (
                <span className="inline-flex items-center gap-2 text-xs">
                  <span className="text-red-600 font-semibold">Delete account + all {orders.length} order(s) permanently?</span>
                  <button
                    onClick={async () => {
                      try { await deleteAccount.mutateAsync({ phone: account.phone }) } catch { /* remove locally anyway */ }
                      clearAccount()
                      setAccount(null)
                      setForm({ name: '', phone: '', location: '' })
                      setEditing(true)
                      setConfirmDelete(false)
                    }}
                    disabled={deleteAccount.isPending}
                    className="font-bold text-white bg-red-600 px-3 py-1.5 rounded-full disabled:opacity-40">
                    {deleteAccount.isPending ? 'Deleting…' : 'Yes, delete'}
                  </button>
                  <button onClick={() => setConfirmDelete(false)} className="font-semibold text-neutral-500">Cancel</button>
                </span>
              )}
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  )
}
