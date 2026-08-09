import { Link, useSearchParams } from 'react-router-dom'
import { SearchX, BadgeCheck, Star, Clock, Plus } from 'lucide-react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { trpc } from '../providers/trpc'
import { useCart, fmt } from '../lib/cart'
import { ORANGE } from '../lib/site'

const SUGGESTIONS = ['iPhone', 'TV', 'dress', 'matooke', 'KFC', 'rolex', 'fridge', 'posho']

export default function SearchResults() {
  const [params] = useSearchParams()
  const q = (params.get('q') || '').trim()
  const { add } = useCart()
  const products = trpc.products.search.useQuery({ q }, { enabled: q.length > 0 })
  const restaurants = trpc.food.search.useQuery({ q }, { enabled: q.length > 0 })
  const loading = products.isLoading || restaurants.isLoading
  const pList = products.data ?? []
  const rList = restaurants.data ?? []

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-xl font-extrabold">
          {q ? <>Results for “<span style={{ color: ORANGE }}>{q}</span>”</> : 'Search UG Souq'}
        </h1>
        {q && !loading && (
          <p className="mt-1 text-sm text-neutral-500">
            {pList.length + rList.length} result{pList.length + rList.length === 1 ? '' : 's'} found
          </p>
        )}

        {loading && <p className="mt-10 text-neutral-500">Searching the market…</p>}

        {!loading && q && pList.length === 0 && rList.length === 0 && (
          <div className="mt-12 text-center">
            <SearchX size={48} className="mx-auto text-neutral-300" />
            <h2 className="mt-4 font-bold text-lg">Nothing found for “{q}” yet</h2>
            <p className="mt-1 text-sm text-neutral-500">Try one of these popular searches:</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <Link key={s} to={`/search?q=${encodeURIComponent(s)}`}
                  className="px-4 py-2 rounded-full bg-white border border-neutral-200 text-sm font-medium hover:border-neutral-400">
                  {s}
                </Link>
              ))}
            </div>
          </div>
        )}

        {pList.length > 0 && (
          <section className="mt-8">
            <h2 className="font-bold text-lg mb-4">Products ({pList.length})</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {pList.map((p) => (
                <div key={p.id} className={`bg-white rounded-2xl border p-3 flex flex-col ${p.sellerVerified ? 'border-sky-200 ring-1 ring-sky-100' : 'border-neutral-200'}`}>
                  <div className="relative">
                    <Link to={`/product/${p.slug}`}><img src={p.image} alt={p.name} className="w-full aspect-square object-cover rounded-xl bg-neutral-100" /></Link>
                    {p.discount > 0 && (
                      <span className="absolute top-2 left-2 text-[11px] font-bold text-white px-2 py-0.5 rounded-full" style={{ background: ORANGE }}>-{p.discount}%</span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-[11px] text-neutral-500">
                    {p.sellerVerified && <BadgeCheck size={13} className="text-sky-500 shrink-0" />}
                    <span className="truncate">{p.sellerName}</span>
                  </div>
                  <Link to={`/product/${p.slug}`}><p className="mt-1 text-sm font-semibold leading-snug line-clamp-2 hover:text-orange-600">{p.name}</p></Link>
                  <div className="mt-auto pt-2 flex items-center justify-between gap-2">
                    <div>
                      <p className="font-extrabold text-sm">{fmt(p.price)}</p>
                      {p.oldPrice && <p className="text-[11px] text-neutral-400 line-through">{fmt(p.oldPrice)}</p>}
                    </div>
                    <button
                      onClick={() => add({ itemType: 'product', itemId: p.id, name: p.name, price: p.price })}
                      className="w-9 h-9 rounded-full grid place-items-center text-white shrink-0"
                      style={{ background: ORANGE }}
                      aria-label={`Add ${p.name} to cart`}
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {rList.length > 0 && (
          <section className="mt-10">
            <h2 className="font-bold text-lg mb-4">Restaurants ({rList.length})</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rList.map((r) => (
                <Link key={r.id} to={`/food/${r.slug}`} className="bg-white rounded-2xl border border-neutral-200 overflow-hidden hover:shadow-md transition-shadow">
                  <img src={r.image} alt={r.name} className="w-full h-40 object-cover" />
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold">{r.name}</h3>
                      <span className="flex items-center gap-1 text-sm font-semibold"><Star size={14} className="text-amber-500" />{(r.rating / 10).toFixed(1)}</span>
                    </div>
                    <p className="text-sm text-neutral-500">{r.cuisine} · {r.area}</p>
                    <p className="mt-1 text-xs text-neutral-500 flex items-center gap-1"><Clock size={12} /> {r.deliveryMins} mins · Delivery {fmt(r.deliveryFee)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  )
}
