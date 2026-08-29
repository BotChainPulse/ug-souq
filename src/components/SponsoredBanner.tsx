import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Megaphone, X } from 'lucide-react'

type SponsoredAd = {
  id: number
  sellerId: number
  sellerName: string
  sellerVerified: boolean
  planType: 'weekly' | 'monthly'
  image: string
  headline: string
}

export default function SponsoredBanner() {
  const [ads, setAds] = useState<SponsoredAd[]>([])
  const [index, setIndex] = useState(0)
  const [closed, setClosed] = useState(false)

  useEffect(() => {
    fetch('/api/ads/active')
      .then((response) => response.ok ? response.json() : [])
      .then((data) => setAds(Array.isArray(data) ? data : []))
      .catch(() => setAds([]))
  }, [])

  useEffect(() => {
    if (ads.length <= 1) return
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % ads.length), 6000)
    return () => window.clearInterval(timer)
  }, [ads.length])

  if (closed || ads.length === 0) return null
  const ad = ads[index % ads.length]

  return (
    <div className="fixed inset-x-3 bottom-20 z-40 mx-auto max-w-2xl sm:bottom-4">
      <div className="flex items-center gap-3 overflow-hidden rounded-2xl border border-emerald-200 bg-white p-2.5 shadow-2xl">
        <img src={ad.image || '/images/product-default.png'} alt="" className="h-14 w-14 shrink-0 rounded-xl bg-neutral-50 object-cover" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700"><Megaphone size={12} /> Sponsored</div>
          <p className="truncate text-sm font-extrabold text-neutral-900">{ad.headline}</p>
          <p className="truncate text-xs text-neutral-500">Promoted by {ad.sellerName}</p>
        </div>
        <Link to={`/seller/${ad.sellerId}`} className="shrink-0 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-extrabold text-white">Shop now</Link>
        <button onClick={() => setClosed(true)} aria-label="Close sponsored banner" className="shrink-0 rounded-full p-1 text-neutral-400 hover:bg-neutral-100"><X size={15} /></button>
      </div>
      {ads.length > 1 && <div className="mt-1 flex justify-center gap-1">{ads.map((item, i) => <span key={item.id} className={`h-1 rounded-full ${i === index % ads.length ? 'w-5 bg-emerald-700' : 'w-2 bg-neutral-300'}`} />)}</div>}
    </div>
  )
}
