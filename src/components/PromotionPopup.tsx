import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { ArrowRight, Megaphone } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog'
import { POPUP_ROTATION_KEY, POPUP_SESSION_KEY, promotionPage, usablePromotions, type Promotion } from '../lib/promotionPopup'

export default function PromotionPopup() {
  const { pathname } = useLocation()
  const [promotion, setPromotion] = useState<Promotion | null>(null)
  const [open, setOpen] = useState(false)
  const [shownPath, setShownPath] = useState('')
  const shown = useRef(false)
  const eligible = promotionPage(pathname)

  useEffect(() => {
    if (!eligible || shown.current) return
    try { if (sessionStorage.getItem(POPUP_SESSION_KEY)) return } catch { /* In-memory cap still applies. */ }
    const controller = new AbortController()
    let ads: Promotion[] = []
    let waited = false
    let scrolled = false
    let finished = false
    const maybeShow = () => {
      if (finished || !waited || !scrolled || !ads.length || document.visibilityState !== 'visible') return
      // Do not interrupt another dialog, typing, or a seller booking form.
      if (document.querySelector('[role="dialog"]') || document.activeElement?.matches('input, textarea, select, [contenteditable="true"]')) return
      ads = usablePromotions(ads)
      if (!ads.length) return
      let next = 0
      try {
        if (sessionStorage.getItem(POPUP_SESSION_KEY)) return
        const saved = Number(localStorage.getItem(POPUP_ROTATION_KEY))
        next = Number.isSafeInteger(saved) && saved >= 0 ? saved % ads.length : 0
        sessionStorage.setItem(POPUP_SESSION_KEY, '1')
        localStorage.setItem(POPUP_ROTATION_KEY, String((next + 1) % ads.length))
      } catch { /* Browsing continues when storage is unavailable. */ }
      finished = true
      shown.current = true
      setPromotion(ads[next])
      setShownPath(pathname)
      setOpen(true)
    }
    const onScroll = () => {
      const distance = document.documentElement.scrollHeight - window.innerHeight
      if (window.scrollY >= Math.min(400, Math.max(160, distance * 0.35))) scrolled = true
      maybeShow()
    }
    fetch('/api/ads/active', { signal: controller.signal })
      .then(response => response.ok ? response.json() : [])
      .then(data => { ads = usablePromotions(data); maybeShow() })
      .catch(() => { /* No campaign feed means no popup. */ })
    const timer = window.setTimeout(() => { waited = true; maybeShow() }, 20000)
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('visibilitychange', maybeShow)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('visibilitychange', maybeShow)
    }
  }, [eligible, pathname])

  return (
    <Dialog open={open && eligible && shownPath === pathname} onOpenChange={setOpen}>
      {promotion && <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-md gap-0 overflow-y-auto rounded-3xl border-emerald-200 bg-white p-0 text-neutral-900 sm:max-w-md [&>button]:flex [&>button]:h-11 [&>button]:w-11 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-full [&>button]:bg-white [&>button]:opacity-100">
        <div className="bg-gradient-to-br from-emerald-800 to-emerald-600 px-6 pb-6 pt-6 pr-16 text-white">
          <div className="mb-4 flex items-center gap-2"><img src="/logo-mark.png" alt="" className="h-9 w-9 rounded-lg bg-white object-contain" /><span className="text-lg font-black">UGSouq</span></div>
          <DialogTitle className="text-2xl font-extrabold leading-tight text-white">Discover deals on UGSouq</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-emerald-50">{promotion.placementType === 'paid' ? 'Explore a seller’s sponsored offer.' : 'Explore a UGSouq featured product.'}</DialogDescription>
        </div>
        <div className="p-5 sm:p-6">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold text-emerald-800"><Megaphone size={15} />{promotion.placementType === 'paid' ? 'Sponsored · paid seller campaign' : 'UGSouq featured · platform-funded pilot'}</div>
          <img src={promotion.image || '/images/product-default.png'} alt={promotion.headline} onError={event => { if (!event.currentTarget.src.endsWith('/images/product-default.png')) event.currentTarget.src = '/images/product-default.png' }} className="h-40 w-full rounded-2xl bg-neutral-50 object-contain p-3 sm:h-48" />
          <h3 className="mt-4 break-words text-lg font-extrabold">{promotion.headline}</h3>
          <p className="mt-1 text-sm text-neutral-600">{promotion.sellerName}</p>
          {promotion.message && <p className="mt-2 break-words text-sm leading-relaxed text-neutral-600">{promotion.message}</p>}
          <Link to={promotion.targetPath} onClick={() => setOpen(false)} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 font-extrabold text-white hover:bg-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">View offer <ArrowRight size={18} /></Link>
          <button type="button" onClick={() => setOpen(false)} className="mt-2 min-h-11 w-full rounded-xl text-sm font-semibold text-neutral-600 hover:bg-neutral-100">Continue browsing</button>
        </div>
      </DialogContent>}
    </Dialog>
  )
}
