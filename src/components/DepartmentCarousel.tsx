import { useEffect, useRef, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { Link } from 'react-router'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'

const departments = [
  { label: 'Home Services', to: '/services', image: 'home-services' },
  { label: 'UG Souq Health', to: '/healthcare', image: 'healthcare' },
  { label: 'Super Mall', to: '/mall', image: 'electronics' },
  { label: 'UG Souq Food', to: '/food', image: 'food' },
  { label: 'UG Souq Fresh', to: '/catalog?category=agriculture&title=UG%20Souq%20Fresh', image: 'agriculture' },
  { label: 'Boda Send', to: '/boda', image: 'boda-send' },
  { label: 'Farm Direct', to: '/catalog?category=agriculture&title=Farm%20Direct', image: 'agriculture' },
  { label: 'Refurbished', to: '/catalog?condition=refurbished', image: 'refurbished' },
  { label: 'UG Souq Pay', to: '/pay', image: 'mobile-pay' },
  { label: 'Deals', to: '/catalog?deals=1', image: 'grocery' },
]

export default function DepartmentCarousel() {
  const [viewportRef, api] = useEmblaCarousel({ loop: true, align: 'start', duration: 35 })
  const regionRef = useRef<HTMLElement>(null)
  const [playing, setPlaying] = useState(true)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [visible, setVisible] = useState(true)
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(preference.matches)
    preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const region = regionRef.current
    if (!region) return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    observer.observe(region)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!api || !playing || hovered || focused || !visible || reducedMotion) return
    const timer = window.setInterval(() => {
      if (!document.hidden) api.scrollNext()
    }, 4000)
    return () => window.clearInterval(timer)
  }, [api, playing, hovered, focused, visible, reducedMotion])

  const move = (direction: 'previous' | 'next') => {
    setPlaying(false)
    if (direction === 'previous') api?.scrollPrev(reducedMotion)
    else api?.scrollNext(reducedMotion)
  }

  return (
    <nav
      ref={regionRef}
      aria-label="UG Souq departments"
      aria-roledescription="carousel"
      className="border-b border-emerald-100 bg-gradient-to-r from-emerald-100 via-cyan-50 to-amber-50 dark:border-neutral-800 dark:from-emerald-950 dark:via-neutral-950 dark:to-neutral-900"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
      }}
    >
      <div className="mx-auto max-w-7xl px-3 py-3 sm:px-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-emerald-950 dark:text-emerald-100">Explore UG Souq</span>
          <div className="flex items-center gap-1">
            {!reducedMotion && (
              <button type="button" onClick={() => setPlaying((current) => !current)} aria-label={playing ? 'Pause department rotation' : 'Start department rotation'} className="flex min-h-9 items-center gap-1 rounded-full px-3 text-xs font-semibold text-emerald-950 hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:text-emerald-100 dark:hover:bg-neutral-800">
                {playing ? <Pause size={13} aria-hidden="true" /> : <Play size={13} aria-hidden="true" />}
                {playing ? 'Pause' : 'Play'}
              </button>
            )}
            <button type="button" aria-label="Previous departments" onClick={() => move('previous')} className="grid size-9 place-items-center rounded-full bg-white/80 text-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:bg-neutral-800 dark:text-emerald-100"><ChevronLeft size={18} aria-hidden="true" /></button>
            <button type="button" aria-label="Next departments" onClick={() => move('next')} className="grid size-9 place-items-center rounded-full bg-white/80 text-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:bg-neutral-800 dark:text-emerald-100"><ChevronRight size={18} aria-hidden="true" /></button>
          </div>
        </div>
        <div ref={viewportRef} className="overflow-hidden" onPointerDown={() => setPlaying(false)}>
          <div className="-ml-3 flex touch-pan-y">
            {departments.map(({ label, to, image }) => (
              <div key={label} className="min-w-0 shrink-0 grow-0 basis-[116px] py-1 pl-3 sm:basis-[140px]">
                <Link to={to} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/80 bg-white/95 text-center text-xs font-bold text-emerald-950 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-emerald-100 sm:text-sm">
                  <img src={`/images/categories/${image}.webp`} alt="" width="360" height="360" decoding="async" className="aspect-square w-full object-cover" />
                  <span className="flex min-h-11 items-center justify-center px-1 py-1 leading-tight">{label}</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}
