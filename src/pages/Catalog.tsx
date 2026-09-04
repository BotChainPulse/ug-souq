import {useState,  useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import {Heart,  BadgeCheck, Check, MessageCircle, RefreshCcw, ShoppingCart, Star, Store, Timer } from 'lucide-react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { trpc } from '@/providers/trpc'
import { fmt, useCart } from '../lib/cart'
import { ORANGE, WHATSAPP_INTL } from '../lib/site'
import { CATEGORIES, categoryName } from '../lib/categories'

export default function Catalog() {
  const [params, setParams] = useSearchParams()
  const category = params.get('category') ?? undefined
  const condition = (params.get('condition') ?? undefined) as 'new' | 'refurbished' | 'used' | undefined
  const deals = params.get('deals') === '1'
  const titleParam = params.get('title')

  const title = useMemo(() => {
    if (titleParam) return titleParam
    if (deals) return "Today's Deals"
    if (condition === 'refurbished') return 'Refurbished Tech'
    if (category) return categoryName(category)
    return 'Super Mall — All Products'
  }, [titleParam, deals, condition, category])

  const { data: items, isLoading } = trpc.products.browse.useQuery({ category, condition, deals })
  const { add } = useCart()
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('wishlist') || '[]') } catch { return [] }
  })
  const toggleWish = (id: string) => {
    const next = wishlist.includes(id) ? wishlist.filter(w => w !== id) : [...wishlist, id]
    setWishlist(next)
    localStorage.setItem('wishlist', JSON.stringify(next))
  }
  const [added, setAdded] = useState<string | null>(null)

  const setFilter = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    next.delete('title')
    setParams(next)
  }

  return (
    <div className="min-h-screen bg-[#faf9f7] text-neutral-900 antialiased">
      <Header />

      <div className="mx-auto max-w-7xl px-4 py-8">
        <nav className="text-xs text-neutral-500 mb-2">
          <Link to="/" className="hover:text-neutral-800">Home</Link> / <span className="text-neutral-800 font-medium">{title}</span>
        </nav>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
            {deals ? <Timer size={24} style={{ color: ORANGE }} /> : <Store size={24} style={{ color: ORANGE }} />}
            {title}
          </h1>
          {items && <span className="text-sm text-neutral-500">{items.length} item{items.length === 1 ? '' : 's'}</span>}
        </div>

        {/* Filter bar */}
        <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setFilter('category', null)}
            className={`px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap border transition-colors ${!category ? 'text-white border-transparent' : 'bg-white border-neutral-200 hover:border-neutral-400'}`}
            style={!category ? { background: ORANGE } : undefined}
          >
            All categories
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.slug}
              onClick={() => setFilter('category', c.slug)}
              className={`px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap border transition-colors ${category === c.slug ? 'text-white border-transparent' : 'bg-white border-neutral-200 hover:border-neutral-400'}`}
              style={category === c.slug ? { background: ORANGE } : undefined}
            >
              {c.name}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
          <button
            onClick={() => setFilter('deals', deals ? null : '1')}
            className={`px-3 py-1.5 rounded-full border ${deals ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-white border-neutral-200 text-neutral-600'}`}
          >
            Deals only
          </button>
          <button
            onClick={() => setFilter('condition', condition === 'refurbished' ? null : 'refurbished')}
            className={`px-3 py-1.5 rounded-full border inline-flex items-center gap-1 ${condition === 'refurbished' ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-white border-neutral-200 text-neutral-600'}`}
          >
            <RefreshCcw size={12} /> Refurbished
          </button>
          <button
            onClick={() => setFilter('condition', condition === 'used' ? null : 'used')}
            className={`px-3 py-1.5 rounded-full border ${condition === 'used' ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-white border-neutral-200 text-neutral-600'}`}
          >
            Used / Second-hand
          </button>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-neutral-200 h-80 animate-pulse" />)}
          </div>
        ) : items && items.length > 0 ? (
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((p) => {
              const key = `${p.kind}-${p.id}`
              return (
                <div key={key} className="group bg-white rounded-2xl border border-neutral-200 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all">
                  <div className="relative bg-white">
                    {p.kind === 'product' ? (
                      <Link to={`/product/${p.slug}`}><img src={p.image} alt={p.name} className="w-full aspect-[4/3] object-contain bg-gray-50" loading="lazy" /></Link>
                    ) : (
                      <img src={p.image} alt={p.name} className="w-full aspect-[4/3] object-contain bg-gray-50" loading="lazy" />
                    )}
                    {p.discount > 0 && (
                      <span className="absolute top-3 left-3 text-xs font-bold text-white px-2 py-1 rounded-full" style={{ background: ORANGE }}>−{p.discount}%</span>
                    )}
                    {p.condition !== 'new' && (
                      <span className="absolute bottom-3 left-3 text-[11px] font-bold px-2 py-1 rounded-full bg-neutral-900/85 text-white inline-flex items-center gap-1">
                        <RefreshCcw size={11} /> {p.condition === 'refurbished' ? `Refurb · ${p.warrantyMonths}mo warranty` : 'Used'}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleWish(key)}
                      aria-label={wishlist.includes(key) ? `Remove ${p.name} from wishlist` : `Add ${p.name} to wishlist`}
                      aria-pressed={wishlist.includes(key)}
                      className="absolute top-3 right-3 bg-white/95 rounded-full p-2 shadow hover:bg-white transition-colors"
                      title={wishlist.includes(key) ? 'Remove from wishlist' : 'Add to wishlist'}
                    >
                      <Heart
                        size={18}
                        className={wishlist.includes(key) ? 'fill-red-500 text-red-500' : 'text-neutral-600'}
                      />
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
                    {p.kind === 'product' ? (
                      <Link to={`/product/${p.slug}`}><h3 className="text-sm font-medium leading-snug line-clamp-2 min-h-[2.6em] hover:text-orange-600">{p.name}</h3></Link>
                    ) : (
                      <h3 className="text-sm font-medium leading-snug line-clamp-2 min-h-[2.6em]">{p.name}</h3>
                    )}
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="font-extrabold" style={{ color: ORANGE }}>{fmt(p.price)}</span>
                      {p.oldPrice && <span className="text-xs text-neutral-400 line-through">{fmt(p.oldPrice)}</span>}
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-neutral-500"><Star size={12} className="text-amber-500" fill="currentColor" /> {'sellerRating' in p ? Number(p.sellerRating).toFixed(1) : 'Verified'} seller {p.stock > 0 ? '· In stock' : '· Out of stock'}</p>
                    {p.kind === 'product' ? (
                      <button
                        onClick={() => {
                          add({ itemType: 'product', itemId: p.id, name: p.name, price: p.price, image: p.image, sellerId: p.sellerId, sellerName: p.sellerName })
                          setAdded(key)
                          setTimeout(() => setAdded(null), 1200)
                        }}
                        className="mt-3 w-full flex items-center justify-center gap-2 text-sm font-bold text-white py-3 rounded-xl transition-colors shadow-sm active:scale-95"
                        style={{ background: added === key ? '#16a34a' : ORANGE }}
                      >
                        {added === key ? <><Check size={14} /> Added</> : <><ShoppingCart size={14} /> Add to cart</>}
                      </button>
                    ) : (
                      <a
                        href={`https://wa.me/${WHATSAPP_INTL}?text=${encodeURIComponent(`Hi UG Souq, I want to buy: ${p.name} (${fmt(p.price)}) from ${p.sellerName}`)}`}
                        target="_blank" rel="noreferrer"
                        className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs font-bold text-white py-2.5 rounded-full bg-green-600 hover:bg-green-700 transition-colors"
                      >
                        <MessageCircle size={14} /> Buy via WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="mt-10 bg-white rounded-2xl border border-neutral-200 p-10 text-center">
            <Star size={28} className="mx-auto text-neutral-300" />
            <h3 className="mt-3 font-extrabold">Nothing here yet</h3>
            <p className="mt-1 text-sm text-neutral-500 max-w-md mx-auto">
              Sellers are stocking this section. Are you a seller?{' '}
              <Link to="/sell/listings" className="font-bold underline" style={{ color: ORANGE }}>List your item →</Link>
            </p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}

