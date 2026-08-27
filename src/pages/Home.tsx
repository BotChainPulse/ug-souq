import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import {Heart, 
  Search, Store, BadgePercent, Grid3X3,
  Smartphone, Cpu, Refrigerator, Armchair, Shirt, Sparkles, Tractor, Sun, Wrench, Footprints,
  GraduationCap, Dumbbell, Baby, Gamepad2, Dog, Apple, Bike, BookOpen,
  UtensilsCrossed, Timer, Send, Leaf, Recycle, Wallet, Zap, Star, Truck,
  ShieldCheck, Heart, Home as HomeIcon, BadgeCheck, Handshake, ShoppingCart, Check,
} from 'lucide-react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { trpc } from '@/providers/trpc'
import { fmt, useCart } from '../lib/cart'
import { ORANGE, WA_LINK } from '../lib/site'
import { categoryName } from '../lib/categories'

const services = [
  { icon: Store, label: 'Super Mall', to: '/mall' },
  { icon: UtensilsCrossed, label: 'UG Souq Food', to: '/food' },
  { icon: Timer, label: 'UG Souq Fresh', tag: '45 min', to: '/catalog?category=agriculture&title=UG%20Souq%20Fresh' },
  { icon: Send, label: 'Boda Send', to: '/boda' },
  { icon: Leaf, label: 'Farm Direct', to: '/catalog?category=agriculture&title=Farm%20Direct' },
  { icon: Recycle, label: 'Refurbished', to: '/catalog?condition=refurbished' },
  { icon: Wallet, label: 'UG Souq Pay', to: '/pay' },
  { icon: BadgePercent, label: 'Deals', to: '/catalog?deals=1' },
]

const categoryIcons: Record<string, typeof Cpu> = {
  electronics: Cpu, phones: Smartphone, refurbished: Recycle, appliances: Refrigerator,
  home: HomeIcon, furniture: Armchair, 'mens-fashion': Shirt, 'womens-fashion': Sparkles,
  shoes: Footprints, beauty: Heart, agriculture: Tractor, solar: Sun, tools: Wrench,
  office: GraduationCap, sports: Dumbbell, baby: Baby, toys: Gamepad2, pets: Dog,
  grocery: Apple, 'boda-auto': Bike, books: BookOpen, other: Grid3X3,
}

const homeTiles = [
  'electronics', 'phones', 'refurbished', 'appliances', 'home',
  'furniture', 'mens-fashion', 'womens-fashion', 'beauty', 'agriculture',
  'solar', 'tools', 'office', 'sports', 'baby',
  'toys', 'pets', 'grocery', 'boda-auto', 'books',
]

function useCountdown() {
  const [t, setT] = useState(16 * 3600 + 43 * 60 + 49)
  useEffect(() => {
    const id = setInterval(() => setT((s) => (s > 0 ? s - 1 : 24 * 3600)), 1000)
    return () => clearInterval(id)
  }, [])
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0'))
}

