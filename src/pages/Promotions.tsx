import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { BadgeCheck, Megaphone, Store } from 'lucide-react'
import Header from '../components/Header'
import Footer from '../components/Footer'

type SponsoredAd = {
  id: number
  sellerId: number
  sellerName: string
  sellerVerified: boolean
  planType: 'weekly' | 'monthly'
  image: string
  headline: string
}

export default function Promotions() {
  const [ads, setAds] = useState<SponsoredAd[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/ads/active')
      .then((response) => response.ok ? response.json() : [])
      .then((data) => setAds(Array.isArray(data) ? data : []))
      .catch(() => setAds([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-[#f6f7f6] text-neutral-900">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-7 sm:py-10">
        <div className="rounded-3xl bg-emerald-950 p-6 text-white sm:p-8">
          <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-300"><Megaphone size={15} /> Sponsored marketplace</p>
          <h1 className="mt-2 text-2xl font-extrabold sm:text-4xl">Featured sellers on UG Souq</h1>
          <p className="mt-2 max-w-2xl text-sm text-emerald-50/80">Paid seller promotions currently approved and active on the marketplace.</p>
        </div>

        {loading ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map((i) => <div key={i} className="h-72 animate-pulse rounded-2xl bg-white" />)}</div>
        ) : ads.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-10 text-center">
            <Store size={34} className="mx-auto text-neutral-300" />
            <p className="mt-3 font-bold">No sponsored campaigns are active right now.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ads.map((ad) => (
              <article key={ad.id} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
                <img src={ad.image || '/images/product-default.png'} alt={ad.headline} className="aspect-[4/3] w-full bg-neutral-50 object-cover" />
                <div className="p-4">
                  <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700"><Megaphone size={12} /> Sponsored · {ad.planType}</div>
                  <h2 className="mt-2 text-lg font-extrabold">{ad.headline}</h2>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-neutral-600">{ad.sellerVerified && <BadgeCheck size={15} className="text-sky-600" />} {ad.sellerName}</p>
                  <Link to={`/seller/${ad.sellerId}`} className="mt-4 inline-flex rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-extrabold text-white">Visit seller shop</Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
