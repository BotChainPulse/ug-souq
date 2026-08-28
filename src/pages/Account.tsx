import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
  UserRound, MapPin, Phone, Package, Pencil, LogOut,
  CircleCheckBig, Truck, XCircle, CircleDashed, Trash2,
  HelpCircle, MessageCircle, Mail, Star, Ticket, Heart,
  Store, Clock, CreditCard, ChevronRight, Home, Grid3X3,
  ShoppingCart, Bell, Wallet, ShieldCheck, Globe, Settings,
  Lock, Undo2, MapPinned, Facebook, Instagram, Linkedin,
  Edit3
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
    confirming_payment: { label: 'Confirming', cls: 'bg-amber-50 text-amber-700', Icon: Clock },
    awaiting_payment: { label: 'Awaiting Pay', cls: 'bg-orange-50 text-orange-700', Icon: Clock },
    on_the_way: { label: 'On the way', cls: 'bg-purple-50 text-purple-700', Icon: Truck },
    shipped: { label: 'Shipped', cls: 'bg-purple-50 text-purple-700', Icon: Truck },
    out_for_delivery: { label: 'Out for Delivery', cls: 'bg-indigo-50 text-indigo-700', Icon: Truck },
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
  

  const { data: profileData } = trpc.customers.me.useQuery(
    { phone: account?.phone ?? '' },
    { enabled: !!account },
  )

  const { data: ordersData } = trpc.orders.byPhone.useQuery(
    { phone: account?.phone ?? '' },
    { enabled: !!account },
  )

  useEffect(() => {
    if (profileData?.customer && account) {
      const updated = {
        ...account,
        name: profileData.customer.name || account.name,
        location: profileData.customer.location || account.location
      }
      setAccount(updated)
      saveAccount(updated)
      setForm(updated)
    }
  }, [profileData])

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

  const handleLogout = () => {
    clearAccount()
    setAccount(null)
    setForm({ name: '', phone: '', location: '' })
    setEditing(true)
    window.location.href = '/'
  }

  const orders = ordersData ?? []
  const [wishlistCount, setWishlistCount] = useState(0)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('wishlist') || '[]')
      setWishlistCount(Array.isArray(saved) ? saved.length : 0)
    } catch {
      setWishlistCount(0)
    }
  }, [])

  const menuItems = [
    { icon: MapPinned, label: 'Addresses', to: '/addresses' },
    { icon: CreditCard, label: 'Manage Cards', to: '/payment-settings' },
    { icon: Truck, label: 'Deliveries', to: '/deliveries' },
    { icon: Undo2, label: 'Returns', to: '/returns' },
    { icon: ShieldCheck, label: 'Warranty Claims', to: '/terms' },
    { icon: Globe, label: 'Language', value: 'English', to: '/account' },
    { icon: MapPin, label: 'Country', value: 'Uganda', to: '/account' },
    { icon: Settings, label: 'Preferences', to: '/preferences' },
    { icon: Bell, label: 'Notifications', to: '/notifications' },
    { icon: Lock, label: 'Account Security', to: '/account-security' },
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
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header />

      {/* Profile Card */}
      <div className="bg-white mx-3 mt-3 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
            style={{ backgroundColor: ORANGE }}
          >
            {account.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 truncate">
              {account.name || 'Lutwama Reagan'}
            </h2>
            <p className="text-sm text-gray-500 truncate">reagz.lutwama700@gmail.com</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Phone size={12} /> {account.phone || '0708813419'}
              </span>
              <span className="flex items-center gap-1">
                <MapPin size={12} /> {account.location || 'Mpigi'}
              </span>
            </div>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200"
          >
            <Edit3 size={16} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Loyalty Banner */}
      <div
        className="mx-3 mt-3 rounded-2xl p-4 text-white flex items-center justify-between"
        style={{ background: `linear-gradient(135deg, ${ORANGE}, #d95d1e)` }}
      >
        <div>
          <p className="text-xs font-medium opacity-90">UG Souq</p>
          <p className="text-sm font-bold">Unlimited Free Delivery</p>
        </div>
        <Link to="/plus">
          <span className="text-xs font-bold bg-white px-3 py-1.5 rounded-full" style={{ color: ORANGE }}>
            Join Now ›
          </span>
        </Link>
      </div>

      {/* Orders & Wishlist Quick Cards */}
      <div className="mx-3 mt-3 grid grid-cols-2 gap-3">
        <Link to="/my-orders">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <Package size={20} style={{ color: ORANGE }} />
              <span className="text-xs text-gray-400">{orders.length} orders</span>
            </div>
            <p className="font-bold text-gray-900 text-sm">My Orders</p>
            <div className="flex gap-1 mt-2">
              {orders.slice(0, 3).map((o: any, i: number) => (
                <div key={i} className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-xs">
                  📦
                </div>
              ))}
              {orders.length === 0 && (
                <>
                  <div className="w-8 h-8 rounded bg-gray-100" />
                  <div className="w-8 h-8 rounded bg-gray-100" />
                  <div className="w-8 h-8 rounded bg-gray-100" />
                </>
              )}
            </div>
          </div>
        </Link>

        <Link to="/wishlist">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <Heart size={20} className="text-red-500" />
              <span className="text-xs text-gray-400">{wishlistCount} items</span>
            </div>
            <p className="font-bold text-gray-900 text-sm">My Wishlist</p>
            <div className="flex gap-1 mt-2">
              <div className="w-8 h-8 rounded bg-gray-100" />
              <div className="w-8 h-8 rounded bg-gray-100" />
              <div className="w-8 h-8 rounded bg-gray-100" />
            </div>
          </div>
        </Link>
      </div>

      {/* Wallet / Credits */}
      <Link to="/account">
        <div className="mx-3 mt-3 bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ backgroundColor: '#fff3e6' }}>
              <Wallet size={20} style={{ color: ORANGE }} />
            </div>
            <span className="font-medium text-gray-900 text-sm">UG Souq Credits</span>
          </div>
          <div className="flex items-center gap-1 text-gray-400">
            <span className="text-sm">UGX 0</span>
            <ChevronRight size={16} />
          </div>
        </div>
      </Link>

      {/* Promo Card */}
      <div className="mx-3 mt-3 bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-bold text-gray-900 text-sm">UG Souq Credit Card</p>
            <p className="text-xs text-gray-500 mt-1">• Get 20% off + free delivery</p>
            <p className="text-xs text-gray-500">• UGX 5,000 welcome bonus</p>
            <button className="mt-3 bg-gray-900 text-white text-xs font-bold px-4 py-2 rounded-xl">
              Apply Now
            </button>
          </div>
          <div
            className="w-16 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xs"
            style={{ backgroundColor: ORANGE }}
          >
            UG S
          </div>
        </div>
      </div>

      {/* Menu List */}
      <div className="mx-3 mt-3 bg-white rounded-2xl shadow-sm overflow-hidden">
        {menuItems.map((item, idx) => (
          <div key={item.label}>
            <Link
              to={item.to}
              className="flex items-center justify-between p-4 hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <item.icon size={20} className="text-gray-600" />
                <span className="font-medium text-gray-900 text-sm">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {(item as any).value && (
                  <span className="text-sm text-gray-500">{(item as any).value}</span>
                )}
                <ChevronRight size={16} className="text-gray-400" />
              </div>
            </Link>
            {idx < menuItems.length - 1 && <div className="h-px bg-gray-100 mx-4" />}
          </div>
        ))}
        {/* Sign Out */}
        <div className="h-px bg-gray-100 mx-4" />
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            <LogOut size={20} className="text-red-500" />
            <span className="font-medium text-red-500 text-sm">Sign Out</span>
          </div>
          <ChevronRight size={16} className="text-gray-400" />
        </button>
      </div>

      {/* My Orders Preview */}
      {orders.length > 0 && (
        <div className="px-4 mt-4 mb-4">
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
                    <p className="font-bold text-gray-900 text-sm">{o.code}</p>
                    <p className="text-xs text-gray-500">
                      {o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-GB') : ''}
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
                  <span className="font-bold text-sm" style={{ color: ORANGE }}>UGX {fmt(o.total)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mx-3 mt-6 mb-8 text-center">
        <div className="flex justify-center gap-6 mb-3">
          <Facebook size={20} className="text-gray-400" />
          <Instagram size={20} className="text-gray-400" />
          <Linkedin size={20} className="text-gray-400" />
        </div>
        <p className="text-xs text-gray-400">Policies &nbsp;&nbsp; Sell on UG Souq ↗</p>
        <p className="text-[10px] text-gray-300 mt-2">© 2026 ugsouq.com. All rights reserved.</p>
      </div>

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
    </div>
  )
}
