import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Search, ShoppingCart, ChevronDown, Grid3X3, CircleHelp, MapPin, X, Smartphone, Tv, Shirt, Footprints, Wheat, Home as HomeIcon, RefreshCcw, UtensilsCrossed, Blend, UserRound } from 'lucide-react'
import { ORANGE, WA_LINK } from '../lib/site'
import { useCart } from '../lib/cart'

const CATEGORIES = [
  { name: 'Phones', q: 'phone', icon: Smartphone },
  { name: 'Electronics & TVs', q: 'electronics', icon: Tv },
  { name: "Women's Fashion", q: 'fashion', icon: Shirt },
  { name: 'Shoes & Sneakers', q: 'sneakers', icon: Footprints },
  { name: 'Farm Produce', q: 'farm', icon: Wheat },
  { name: 'Home & Kitchen', q: 'home', icon: HomeIcon },
  { name: 'Refurbished', q: 'refurbished', icon: RefreshCcw },
  { name: 'Food & Restaurants', q: '', to: '/food', icon: UtensilsCrossed },
  { name: 'Blenders & Appliances', q: 'blender', icon: Blend },
]

export default function Header() {
  const { count } = useCart()
  const [q, setQ] = useState('')
  const [catOpen, setCatOpen] = useState(false)
  const navigate = useNavigate()
  const goSearch = (e?: React.FormEvent) => {
    e?.preventDefault()
    const term = q.trim()
    if (term) { setCatOpen(false); navigate(`/search?q=${encodeURIComponent(term)}`) }
  }

  return (
    <>
      <div className="hidden bg-neutral-900 text-white text-xs sm:block">
        <div className="mx-auto max-w-7xl px-4 h-8 flex items-center justify-between">
          <span className="flex items-center gap-1.5"><MapPin size={12} /> Delivering across Uganda</span>
          <div className="flex items-center gap-4">
            <Link to="/sell" className="hover:text-emerald-300">Sell on UG Souq</Link>
            <Link to="/affiliates" className="hover:text-emerald-300">Affiliates</Link>
            <Link to="/account" className="hover:text-emerald-300">My Account</Link>
            <Link to="/track" className="hover:text-emerald-300">Track Order</Link>
            <a href={WA_LINK} target="_blank" rel="noreferrer" className="hover:text-emerald-300 flex items-center gap-1"><CircleHelp size={12} /> Help</a>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-3 py-2 sm:h-16 sm:flex-nowrap sm:gap-4 sm:px-4 sm:py-0">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <img src="/logo-mark.png" alt="UG Souq logo" className="h-8 w-8 rounded-lg object-cover bg-white sm:h-9 sm:w-9" />
            <span className="text-lg font-extrabold tracking-tight sm:text-xl">UG Souq</span>
          </Link>
          <button onClick={() => setCatOpen(true)} className="flex items-center gap-2 rounded-xl border border-neutral-200 p-2.5 text-sm font-medium hover:bg-emerald-50 hover:text-emerald-800">
            <Grid3X3 size={18} /><span className="hidden sm:inline">Categories</span><ChevronDown size={14} className="hidden sm:inline" />
          </button>
          <div className="flex-1" />
          <Link to="/account" className="rounded-full p-2 hover:bg-emerald-50" aria-label="My account"><UserRound size={22} /></Link>
          <Link to="/cart" className="relative rounded-full p-2 hover:bg-emerald-50" aria-label="Cart">
            <ShoppingCart size={22} />
            {count > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4.5 min-w-4.5 place-items-center rounded-full px-1 text-[10px] font-bold text-white" style={{ background: ORANGE }}>{count}</span>}
          </Link>
          <form onSubmit={goSearch} className="order-last flex w-full min-w-0 items-center overflow-hidden rounded-xl border border-neutral-300 bg-white transition-colors focus-within:border-emerald-600 sm:order-none sm:w-auto sm:flex-1">
            <Search size={17} className="ml-3 text-neutral-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none" placeholder="What are you looking for?" />
            <button type="submit" className="px-4 py-2.5 text-sm font-semibold text-white" style={{ background: ORANGE }}><span className="hidden sm:inline">Search</span><Search size={17} className="sm:hidden" /></button>
          </form>
        </div>
      </header>

      {catOpen && (
        <div className="fixed inset-0 z-50" onClick={() => setCatOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <aside className="absolute left-0 top-0 flex h-full w-80 max-w-[85vw] flex-col bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-4">
              <div className="flex items-center gap-2"><img src="/logo-mark.png" alt="UG Souq logo" className="h-8 w-8 rounded-lg object-cover" /><span className="text-lg font-extrabold">Categories</span></div>
              <button onClick={() => setCatOpen(false)} className="rounded-full p-2 hover:bg-neutral-100"><X size={20} /></button>
            </div>
            <nav className="flex-1 overflow-y-auto py-2">
              {CATEGORIES.map((c) => (
                <button key={c.name} onClick={() => { setCatOpen(false); navigate(c.to ?? `/search?q=${encodeURIComponent(c.q)}`) }} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-emerald-50">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><c.icon size={19} /></span>
                  <span className="text-sm font-semibold">{c.name}</span>
                </button>
              ))}
            </nav>
          </aside>
        </div>
      )}
    </>
  )
}