export default function HomePage() {
  const [hh, mm, ss] = useCountdown()
  const { data: products, isLoading } = trpc.products.flashSale.useQuery()
  const { add } = useCart()
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('wishlist') || '[]') } catch { return [] }
  })
  const toggleWish = (id: string) => {
    const next = wishlist.includes(id) ? wishlist.filter(w => w !== id) : [...wishlist, id]
    setWishlist(next)
    localStorage.setItem('wishlist', JSON.stringify(next))
  }
  const [added, setAdded] = useState<number | null>(null)

  const onAdd = (id: number, name: string, price: number) => {
    add({ itemType: 'product', itemId: id, name, price })
    setAdded(id)
    setTimeout(() => setAdded(null), 1200)
  }

  return (
    <div className="min-h-screen bg-[#faf9f7] text-neutral-900 antialiased">
      <Header />

      {/* Service chips */}
      <div className="bg-white border-b border-neutral-200">
        <div className="mx-auto max-w-7xl px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none]">
          {services.map(({ icon: Icon, label, tag, to }) => (
            <Link key={label} to={to} className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-neutral-200 text-sm font-medium whitespace-nowrap hover:border-neutral-400 hover:shadow-sm transition-all bg-white">
              <Icon size={16} style={{ color: ORANGE }} />
              {label}
              {tag && <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full" style={{ background: ORANGE }}>{tag}</span>}
            </Link>
          ))}
        </div>
      </div>

      {/* Hero */}
      <section className="bg-[#fdf3ea]">
        <div className="mx-auto max-w-7xl px-4 py-12 md:py-16 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-orange-200" style={{ color: ORANGE }}>
              <Zap size={13} /> Proudly Ugandan
            </span>
            <h1 className="mt-4 text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.08]">
              Uganda's market,<br />in your pocket.
            </h1>
            <p className="mt-4 text-neutral-600 max-w-md">
              Phones, fashion, fresh farm produce & more — pay with MTN MoMo or Airtel Money, delivered anywhere in Uganda.
            </p>
            <div className="mt-6 flex items-center rounded-full border border-neutral-300 bg-white overflow-hidden max-w-md shadow-sm focus-within:border-neutral-500">
              <Search size={16} className="ml-4 text-neutral-400" />
              <input className="flex-1 min-w-0 px-3 py-3 text-sm outline-none" placeholder="Search UG Souq..." />
              <button className="m-1 px-4 sm:px-5 py-2 rounded-full text-white text-sm font-semibold" style={{ background: ORANGE }}>Search</button>
            </div>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-medium">
              <Link to="/catalog?category=phones" className="px-3 py-1.5 rounded-full bg-white border border-neutral-200 hover:border-orange-300 hover:text-orange-700 transition-colors">Phones under 500K</Link>
              <Link to="/food" className="px-3 py-1.5 rounded-full bg-white border border-neutral-200 hover:border-orange-300 hover:text-orange-700 transition-colors">Order Food</Link>
              <Link to="/catalog?deals=1" className="px-3 py-1.5 rounded-full bg-white border border-neutral-200 hover:border-orange-300 hover:text-orange-700 transition-colors">Today's Deals</Link>
            </div>
          </div>
          <div className="relative">
            <img src="/images/hero.jpg" alt="Shopping on UG Souq" className="w-full rounded-2xl shadow-xl object-cover aspect-[3/2]" />
            <div className="absolute -bottom-4 left-4 bg-white rounded-xl shadow-lg px-4 py-2.5 flex items-center gap-2 text-sm font-semibold">
              <Truck size={16} style={{ color: ORANGE }} /> Free delivery in Kampala
            </div>
            <div className="absolute top-4 right-4 bg-white rounded-xl shadow-lg px-3 py-2 text-sm font-bold" style={{ color: ORANGE }}>
              Up to −35%
            </div>
          </div>
        </div>
      </section>

      {/* Verified sellers banner */}
      <section className="mx-auto max-w-7xl px-4 mt-12">
        <div className="bg-sky-50 border border-sky-100 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-white grid place-items-center shadow-sm shrink-0"><BadgeCheck size={20} className="text-sky-600" /></span>
            <div>
              <h3 className="font-bold text-sm text-sky-900">Verified sellers come first</h3>
              <p className="text-xs text-sky-700/80">ID-checked, location-confirmed shops with a 95%+ positive record are shown at the top of every listing.</p>
            </div>
          </div>
          <Link to="/verification" className="sm:ml-auto text-xs font-bold text-sky-700 bg-white border border-sky-200 px-4 py-2 rounded-full hover:bg-sky-100 transition-colors whitespace-nowrap">How verification works →</Link>
        </div>
      </section>

      {/* Seller ads banner */}
      <section className="mx-auto max-w-7xl px-4 mt-6">
        <div className="bg-neutral-900 text-white rounded-2xl p-6 sm:p-7 border border-neutral-700">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div>
              <p className="text-xs uppercase tracking-wider text-orange-300 font-bold">Seller Ads</p>
              <h3 className="mt-1 text-xl font-extrabold">Promote your shop on UG Souq</h3>
              <p className="mt-2 text-sm text-neutral-300 max-w-2xl">Boost visibility on home sections and category feeds. Pick a weekly or monthly ad package and our team activates your campaign.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/sell" className="px-4 py-2 rounded-full text-sm font-bold text-white" style={{ background: ORANGE }}>Start seller profile</Link>
              <a href={WA_LINK} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-full text-sm font-bold border border-neutral-500 hover:border-neutral-300">Book ad via WhatsApp</a>
            </div>
          </div>
          <div className="mt-5 grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl bg-neutral-800 border border-neutral-700 p-4">
              <p className="text-sm font-bold">Weekly Seller Ad</p>
              <p className="text-2xl font-extrabold mt-1" style={{ color: ORANGE }}>UGX 25,000</p>
              <p className="text-xs text-neutral-300 mt-2">7 days visibility, one category boost, weekly performance summary.</p>
            </div>
            <div className="rounded-xl bg-neutral-800 border border-neutral-700 p-4">
              <p className="text-sm font-bold">Monthly Seller Ad</p>
              <p className="text-2xl font-extrabold mt-1" style={{ color: ORANGE }}>UGX 50,000</p>
              <p className="text-xs text-neutral-300 mt-2">30 days visibility, priority placement, creative refresh support, monthly report.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Flash sale */}
      <section className="mx-auto max-w-7xl px-4 mt-10">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-extrabold flex items-center gap-2"><Zap size={22} style={{ color: ORANGE }} /> Flash Sale</h2>
            <div className="flex items-center gap-1 text-sm font-bold">
              {[hh, mm, ss].map((v, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span className="bg-neutral-900 text-white px-2 py-1 rounded-md tabular-nums">{v}</span>
                  {i < 2 && <span className="text-neutral-400">:</span>}
                </span>
              ))}
            </div>
          </div>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-neutral-200 h-80 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products?.map((p) => (
              <div key={p.id} className={`group bg-white rounded-2xl border overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all ${p.sellerVerified ? 'border-neutral-200 ring-1 ring-sky-100' : 'border-neutral-200'}`}>
                <div className="block relative bg-white">
                  <Link to={`/product/${p.slug}`}>
                    <img src={p.image} alt={p.name} className="w-full aspect-[4/3] object-contain bg-gray-50" loading="lazy" />
                  </Link>
                  {p.discount > 0 && (
                    <span className="absolute top-3 left-3 text-xs font-bold text-white px-2 py-1 rounded-full" style={{ background: ORANGE }}>−{p.discount}%</span>
                  )}
                  <button
                    onClick={(e) => { e.preventDefault(); toggleWish(p.id) }}
                    className="absolute top-3 right-3 bg-white/95 rounded-full p-1.5 shadow hover:scale-110 transition-transform"
                    title={wishlist.includes(p.id) ? 'Remove from wishlist' : 'Add to wishlist'}
                  >
                    <Heart size={16} className={wishlist.includes(p.id) ? 'text-red-500 fill-red-500' : 'text-gray-400'} />
                  </button>
                </div>
                <div className="p-4">
                  {p.sellerVerified ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full mb-1.5">
                      <BadgeCheck size={12} /> <Link to={`/seller/${p.sellerId}`} className="hover:underline">{p.sellerName}</Link>
                    </span>
                  ) : (
                    <span className="block text-[11px] text-neutral-400 mb-1.5"><Link to={`/seller/${p.sellerId}`} className="hover:underline">{p.sellerName}</Link></span>
                  )}
                  <Link to={`/product/${p.slug}`}><h3 className="text-sm font-medium leading-snug line-clamp-2 min-h-[2.6em] hover:text-orange-600">{p.name}</h3></Link>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-extrabold" style={{ color: ORANGE }}>{fmt(p.price)}</span>
                    {p.oldPrice && <span className="text-xs text-neutral-400 line-through">{fmt(p.oldPrice)}</span>}
                  </div>
                  <div className="mt-1.5 flex items-center gap-1 text-xs text-neutral-500">
                    <Star size={12} className="fill-amber-400 text-amber-400" /> {p.sellerRating.toFixed(1)}
                  </div>
                  <button
                    onClick={() => onAdd(p.id, p.name, p.price)}
                    className="mt-3 w-full flex items-center justify-center gap-2 text-sm font-bold text-white py-3 rounded-xl transition-colors shadow-sm active:scale-95"
                    style={{ background: added === p.id ? '#16a34a' : ORANGE }}>
                    {added === p.id ? <><Check size={16} /> Added to cart</> : <><ShoppingCart size={16} /> Add to cart</>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 mt-14">
        <h2 className="text-2xl font-extrabold mb-5 flex items-center gap-2"><Grid3X3 size={22} style={{ color: ORANGE }} /> Shop by Category</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          {homeTiles.map((slug) => {
            const Icon = categoryIcons[slug] ?? Grid3X3
            return (
              <Link key={slug} to={`/catalog?category=${slug}`} className="bg-white rounded-2xl border border-neutral-200 p-4 flex flex-col items-center text-center gap-2 hover:shadow-md hover:border-orange-200 transition-all">
                <span className="w-11 h-11 rounded-full grid place-items-center bg-orange-50"><Icon size={20} style={{ color: ORANGE }} /></span>
                <span className="text-sm font-semibold leading-tight">{categoryName(slug)}</span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Trust */}
      <section className="mx-auto max-w-7xl px-4 mt-14">
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { icon: Truck, t: 'Nationwide Delivery', d: 'Kampala same-day, upcountry in 1–3 days via boda & bus courier.' },
            { icon: Wallet, t: 'Pay Your Way', d: 'MTN MoMo, Airtel Money, or cash on delivery. No card needed.' },
            { icon: ShieldCheck, t: 'Buyer Protection', d: 'Full refund if your item is not as described. Verified sellers only.' },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="bg-white rounded-2xl border border-neutral-200 p-5 flex gap-4">
              <span className="w-11 h-11 shrink-0 rounded-full grid place-items-center bg-orange-50"><Icon size={20} style={{ color: ORANGE }} /></span>
              <div>
                <h3 className="font-bold text-sm">{t}</h3>
                <p className="text-sm text-neutral-600 mt-1">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Sell & earn */}
      <section className="mx-auto max-w-7xl px-4 mt-14">
        <div className="grid sm:grid-cols-2 gap-4">
          <Link to="/sell" className="group bg-neutral-900 text-white rounded-2xl p-6 flex items-center gap-5 hover:bg-neutral-800 transition-colors">
            <span className="w-12 h-12 shrink-0 rounded-full grid place-items-center" style={{ background: ORANGE }}><Store size={22} /></span>
            <div className="flex-1">
              <h3 className="font-extrabold">Sell on UG Souq</h3>
              <p className="text-sm text-neutral-300 mt-1">Open your shop in minutes. Free verification with your National ID — verified sellers rank first.</p>
            </div>
            <span className="text-neutral-500 group-hover:text-white transition-colors">→</span>
          </Link>
          <Link to="/affiliates" className="group bg-white rounded-2xl border border-neutral-200 p-6 flex items-center gap-5 hover:shadow-md transition-shadow">
            <span className="w-12 h-12 shrink-0 rounded-full grid place-items-center bg-orange-50"><Handshake size={22} style={{ color: ORANGE }} /></span>
            <div className="flex-1">
              <h3 className="font-extrabold">Earn as an affiliate</h3>
              <p className="text-sm text-neutral-600 mt-1">Share links, get up to 8% commission on every sale — paid monthly by MoMo. Free to join.</p>
            </div>
            <span className="text-neutral-300 group-hover:text-neutral-600 transition-colors">→</span>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
