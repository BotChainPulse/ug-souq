import { Link } from 'react-router'
import { Star, Clock, Bike, UtensilsCrossed } from 'lucide-react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { trpc } from '@/providers/trpc'
import { fmt } from '../lib/cart'
import { ORANGE } from '../lib/site'

export default function Food() {
  const { data: restaurants, isLoading } = trpc.food.restaurants.useQuery()

  return (
    <div className="min-h-screen bg-[#faf9f7] text-neutral-900 antialiased">
      <Header />
      <section className="bg-neutral-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:py-10">
          <h1 className="flex items-center gap-3 text-2xl font-extrabold sm:text-3xl"><UtensilsCrossed size={26} style={{ color: ORANGE }} /> UG Souq Food</h1>
          <p className="mt-1.5 text-sm text-neutral-300 sm:text-base">Order from Kampala's favourite kitchens — hot delivery by boda in under 45 minutes.</p>
        </div>
      </section>

      <section className="mx-auto mb-4 mt-4 max-w-7xl px-3 sm:mt-8 sm:px-4">
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-64 animate-pulse rounded-2xl border border-neutral-200 bg-white" />)}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {restaurants?.map((r) => (
              <Link key={r.id} to={`/food/${r.slug}`} className="group bg-white rounded-2xl border border-neutral-200 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all">
                <div className="relative">
                  <img src={r.image} alt={r.name} className="h-44 w-full object-cover sm:h-auto sm:aspect-[16/10]" loading="lazy" />
                  {r.featured && <span className="absolute top-3 left-3 text-[11px] font-bold text-white px-2.5 py-1 rounded-full" style={{ background: ORANGE }}>Featured</span>}
                  {!r.open && <span className="absolute inset-0 bg-black/50 grid place-items-center text-white font-bold">Closed now</span>}
                </div>
                <div className="p-3.5 sm:p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-extrabold">{r.name}</h3>
                    <span className="flex items-center gap-1 text-sm font-semibold shrink-0"><Star size={14} className="fill-amber-400 text-amber-400" /> {(r.rating / 10).toFixed(1)}</span>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-sm text-neutral-500">{r.cuisine} · {r.area}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-neutral-600">
                    <span className="flex items-center gap-1"><Clock size={13} /> {r.deliveryMins} min</span>
                    <span className="flex items-center gap-1"><Bike size={13} /> {r.deliveryFee === 0 ? 'Free delivery' : fmt(r.deliveryFee)}</span>
                    <span>Min {fmt(r.minOrder)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
      <Footer />
    </div>
  )
}
