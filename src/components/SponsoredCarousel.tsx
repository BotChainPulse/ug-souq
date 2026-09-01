import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { BadgeCheck, ChevronLeft, ChevronRight, Megaphone } from 'lucide-react'
import { fmt } from '../lib/cart'

type SponsoredAd = {
  id: number
  sellerId: number
  sellerName: string
  sellerVerified: boolean
  planType: 'weekly' | 'monthly'
  listingId: number | null
  headline: string
  image: string
  price: number | null
  oldPrice: number | null
  stock: number | null
  targetPath: string
}

const ROTATION_MS = 5000

export default function SponsoredCarousel() {
  const [ads, setAds] = useState<SponsoredAd[]>([])
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const touchStart = useRef<number | null>(null)

  useEffect(() => {
    fetch('/api/ads/active')
      .then((response) => response.ok ? response.json() : [])
      .then((data) => setAds(Array.isArray(data) ? data.filter((ad) => ad?.listingId && ad?.stock !== 0) : []))
      .catch(() => setAds([]))
  }, [])

  useEffect(() => {
    if (ads.length <= 1 || paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => {
      if (!document.hidden) setIndex((current) => (current + 1) % ads.length)
    }, ROTATION_MS)
    return () => window.clearInterval(timer)
  }, [ads.length, paused])

  if (ads.length === 0) return null
  const ad = ads[index % ads.length]
  const previous = () => setIndex((current) => (current - 1 + ads.length) % ads.length)
  const next = () => setIndex((current) => (current + 1) % ads.length)

  const finishSwipe = (endX: number) => {
    if (touchStart.current === null) return
    const distance = endX - touchStart.current
    touchStart.current = null
    if (Math.abs(distance) < 45) return
    distance > 0 ? previous() : next()
  }

  return (
    <section className="mx-auto max-w-7xl px-3 pt-4 sm:px-4" aria-label="Sponsored seller deals">
      <div
        className="relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-emerald-50 shadow-sm"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
        onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX ?? null; setPaused(true) }}
        onTouchEnd={(event) => { finishSwipe(event.changedTouches[0]?.clientX ?? 0); setPaused(false) }}
      >
        <div className="grid min-h-44 grid-cols-[1.05fr_0.95fr] sm:min-h-64 sm:grid-cols-2">
          <div className="flex min-w-0 flex-col justify-center p-4 pr-1 sm:p-8 sm:pr-4">
            <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.15em] text-emerald-700 sm:text-xs"><Megaphone size={13} /> Sponsored deal</div>
            <h2 className="mt-2 line-clamp-2 text-lg font-black leading-tight text-neutral-950 sm:text-3xl">{ad.headline}</h2>
            <p className="mt-1 flex items-center gap-1 truncate text-xs font-semibold text-neutral-600 sm:text-sm">{ad.sellerVerified && <BadgeCheck size={14} className="shrink-0 text-sky-600" />} {ad.sellerName}</p>
            {ad.price !== null && <div className="mt-2 flex flex-wrap items-baseline gap-2"><span className="text-base font-black text-emerald-800 sm:text-2xl">{fmt(ad.price)}</span>{ad.oldPrice && <span className="text-[10px] text-neutral-400 line-through sm:text-xs">{fmt(ad.oldPrice)}</span>}</div>}
            <Link to={ad.targetPath} className="mt-3 inline-flex min-h-10 w-fit items-center rounded-xl bg-emerald-700 px-4 text-xs font-extrabold text-white sm:min-h-11 sm:text-sm">Shop this item</Link>
          </div>
          <Link to={ad.targetPath} className="relative min-w-0 bg-white/70">
            <img key={ad.id} src={ad.image || '/images/product-default.png'} alt={ad.headline} className="h-full max-h-64 w-full object-contain p-2 sm:p-4" />
            <span className="absolute right-2 top-2 rounded-full bg-neutral-950/80 px-2 py-1 text-[9px] font-bold uppercase text-white">{ad.planType}</span>
          </Link>
        </div>

        {ads.length > 1 && <>
          <button type="button" onClick={previous} aria-label="Previous sponsored deal" className="absolute left-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-neutral-800 shadow sm:left-3"><ChevronLeft size={18} /></button>
          <button type="button" onClick={next} aria-label="Next sponsored deal" className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-neutral-800 shadow sm:right-3"><ChevronRight size={18} /></button>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-white/80 px-2 py-1" aria-label={`Sponsored deal ${index + 1} of ${ads.length}`}>
            {ads.map((item, itemIndex) => <button key={item.id} type="button" onClick={() => setIndex(itemIndex)} aria-label={`Show sponsored deal ${itemIndex + 1}`} className={`h-1.5 rounded-full transition-all ${itemIndex === index ? 'w-5 bg-emerald-700' : 'w-1.5 bg-neutral-300'}`} />)}
          </div>
        </>}
      </div>
    </section>
  )
}
