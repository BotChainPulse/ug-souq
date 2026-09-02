import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { trpc } from '@/providers/trpc'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useCart, fmt } from '../lib/cart'
import { DELIVERY_ZONES, RETURN_POLICY, PICKUP_STATIONS } from '../lib/delivery'
import { categoryName } from '../lib/categories'
import { ORANGE } from '../lib/site'
import {
  BadgeCheck, ShoppingCart, Check, Star, Package, Truck, RotateCcw,
  Phone, Store, ChevronRight, MapPin, Zap,
} from 'lucide-react'

export default function ProductDetailPage() {
  const { slug = '' } = useParams()
  const { data: p, isLoading } = trpc.products.bySlug.useQuery({ slug })
  const { add } = useCart()
  const [added, setAdded] = useState(false)
  const [zoneId, setZoneId] = useState('kampala')
  const zone = DELIVERY_ZONES.find((z) => z.id === zoneId) ?? DELIVERY_ZONES[0]

  // Related items from the same category
  const { data: related } = trpc.products.browse.useQuery(
    { category: p?.category },
    { enabled: !!p },
  )
  const alsoViewed = useMemo(
    () => (related ?? []).filter((r) => r.slug !== slug && r.kind === 'product').slice(0, 6),
    [related, slug],
  )

  const onAdd = () => {
    if (!p) return
    add({ itemType: p.kind, itemId: p.id, name: p.name, price: p.price, image: p.image, sellerId: p.sellerId, sellerName: p.sellerName })
    setAdded(true)
    setTimeout(() => setAdded(false), 1400)
  }

  return (
    <div className="min-h-screen bg-[#faf9f7] text-neutral-900 antialiased flex flex-col">
      <Header />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-4 sm:py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-xs sm:text-sm text-neutral-500 mb-4 overflow-x-auto whitespace-nowrap">
          <Link to="/" className="hover:text-neutral-800">Home</Link>
          <ChevronRight size={13} />
          {p && (
            <>
              <Link to={`/catalog?category=${p.category}`} className="hover:text-neutral-800">{categoryName(p.category)}</Link>
              <ChevronRight size={13} />
            </>
          )}
          <span className="text-neutral-800 font-medium truncate max-w-[50vw]">{p?.name ?? 'Product'}</span>
        </nav>

        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-neutral-200 aspect-square animate-pulse" />
            <div className="space-y-3">
              <div className="h-6 bg-neutral-200 rounded animate-pulse w-3/4" />
              <div className="h-8 bg-neutral-200 rounded animate-pulse w-1/3" />
              <div className="h-40 bg-white border border-neutral-200 rounded-2xl animate-pulse" />
            </div>
          </div>
        ) : !p ? (
          <div className="bg-white rounded-2xl border border-neutral-200 p-10 text-center">
            <p className="font-bold text-lg">Product not found</p>
            <p className="text-sm text-neutral-500 mt-1">It may have been removed by the seller.</p>
            <Link to="/catalog" className="inline-block mt-4 text-sm font-bold text-white px-5 py-2.5 rounded-full" style={{ background: ORANGE }}>Browse all products</Link>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 gap-6 lg:gap-10">
              {/* Image */}
              <div className="bg-white rounded-2xl border border-neutral-200 p-4 sm:p-6 relative self-start">
                <img src={p.image} alt={p.name} className="w-full aspect-square object-contain" />
                {p.discount > 0 && (
                  <span className="absolute top-4 left-4 text-sm font-bold text-white px-2.5 py-1 rounded-full" style={{ background: ORANGE }}>−{p.discount}%</span>
                )}
              </div>

              {/* Info */}
              <div>
                <h1 className="text-lg sm:text-2xl font-bold leading-snug">{p.name}</h1>

                {/* Seller line */}
                <div className="mt-2 flex items-center gap-2 text-sm flex-wrap">
                  <span className="text-neutral-500">Sold by</span>
                  {p.sellerVerified ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full text-xs">
                      <BadgeCheck size={13} /> <Link to={`/seller/${p.sellerId}`} className="hover:underline">{p.sellerName}</Link>
                    </span>
                  ) : (
                    <span className="font-medium"><Link to={`/seller/${p.sellerId}`} className="hover:underline">{p.sellerName}</Link></span>
                  )}
                  <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-semibold">
                    <Star size={13} fill="currentColor" /> {p.sellerRating.toFixed(1)} seller rating
                  </span>
                </div>

                {/* Price */}
                <div className="mt-4 flex items-baseline gap-3 flex-wrap">
                  <span className="text-2xl sm:text-3xl font-extrabold" style={{ color: ORANGE }}>{fmt(p.price)}</span>
                  {p.oldPrice && <span className="text-sm text-neutral-400 line-through">{fmt(p.oldPrice)}</span>}
                  {p.flashSale && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-white px-2 py-1 rounded-full bg-red-500">
                      <Zap size={12} /> Flash sale
                    </span>
                  )}
                </div>
                {p.stock <= 10 && p.stock > 0 && <p className="mt-1 text-xs font-semibold text-amber-700">Few units left — order soon</p>}
                {p.stock === 0 && <p className="mt-1 text-xs font-semibold text-red-600">Out of stock</p>}
                {p.condition !== 'new' && (
                  <p className="mt-1 text-xs text-neutral-500">
                    Condition: {p.condition}{p.warrantyMonths > 0 ? ` · ${p.warrantyMonths} months warranty` : ''}
                  </p>
                )}

                {/* Actions */}
                <div className="mt-5 flex gap-3">
                  <button
                    onClick={onAdd}
                    disabled={p.stock === 0}
                    className="flex-1 flex items-center justify-center gap-2 font-bold text-white py-3.5 rounded-xl text-sm sm:text-base transition-colors disabled:opacity-50"
                    style={{ background: added ? '#16a34a' : ORANGE }}
                  >
                    {added ? <><Check size={18} /> Added to cart</> : <><ShoppingCart size={18} /> Add to Cart</>}
                  </button>
                  <a
                    href={`tel:${p.sellerPhone}`}
                    className="w-14 flex items-center justify-center rounded-xl border-2 font-bold"
                    style={{ borderColor: ORANGE, color: ORANGE }}
                    title={`Call ${p.sellerName}`}
                  >
                    <Phone size={20} />
                  </a>
                </div>

                {/* Delivery & returns — Jumia style */}
                <div className="mt-6 bg-white rounded-2xl border border-neutral-200 p-4 sm:p-5">
                  <h2 className="font-bold text-sm mb-3">Delivery &amp; Returns</h2>

                  <label className="block text-xs font-semibold text-neutral-500 mb-1">Deliver to</label>
                  <div className="relative mb-4">
                    <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <select
                      value={zoneId}
                      onChange={(e) => setZoneId(e.target.value)}
                      className="w-full appearance-none border border-neutral-300 rounded-xl pl-9 pr-8 py-2.5 text-sm font-medium bg-white focus:outline-none focus:border-orange-400"
                    >
                      {DELIVERY_ZONES.map((z) => <option key={z.id} value={z.id}>{z.label}</option>)}
                    </select>
                  </div>

                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <Package size={20} className="shrink-0 mt-0.5" style={{ color: ORANGE }} />
                      <div className="flex-1">
                        <p className="text-sm font-semibold">Pickup Station <span className="float-right font-bold">{fmt(zone.pickupFee)}</span></p>
                        <p className="text-xs text-neutral-500 mt-0.5">{PICKUP_STATIONS[zone.id]}</p>
                        <p className="text-xs text-neutral-500">{zone.pickupEta}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Truck size={20} className="shrink-0 mt-0.5" style={{ color: ORANGE }} />
                      <div className="flex-1">
                        <p className="text-sm font-semibold">Door Delivery <span className="float-right font-bold">{fmt(zone.doorFee)}</span></p>
                        <p className="text-xs text-neutral-500 mt-0.5">{zone.doorEta} — covers {zone.areas.slice(0, 5).join(', ')}{zone.areas.length > 5 ? ' & more' : ''}</p>
                      </div>
                    </div>
                    <div className="flex gap-3 border-t border-neutral-100 pt-4">
                      <RotateCcw size={20} className="shrink-0 mt-0.5 text-emerald-600" />
                      <div>
                        <p className="text-sm font-semibold">Return Policy</p>
                        <p className="text-xs text-neutral-500 mt-0.5">{RETURN_POLICY} <Link to="/returns" className="underline font-medium">Details</Link></p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Seller card */}
                <div className="mt-4 bg-white rounded-2xl border border-neutral-200 p-4 sm:p-5">
                  <h2 className="font-bold text-sm mb-3">Seller Information</h2>
                  <div className="flex items-center gap-3">
                    <span className="w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: ORANGE }}>
                      <Store size={20} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm flex items-center gap-1.5">
                        <Link to={`/seller/${p.sellerId}`} className="hover:underline">{p.sellerName}</Link>
                        {p.sellerVerified && <BadgeCheck size={15} className="text-sky-600" />}
                      </p>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {p.sellerDistrict ? `${p.sellerDistrict} · ` : ''}
                        <Star size={11} className="inline text-amber-500 -mt-0.5" fill="currentColor" /> {p.sellerRating.toFixed(1)} rating
                        {p.sellerVerified ? ' · Verified seller' : ''}
                      </p>
                    </div>
                    <a href={`tel:${p.sellerPhone}`} className="text-xs font-bold px-3.5 py-2 rounded-full border-2 shrink-0" style={{ borderColor: ORANGE, color: ORANGE }}>
                      Call
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Customers also viewed */}
            {alsoViewed.length > 0 && (
              <section className="mt-10">
                <h2 className="font-extrabold text-lg mb-4">Customers also viewed</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {alsoViewed.map((r) => (
                    <Link key={r.id} to={`/product/${r.slug}`} className="bg-white rounded-2xl border border-neutral-200 overflow-hidden hover:shadow-md transition-shadow">
                      <img src={r.image} alt={r.name} className="w-full aspect-square object-cover" loading="lazy" />
                      <div className="p-3">
                        <p className="text-xs font-medium leading-snug line-clamp-2 min-h-[2.4em]">{r.name}</p>
                        <p className="mt-1 text-sm font-extrabold" style={{ color: ORANGE }}>{fmt(r.price)}</p>
                        {r.oldPrice ? <p className="text-[11px] text-neutral-400 line-through">{fmt(r.oldPrice)}</p> : null}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  )
}
