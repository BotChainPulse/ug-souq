import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  UserRound, MapPin, Phone, Package, Pencil, LogOut,
  CircleCheckBig, Truck, XCircle, CircleDashed, Trash2,
  HelpCircle, MessageCircle, Mail, Star, Ticket, Heart,
  Store, Clock, CreditCard, ChevronRight, Home, Grid3X3,
  ShoppingCart, Bell
} from 'lucide-react'
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
  const navigate = useNavigate()

  const { data } = trpc.customers.me.useQuery(
    { phone: account?.phone ?? '' },
    { enabled: !!account },
  )

  useEffect(() => {
    if (data && account) {
      const updated = { ...account, name: data.name || account.name, location: data.location || account.location }
      setAccount(updated)
      saveAccount(updated)
      setForm(updated)
    }
  }, [data])

  const handleSave = () => {
    if (!form.name.trim() || !form.phone.trim()) return
    saveAccount(form)
    setAccount(form)
    setEditing(false)
    register.mutate({ name: form.name, phone: form.phone, location: form.location })
  }

  const handleDelete = () => {
    if (!account) return
    deleteAccount.mutate(
      { phone: account.phone },
      {
        onSuccess: () => {
          clearAccount()
          setAccount(null)
          setForm({ name: '', phone: '', location: '' })
          setConfirmDelete(false)
          setEditing(true)
        },
      }
    )
  }

  const { data: ordersData } = trpc.orders.myOrders.useQuery(
    { phone: account?.phone ?? '' },
    { enabled: !!account },
  )
  const orders = (ordersData as any)?.orders ?? ordersData ?? []

  const assistanceItems = [
    { icon: HelpCircle, label: 'Help & Support', to: '/help' },
  ]

  const accountItems = [
    { icon: Package, label: 'Orders', to: '/my-orders', badge: orders.length > 0 ? String(orders.length) : undefined },
    { icon: Mail, label: 'Inbox', to: '/inbox' },
    { icon: Star, label: 'Ratings & Reviews', to: '/reviews' },
    { icon: Ticket, label: 'Vouchers', to: '/vouchers' },
    { icon: Heart, label: 'Wishlist', to: '/wishlist' },
    { icon: Store, label: 'Follow Seller', to: '/follow-seller' },
    { icon: Clock, label: 'Recently Viewed', to: '/recently-viewed' },
  ]

  const settingsItems = [
    { icon: CreditCard, label: 'Payment Settings', to: '/payment-settings' },
    { icon: MapPin, label: 'Address Book', to: '/addresses' },
    { icon: Bell, label: 'Notifications', to: '/notifications' },
  ]

  if (!account || editing) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-md mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            {account ? 'Edit Profile' : 'Create Account'}
          </h1>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="07XX XXX XXX"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location / District</label>
              <input
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. Kampala, Mpigi"
              />
            </div>
            <button
              onClick={handleSave}
              className="w-full py-3 rounded-lg font-semibold text-white"
              style={{ backgroundColor: ORANGE }}
            >
              {account ? 'Save Changes' : 'Create Account'}
            </button>
            {account && (
              <button
                onClick={() => setEditing(false)}
                className="w-full py-3 rounded-lg font-semibold border border-gray-300 text-gray-700"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <Header />

      {/* Profile Header */}
      <div className="bg-white px-4 pt-4 pb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
               style={{ backgroundColor: ORANGE }}>
            {account.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Welcome {account.name?.split(' ')[0]}!</h1>
            <p className="text-sm text-gray-500">{account.phone}</p>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-gray-300 text-sm text-gray-600"
          >
            <Pencil size={14} /> Edit
          </button>
        </div>

        {/* UG Souq Balance */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center">
            <span className="text-blue-600 font-bold text-xs">U</span>
          </div>
          <span>UG Souq balance: <span className="font-semibold text-gray-900">UGX 0</span></span>
        </div>

        {/* Chat buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button className="flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-white"
                  style={{ backgroundColor: ORANGE }}>
            <MessageCircle size={18} /> Live Chat
          </button>
          <a href="https://wa.me/256708813419" target="_blank" rel="noopener noreferrer"
             className="flex items-center justify-center gap-2 py-3 rounded-lg font-semibold border-2 border-green-500 text-green-600 bg-white">
            <span className="text-green-500 font-bold">WhatsApp</span>
          </a>
        </div>
      </div>

      {/* Need Assistance */}
      <div className="mt-2 bg-white">
        <div className="px-4 py-2 text-sm font-semibold text-gray-500">Need Assistance?</div>
        {assistanceItems.map((item) => (
          <Link key={item.label} to={item.to}
                className="flex items-center gap-3 px-4 py-3 border-t border-gray-100 active:bg-gray-50">
            <item.icon size={20} className="text-gray-700" />
            <span className="flex-1 text-gray-900">{item.label}</span>
            <ChevronRight size={18} className="text-gray-400" />
          </Link>
        ))}
      </div>

      {/* My UG Souq Account */}
      <div className="mt-2 bg-white">
        <div className="px-4 py-2 text-sm font-semibold text-gray-500">My UG Souq Account</div>
        {accountItems.map((item) => (
          <Link key={item.label} to={item.to}
                className="flex items-center gap-3 px-4 py-3 border-t border-gray-100 active:bg-gray-50">
            <item.icon size={20} className="text-gray-700" />
            <span className="flex-1 text-gray-900">{item.label}</span>
            {item.badge && (
              <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{item.badge}</span>
            )}
            <ChevronRight size={18} className="text-gray-400" />
          </Link>
        ))}
      </div>

      {/* My Settings */}
      <div className="mt-2 bg-white">
        <div className="px-4 py-2 text-sm font-semibold text-gray-500">My Settings</div>
        {settingsItems.map((item) => (
          <Link key={item.label} to={item.to}
                className="flex items-center gap-3 px-4 py-3 border-t border-gray-100 active:bg-gray-50">
            <item.icon size={20} className="text-gray-700" />
            <span className="flex-1 text-gray-900">{item.label}</span>
            <ChevronRight size={18} className="text-gray-400" />
          </Link>
        ))}
      </div>

      {/* Danger Zone */}
      <div className="mt-2 bg-white mb-4">
        <button
          onClick={() => setConfirmDelete(true)}
          className="flex items-center gap-3 px-4 py-3 w-full text-left active:bg-gray-50"
        >
          <Trash2 size={20} className="text-red-500" />
          <span className="flex-1 text-red-600 font-medium">Delete Account</span>
          <ChevronRight size={18} className="text-gray-400" />
        </button>
      </div>

      {/* My Orders Preview */}
      {orders.length > 0 && (
        <div className="px-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Package size={20} style={{ color: ORANGE }} /> My Orders
            </h2>
            <Link to="/my-orders" className="text-sm font-semibold" style={{ color: ORANGE }}>
              See all ({orders.length})
            </Link>
          </div>
          <div className="space-y-3">
            {orders.slice(0, 3).map((o: any) => (
              <Link key={o.id} to={`/track-order?code=${o.code}`}
                    className="block bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-bold text-gray-900">{o.code}</p>
                    <p className="text-xs text-gray-500">
                      {o.createdAt ? new Date(o.createdAt).toLocaleString() : ''}
                    </p>
                  </div>
                  <StatusPill status={o.status} />
                </div>
                {o.items?.map((it: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between py-1">
                    <span className="text-sm text-gray-700">{it.quantity}× {it.name}</span>
                    <span className="text-sm font-semibold text-gray-900">UGX {fmt(it.price * it.quantity)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-100">
                  <span className="text-xs text-gray-500">Total ({paymentLabel(o.paymentMethod)})</span>
                  <span className="font-bold" style={{ color: ORANGE }}>UGX {fmt(o.total)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Account?</h3>
            <p className="text-sm text-gray-600 mb-4">
              This will permanently remove your account and order history.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2.5 rounded-lg border border-gray-300 font-semibold text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-lg font-semibold text-white bg-red-500"
              >
                {deleteAccount.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="flex items-center justify-around py-2">
          <Link to="/" className="flex flex-col items-center gap-0.5 text-gray-500">
            <Home size={22} />
            <span className="text-[10px]">Home</span>
          </Link>
          <Link to="/catalog" className="flex flex-col items-center gap-0.5 text-gray-500">
            <Grid3X3 size={22} />
            <span className="text-[10px]">Categories</span>
          </Link>
          <Link to="/cart" className="flex flex-col items-center gap-0.5 text-gray-500">
            <ShoppingCart size={22} />
            <span className="text-[10px]">Cart</span>
          </Link>
          <Link to="/wishlist" className="flex flex-col items-center gap-0.5 text-gray-500">
            <Heart size={22} />
            <span className="text-[10px]">Wishlist</span>
          </Link>
          <Link to="/account" className="flex flex-col items-center gap-0.5 font-semibold" style={{ color: ORANGE }}>
            <UserRound size={22} />
            <span className="text-[10px]">Account</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
