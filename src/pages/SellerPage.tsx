import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { trpc } from '@/providers/trpc'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useCart, fmt } from '../lib/cart'
import { ORANGE } from '../lib/site'
import { BadgeCheck, Star, Store, Phone, ShoppingCart, Check, ArrowLeft } from 'lucide-react'

export default function SellerPage() {
  const { id = '' } = useParams()
  const sellerId = Number(id)
  const { data, isLoading } = trpc.products.bySeller.useQuery({ sellerId }, { enabled: !!sellerId })
  const { add } = useCart()
  const [added, setAdded] = useState<number | null>(null)

  const onAdd = (p: { id: number; name: string; price: number; kind: 'product' | 'listing' }) => {
    add({ itemType: p.kind === 'listing' ? 'listing' : 'product', itemId: p.id, name: p.name, price: p.price })
    setAdded(p.id)
    setTimeout(() => setAdded(null), 1400)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex flex-col">
        <Header />
        <div className="flex-1 mx-auto w-full max-w-7xl px-4 py-10">
          <div className="h-40 rounded-2xl bg-white border border-neutral-200 animate-pulse mb-6" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-neutral-200 h-80 animate-pulse" />)}
          </div>
        </div>
      </div>
    )
  }

  const seller = data?.seller
  const items = data?.products ?? []

  if (!seller) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex flex-col">
        <Header />
        <div className="flex-1 mx-auto w-full max-w-3xl px-4 py-16 text-center">
          <Store size={40} className="mx-auto text-neutral-300" />
          <h1 className="mt-3 text-lg font-bold">Shop not found</h1>
          <p className="text-sm text-neutral-500 mt-1">This shop may have been removed.</p>
          <Link to="/catalog" className="inline-flex items-center gap-1.5 mt-5 text-sm font-bold px-4 py-2 rounded-full text-white" style={{ background: ORANGE }}>
            <ArrowLeft size={16} /> Browse the market
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#faf9f7] text-neutral-900 antialiased flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-4 sm:py-6">
        <Link to="/catalog" className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-800 mb-3">
          <ArrowLeft size={14} /> Back to market
        </Link>

        <div className="bg-white rounded-2xl border border-neutral-200 p-5 sm:p-6 mb-6">
          <div className="flex items-center gap-4">
            <span className="w-14 h-14 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: ORANGE }}>
              <Store size={26} />
            </span>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-extrabold flex items-center gap-2 flex-wrap">
                {seller.shopName}
                {seller.verified && <BadgeCheck size={18} className="text-sky-600" />}
              </h1>
              <p className="text-xs text-neutral-500 mt-1 flex items-center gap-2 flex-wrap">
                {seller.district && <span className="inline-flex items-center gap-1"><Store size={11} /> {seller.district}</span>}
                <span className="inline-flex items-center gap-1"><Star size={11} className="fill-amber-400 text-amber-400" /> {seller.rating.toFixed(1)} rating</span>
                {seller.verified && <span className="text-sky-700">· Verified seller</span>}
              </p>
            </div>
            <a href={'tel:' + seller.phone} className="text-xs font-bold px-3.5 py-2 rounded-full border-2 shrink-0 inline-flex items-center gap-1.5" style={{ borderColor: ORANGE, color: ORANGE }}>
              <Phone size={14} /> Call
            </a>
          </div>
        </div>

        <h2 className="text-base font-bold mb-4 flex items-center gap-2">
          <Store size={18} style={{ color: ORANGE }} /> {items.length} item{items.length === 1 ? '' : 's'} in this shop
        </h2>

        {items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center">
            <Store size={32} className="mx-auto text-neutral-300" />
            <p className="text-sm text-neutral-500 mt-2">This shop has no live listings right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((p) => (
              <div key={p.kind + '-' + p.id} className="group bg-white rounded-2xl border border-neutral-200 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all">
                <div className="block relative bg-white">
                  {p.kind === 'product' ? (
                    <Link to={'/product/' + p.slug}>
                      <img src={p.image} alt={p.name} className="w-full aspect-[4/3] object-contain bg-white" />
                      {p.discount > 0 && (
                        <span className="absolute top-3 left-3 text-[11px] font-bold text-white px-2 py-0.5 rounded-full" style={{ background: ORANGE }}>{'-' + p.discount + '%'}</span>
                      )}
                    </Link>
                  ) : (
                    <>
                      <img src={p.image} alt={p.name} className="w-full aspect-[4/3] object-contain bg-white" />
                      {p.discount > 0 && (
                        <span className="absolute top-3 left-3 text-[11px] font-bold text-white px-2 py-0.5 rounded-full" style={{ background: ORANGE }}>{'-' + p.discount + '%'}</span>
                      )}
                    </>
                  )}
                </div>
                <div className="p-4">
                  {p.kind === 'product' ? (
                    <Link to={'/product/' + p.slug}><h3 className="text-sm font-medium leading-snug line-clamp-2 min-h-[2.6em] hover:text-orange-600">{p.name}</h3></Link>
                  ) : (
                    <h3 className="text-sm font-medium leading-snug line-clamp-2 min-h-[2.6em]">{p.name}</h3>
                  )}
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-extrabold" style={{ color: ORANGE }}>{fmt(p.price)}</span>
                    {p.oldPrice && <span className="text-xs text-neutral-400 line-through">{fmt(p.oldPrice)}</span>}
                  </div>
                  <button
                    onClick={() => onAdd(p)}
                    className="mt-3 w-full flex items-center justify-center gap-2 text-sm font-bold text-white py-2.5 rounded-xl transition-colors shadow-sm active:scale-95"
                    style={{ background: added === p.id ? '#16a34a' : ORANGE }}>
                    {added === p.id ? <><Check size={16} /> Added to cart</> : <><ShoppingCart size={16} /> Add to cart</>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
