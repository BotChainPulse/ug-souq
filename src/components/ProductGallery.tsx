import { useRef, useState } from 'react'

type Props = { images: string[]; name: string }
export default function ProductGallery({ images, name }: Props) {
  const [selected, setSelected] = useState(0)
  const touch = useRef<{ x: number; y: number } | null>(null)
  const index = Math.min(selected, Math.max(0, images.length - 1))
  const move = (delta: number) => { if (images.length > 1) setSelected((index + delta + images.length) % images.length) }
  return <div role="region" aria-label={`${name} photos`} className="min-w-0">
    <div className="relative rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600" tabIndex={images.length > 1 ? 0 : undefined} style={{ touchAction: 'pan-y pinch-zoom' }}
      onKeyDown={e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); move(e.key === 'ArrowRight' ? 1 : -1) } }}
      onTouchStart={e => { const point = e.touches[0]; touch.current = point ? { x: point.clientX, y: point.clientY } : null }}
      onTouchCancel={() => { touch.current = null }}
      onTouchEnd={e => { const start = touch.current, end = e.changedTouches[0]; touch.current = null; if (!start || !end || images.length < 2) return; const dx = end.clientX - start.x, dy = end.clientY - start.y; if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) move(dx < 0 ? 1 : -1) }}>
      <img src={images[index] || '/images/product-default.png'} alt={`${name}${images.length > 1 ? ` — photo ${index + 1} of ${images.length}` : ''}`} className="product-image-standard rounded-xl" />
      {images.length > 1 && <div className="mt-2 flex items-center justify-between gap-3">
        <button type="button" aria-label="Previous photo" onClick={() => move(-1)} className="rounded-lg border bg-white px-4 py-2 font-bold">‹</button>
        <span aria-live="polite" className="text-xs text-neutral-600">Photo {index + 1} of {images.length} · Swipe to browse</span>
        <button type="button" aria-label="Next photo" onClick={() => move(1)} className="rounded-lg border bg-white px-4 py-2 font-bold">›</button>
      </div>}
    </div>
    {images.length > 1 && <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Choose item photo">
      {images.map((image, i) => <button type="button" key={image} aria-label={`Show photo ${i + 1}`} aria-pressed={i === index} onClick={() => setSelected(i)} className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 p-1 ${i === index ? 'border-emerald-600' : 'border-neutral-200'}`}><img src={image} alt="" loading="lazy" className="h-full w-full object-contain" /></button>)}
    </div>}
  </div>
}
