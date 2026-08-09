import { useParams, Link } from 'react-router-dom'
import { Star, Clock, Bike, Plus, Check, ChevronLeft, Flame } from 'lucide-react'
import { useState } from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { trpc } from '@/providers/trpc'
import { fmt, useCart } from '../lib/cart'
import { ORANGE } from '../lib/site'

export default function Restaurant() {
  const { slug } = useParams<{ slug: string }>()
  const { data: r, isLoading } = trpc.food.restaurant.useQuery({ slug: slug ?? '' })
  const { add } = useCart()
  const [added, setAdded] = useState<number | null>(null)

  const onAdd = (id: number, name: string, price: number) => {
    add({ itemType: 'menu_item', itemId: id, name, price })
    setAdded(id)
    setTimeout(() => setAdded(null), 1200)
  }

  return (
    <div className="min-h-screen bg-[#faf9f7] text-neutral-900 antialiased">
      <Header />
      <div className="mx-auto max-w-4xl px-4 py-6">
        <Link to="/food" className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-500 hover:text-neutral-800"><ChevronLeft size={16} /> All restaurants</Link>

        {isLoading ? (
          <div className="mt-4 h-64 bg-white rounded-2xl border border-neutral-200 animate-pulse" />
        ) : !r ? (
          <p className="mt-10 text-center text-neutral-500">Restaurant not found.</p>
        ) : (
          <>
            <div className="mt-4 bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <img src={r.image} alt={r.name} className="w-full aspect-[3/1] object-cover" />
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h1 className="text-2xl font-extrabold">{r.name}</h1>
                    <p className="text-sm text-neutral-500 mt-0.5">{r.cuisine} · {r.area}</p>
                  </div>
                  <span className="flex items-center gap-1 font-bold"><Star size={16} className="fill-amber-400 text-amber-400" /> {(r.rating / 10).toFixed(1)}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-neutral-600">
                  <span className="flex items-center gap-1.5"><Clock size={15} /> {r.deliveryMins} min delivery</span>
                  <span className="flex items-center gap-1.5"><Bike size={15} /> {r.deliveryFee === 0 ? 'Free delivery' : fmt(r.deliveryFee)}</span>
                  <span>Min order {fmt(r.minOrder)}</span>
                </div>
              </div>
            </div>

            <h2 className="mt-8 mb-4 font-extrabold text-lg">Menu</h2>
            <div className="grid sm:grid-cols-2 gap-3 mb-8">
              {r.items.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl border border-neutral-200 p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm flex items-center gap-1.5">
                      {item.name}
                      {item.popular && <Flame size={13} style={{ color: ORANGE }} />}
                    </h3>
                    {item.description && <p className="text-xs text-neutral-500 mt-1">{item.description}</p>}
                    <p className="mt-2 font-extrabold text-sm" style={{ color: ORANGE }}>{fmt(item.price)}</p>
                  </div>
                  <button
                    onClick={() => onAdd(item.id, item.name, item.price)}
                    className="shrink-0 w-9 h-9 rounded-full grid place-items-center text-white transition-colors"
                    style={{ background: added === item.id ? '#16a34a' : ORANGE }}
                    aria-label={`Add ${item.name}`}>
                    {added === item.id ? <Check size={16} /> : <Plus size={16} />}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  )
}
