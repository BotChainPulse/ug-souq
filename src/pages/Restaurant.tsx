import { useParams, Link } from 'react-router'
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
          <div className="mt-4 h-64 animate-pulse rounded-2xl border border-neutral-200 bg-white" />
        ) : !r ? (
          <p className="mt-10 text-center text-neutral-500">Restaurant not found.</p>
        ) : (
          <>
            <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
              <div className="flex h-52 w-full items-center justify-center bg-white sm:h-auto sm:aspect-[16/7]">
                <img src={r.image} alt={r.name} className="h-full w-full object-contain sm:object-cover" />
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h1 className="text-2xl font-extrabold">{r.name}</h1>
                    <p className="mt-0.5 text-sm text-neutral-500">{r.cuisine} · {r.area}</p>
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

            <h2 className="mb-4 mt-8 text-lg font-extrabold">Menu</h2>
            <div className="mb-8 grid gap-3 sm:grid-cols-2">
              {r.items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-4">
                  <div className="min-w-0">
                    <h3 className="flex items-center gap-1.5 text-sm font-bold">
                      {item.name}
                      {item.popular && <Flame size={13} style={{ color: ORANGE }} />}
                    </h3>
                    {item.description && <p className="mt-1 text-xs text-neutral-500">{item.description}</p>}
                    <p className="mt-2 text-sm font-extrabold" style={{ color: ORANGE }}>{fmt(item.price)}</p>
                  </div>
                  <button
                    onClick={() => onAdd(item.id, item.name, item.price)}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white transition-colors"
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
