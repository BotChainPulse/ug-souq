import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
    if (term) {
      setCatOpen(false)
      navigate(`/search?q=${encodeURIComponent(term)}`)
    }
  }
  return (
    <>
      <div className="bg-neutral-900 text-white text-xs">
        <div className="mx-auto max-w-7xl px-4 h-8 flex items-center justify-between">
          <span className="flex items-center gap-1.5"><MapPin size={12} /> Delivering across Uganda</span>
          <div className="hidden sm:flex items-center gap-4">
            <Link to="/sell" className="hover:text-orange-400">Sell on UG Souq</Link>
            <Link to="/affiliates" className="hover:text-orange-400">Affiliates</Link>
            <Link to="/account" className="hover:text-orange-400">My Account</Link>
            <Link to="/track" className="hover:text-orange-400">Track Order</Link>
            <a href={WA_LINK} target="_blank" rel="noreferrer" className="hover:text-orange-400 flex items-center gap-1"><CircleHelp size={12} /> Help</a>
          </div>
        </div>
      </div>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-neutral-200">
        <div className="mx-auto max-w-7xl px-4 py-2.5 sm:h-16 sm:py-0 flex flex-wrap items-center gap-2 sm:gap-4">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src="/logo-mark.png" alt="UG Souq logo" className="w-9 h-9 rounded-lg object-cover bg-white" />
            <span className="font-extrabold text-xl tracking-tight">UG Souq</span>
          </Link>
          <button
            onClick={() => setCatOpen(true)}
            className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg border border-neutral-200 hover:bg-neutral-50"
          >
            <Grid3X3 size={16} /> <span className="hidden sm:inline">Categories</span> <ChevronDown size={14} className="hidden sm:inline" />
          </button>
          <div className="flex-1" />
          <Link to="/account" className="sm:hidden p-2 hover:bg-neutral-100 rounded-full" aria-label="My account">
            <UserRound size={22} />
          </Link>
          <Link to="/cart" className="relative p-2 hover:bg-neutral-100 rounded-full">
            <ShoppingCart size={22} />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 text-[10px] font-bold text-white min-w-4.5 h-4.5 px-1 rounded-full grid place-items-center" style={{ background: ORANGE }}>{count}</span>
            )}
          </Link>
          <form onSubmit={goSearch} className="w-full min-w-0 sm:w-auto sm:flex-1 sm:order-none order-last flex items-center rounded-full border border-neutral-300 overflow-hidden bg-white focus-within:border-neutral-500 transition-colors">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="flex-1 min-w-0 px-4 py-2.5 text-sm outline-none bg-transparent"
              placeholder="Search UG Souq products..."
            />
            <button type="submit" className="px-3 sm:px-5 py-2.5 text-white text-sm font-semibold flex items-center gap-2" style={{ background: ORANGE }}>
              <Search size={16} /> <span className="hidden sm:inline">Search</span>
            </button>
          </form>
        </div>
      </header>

      {catOpen && (
        <div className="fixed inset-0 z-50" onClick={() => setCatOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <aside
            className="absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 h-16 border-b border-neutral-200">
              <div className="flex items-center gap-2">
                <img src="/logo-mark.png" alt="UG Souq logo" className="w-8 h-8 rounded-lg object-cover bg-white" />
                <span className="font-extrabold text-lg">Categories</span>
              </div>
              <button onClick={() => setCatOpen(false)} className="p-2 hover:bg-neutral-100 rounded-full" aria-label="Close categories">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.name}
                  onClick={() => {
                    setCatOpen(false)
                    navigate(c.to ?? `/search?q=${encodeURIComponent(c.q)}`)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-neutral-50 text-left"
                >
                  <span className="w-10 h-10 rounded-xl bg-orange-50 grid place-items-center shrink-0" style={{ color: ORANGE }}>
                    <c.icon size={19} />
                  </span>
                  <span className="font-semibold text-sm">{c.name}</span>
                </button>
              ))}
            </nav>
            <div className="border-t border-neutral-200 p-4 text-xs text-neutral-500">
              More categories are added as sellers join the market.
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
