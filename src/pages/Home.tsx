import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Heart, Store, BadgePercent, Grid3X3, Smartphone, Cpu, Refrigerator, Armchair, Shirt, Sparkles, Tractor, Sun, Wrench, Footprints, GraduationCap, Dumbbell, Baby, Gamepad2, Dog, Apple, Bike, BookOpen, UtensilsCrossed, Timer, Send, Leaf, Recycle, Wallet, Zap, Star, Truck, ShieldCheck, Home as HomeIcon, BadgeCheck, ShoppingCart, Check, UserRound } from 'lucide-react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { trpc } from '@/providers/trpc'
import { fmt, useCart } from '../lib/cart'
import { ORANGE } from '../lib/site'
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

const homeTiles = ['phones', 'electronics', 'appliances', 'home', 'womens-fashion', 'mens-fashion', 'beauty', 'grocery', 'agriculture', 'solar', 'sports', 'baby']

function useCountdown() {
  const [t, setT] = useState(16 * 3600 + 23 * 60 + 49)
  useEffect(() => {
    const id = setInterval(() => setT((s) => (s > 0 ? s - 1 : 16 * 3600 + 23 * 60 + 49)), 1000)
    return () => clearInterval(id)
  }, [])
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0'))
}

export default function HomePage() {
  const [hh, mm, ss] = useCountdown()
  const { data: products, isLoading } = trpc.products.flashSale.useQuery()
  const { data: groceryProducts, isLoading: groceriesLoading } = trpc.products.homepageGroceries.useQuery()
  const { add } = useCart()
  const [wishlist, setWishlist] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('wishlist') || '[]') } catch { return [] } })
  const [added, setAdded] = useState<number | null>(null)
  const toggleWish = (id: string | number) => {
    const key = String(id)
    const next = wishlist.includes(key) ? wishlist.filter((w) => w !== key) : [...wishlist, key]
    setWishlist(next); localStorage.setItem('wishlist', JSON.stringify(next))
  }
  const onAdd = (id: number, name: string, price: number) => {
    add({ itemType: 'product', itemId: id, name, price }); setAdded(id); setTimeout(() => setAdded(null), 1200)
  }

  return (
    <div className="min-h-screen bg-[#f6f7f6] pb-16 text-neutral-900 antialiased sm:pb-0">
      <Header />

      <div className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-3 py-2.5 [scrollbar-width:none] sm:px-4">
          {services.map(({ icon: Icon, label, tag, to }) => (
            <Link key={label} to={to} className="flex shrink-0 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-bold transition hover:border-emerald-300 hover:bg-emerald-50 sm:text-sm">
              <Icon size={16} style={{ color: ORANGE }} /> {label}
              {tag && <span className="rounded-full bg-emerald-700 px-1.5 py-0.5 text-[9px] text-white">{tag}</span>}
            </Link>
          ))}
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-3 pt-3 sm:px-4 sm:pt-6">
        <div className="relative overflow-hidden rounded-2xl bg-emerald-950 text-white">
          <img src="/images/hero.jpg" alt="Shopping on UG Souq" className="h-44 w-full object-cover opacity-55 sm:h-72" />
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-950 via-emerald-950/75 to-transparent" />
          <div className="absolute inset-0 flex max-w-lg flex-col justify-center p-5 sm:p-8">
            <span className="w-fit rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">Proudly Ugandan</span>
            <h1 className="mt-2 text-2xl font-extrabold leading-tight sm:text-4xl">Uganda's market,<br />in your pocket.</h1>
            <p className="mt-2 max-w-sm text-xs text-emerald-50 sm:text-sm">Shop trusted sellers, pay your way and get delivery across Uganda.</p>
            <div className="mt-3 flex gap-2"><Link to="/catalog?deals=1" className="rounded-lg bg-white px-3 py-2 text-xs font-extrabold text-emerald-900">Shop deals</Link><Link to="/plus" className="rounded-lg bg-[#c99700] px-3 py-2 text-xs font-extrabold text-white">UG Souq Plus</Link></div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-3 pt-5 sm:px-4">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-extrabold sm:text-2xl">Shop by category</h2><Link to="/catalog" className="text-xs font-bold text-emerald-700">View all →</Link></div>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12">
          {homeTiles.map((slug) => { const Icon = categoryIcons[slug] ?? Grid3X3; return (
            <Link key={slug} to={`/catalog?category=${slug}`} className="min-w-0 text-center">
              <span className="mx-auto grid aspect-square w-full max-w-20 place-items-center rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200"><Icon size={23} className="text-emerald-700" /></span>
              <span className="mt-1.5 block truncate text-[10px] font-semibold sm:text-xs">{categoryName(slug)}</span>
            </Link>
          )})}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-3 pt-6 sm:px-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2"><h2 className="flex shrink-0 items-center gap-1.5 text-xl font-extrabold sm:text-2xl"><Zap size={21} className="text-emerald-700" /> Flash Sale</h2><div className="flex items-center gap-0.5 text-xs font-bold">{[hh, mm, ss].map((v, i) => <span key={i} className="flex items-center gap-0.5"><span className="rounded bg-neutral-900 px-1.5 py-1 text-white tabular-nums">{v}</span>{i < 2 && <span className="text-neutral-400">:</span>}</span>)}</div></div>
          <Link to="/catalog?deals=1" className="shrink-0 text-xs font-bold text-emerald-700">View all →</Link>
        </div>
        {isLoading ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">{[...Array(8)].map((_, i) => <div key={i} className="h-64 animate-pulse rounded-xl bg-white" />)}</div> : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
            {products?.map((p) => (
              <article key={p.id} className="group overflow-hidden rounded-xl border border-neutral-200 bg-white transition hover:shadow-md">
                <div className="relative bg-neutral-50"><Link to={`/product/${p.slug}`}><img src={p.image} alt={p.name} className="aspect-square w-full object-contain" loading="lazy" /></Link>
                  {p.discount > 0 && <span className="absolute left-2 top-2 rounded-md bg-emerald-700 px-1.5 py-1 text-[10px] font-extrabold text-white">−{p.discount}%</span>}
                  <button onClick={(e) => { e.preventDefault(); toggleWish(p.id) }} className="absolute right-2 top-2 rounded-full bg-white p-1.5 shadow"><Heart size={15} className={wishlist.includes(String(p.id)) ? 'fill-red-500 text-red-500' : 'text-neutral-500'} /></button>
                </div>
                <div className="p-2.5 sm:p-3">
                  <span className="block truncate text-[10px] font-semibold text-emerald-700">{p.sellerVerified && <BadgeCheck size={11} className="mr-1 inline" />}{p.sellerName}</span>
                  <Link to={`/product/${p.slug}`}><h3 className="mt-1 line-clamp-2 min-h-[2.4em] text-xs font-semibold leading-snug sm:text-sm">{p.name}</h3></Link>
                  <div className="mt-1.5"><span className="text-sm font-extrabold sm:text-base">{fmt(p.price)}</span>{p.oldPrice && <span className="ml-1.5 text-[10px] text-neutral-400 line-through">{fmt(p.oldPrice)}</span>}</div>
                  <div className="mt-1 flex items-center justify-between"><span className="flex items-center gap-1 text-[10px] text-neutral-500"><Star size={11} className="fill-amber-400 text-amber-400" />{p.sellerRating.toFixed(1)}</span><button onClick={() => onAdd(p.id, p.name, p.price)} aria-label="Add to cart" className="grid h-8 w-8 place-items-center rounded-lg text-white active:scale-95" style={{ background: ORANGE }}>{added === p.id ? <Check size={15} /> : <ShoppingCart size={15} />}</button></div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-3 pt-6 sm:px-4">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div><h2 className="text-xl font-extrabold sm:text-2xl">Everyday essentials</h2><p className="mt-0.5 text-xs text-neutral-500">Popular household staples at everyday prices</p></div>
          <Link to="/catalog?category=grocery" className="shrink-0 text-xs font-bold text-emerald-700">View all →</Link>
        </div>
        {groceriesLoading ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">{[...Array(6)].map((_, i) => <div key={i} className="h-64 animate-pulse rounded-xl bg-white" />)}</div> : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
            {groceryProducts?.map((p) => (
              <article key={p.id} className="group overflow-hidden rounded-xl border border-neutral-200 bg-white transition hover:shadow-md">
                <div className="relative bg-neutral-50"><Link to={`/product/${p.slug}`}><img src={p.image} alt={p.name} className="aspect-square w-full object-contain" loading="lazy" /></Link>
                  {p.discount > 0 && <span className="absolute left-2 top-2 rounded-md bg-emerald-700 px-1.5 py-1 text-[10px] font-extrabold text-white">−{p.discount}%</span>}
                  <button onClick={(e) => { e.preventDefault(); toggleWish(p.id) }} className="absolute right-2 top-2 rounded-full bg-white p-1.5 shadow" aria-label={wishlist.includes(String(p.id)) ? `Remove ${p.name} from wishlist` : `Add ${p.name} to wishlist`}><Heart size={15} className={wishlist.includes(String(p.id)) ? 'fill-red-500 text-red-500' : 'text-neutral-500'} /></button>
                </div>
                <div className="p-2.5 sm:p-3">
                  <span className="block truncate text-[10px] font-semibold text-emerald-700">{p.sellerVerified && <BadgeCheck size={11} className="mr-1 inline" />}{p.sellerName}</span>
                  <Link to={`/product/${p.slug}`}><h3 className="mt-1 line-clamp-2 min-h-[2.4em] text-xs font-semibold leading-snug sm:text-sm">{p.name}</h3></Link>
                  <div className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5"><span className="text-sm font-extrabold sm:text-base">{fmt(p.price)}</span>{p.oldPrice && <span className="text-[10px] text-neutral-400 line-through">{fmt(p.oldPrice)}</span>}</div>
                  <div className="mt-1 flex items-center justify-between"><span className="flex items-center gap-1 text-[10px] text-neutral-500"><Star size={11} className="fill-amber-400 text-amber-400" />{p.sellerRating.toFixed(1)}</span><button onClick={() => onAdd(p.id, p.name, p.price)} aria-label={`Add ${p.name} to cart`} className="grid h-8 w-8 place-items-center rounded-lg text-white active:scale-95" style={{ background: ORANGE }}>{added === p.id ? <Check size={15} /> : <ShoppingCart size={15} />}</button></div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-3 pt-6 sm:px-4"><div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white"><BadgeCheck size={18} className="text-emerald-700" /></span><div className="min-w-0 flex-1"><h3 className="text-sm font-bold text-emerald-950">Shop verified sellers</h3><p className="text-xs text-emerald-800/80">ID-checked sellers and buyer protection help you shop with confidence.</p></div><Link to="/verification" className="shrink-0 text-xs font-bold text-emerald-700">Learn more →</Link></div></section>

      <section className="mx-auto max-w-7xl px-3 py-7 sm:px-4"><div className="grid gap-3 sm:grid-cols-3">{[
        { icon: Truck, t: 'Nationwide Delivery', d: 'Kampala and upcountry delivery options.' },
        { icon: Wallet, t: 'Pay Your Way', d: 'MTN MoMo, Airtel Money or cash on delivery.' },
        { icon: ShieldCheck, t: 'Buyer Protection', d: 'Protection on every eligible order.' },
      ].map(({ icon: Icon, t, d }) => <div key={t} className="flex gap-3 rounded-xl bg-white p-4 ring-1 ring-neutral-200"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-50"><Icon size={18} className="text-emerald-700" /></span><div><h3 className="text-sm font-bold">{t}</h3><p className="mt-0.5 text-xs text-neutral-600">{d}</p></div></div>)}</div></section>

      <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-neutral-200 bg-white px-2 py-1.5 sm:hidden">
        <Link to="/" className="flex flex-col items-center gap-0.5 text-[10px] font-bold text-emerald-700"><HomeIcon size={21} />Home</Link>
        <Link to="/catalog" className="flex flex-col items-center gap-0.5 text-[10px] font-medium text-neutral-600"><Grid3X3 size={21} />Categories</Link>
        <Link to="/account" className="flex flex-col items-center gap-0.5 text-[10px] font-medium text-neutral-600"><UserRound size={21} />Account</Link>
        <Link to="/cart" className="flex flex-col items-center gap-0.5 text-[10px] font-medium text-neutral-600"><ShoppingCart size={21} />Cart</Link>
      </div>
      <Footer />
    </div>
  )
}
