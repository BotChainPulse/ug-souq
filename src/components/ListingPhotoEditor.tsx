import { useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { makeMainPhoto, MAX_LISTING_PHOTOS } from '../lib/listingPhotos'
import { processListingPhoto } from '../lib/processListingPhoto'

type Props = { value: string[]; onChange: (photos: string[]) => void; disabled?: boolean; onBusyChange?: (busy: boolean) => void }
export default function ListingPhotoEditor({ value, onChange, disabled = false, onBusyChange }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const processing = useRef(false)
  const upload = async (files: File[]) => {
    if (!files.length || processing.current || disabled) return
    if (files.length + value.length > MAX_LISTING_PHOTOS) { setError('You can have up to six photos. Choose fewer photos or remove one first.'); return }
    processing.current = true; setBusy(true); onBusyChange?.(true); setError('')
    try {
      // Process sequentially to avoid holding six full camera images in memory.
      const next = [...value]
      for (const file of files) {
        const photo = await processListingPhoto(file)
        if (!next.includes(photo)) next.push(photo)
      }
      onChange(next)
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not process the photos.') }
    finally { processing.current = false; setBusy(false); onBusyChange?.(false) }
  }
  const locked = disabled || busy
  return <fieldset disabled={locked} className="min-w-0 space-y-3">
    <legend className="text-sm font-bold">Item photos · {value.length}/{MAX_LISTING_PHOTOS}</legend>
    <p className="text-xs text-neutral-600">Add real photos of the actual item: front, back, sides, details and any defects. The first is the main photo. Photos are fitted to a square without cropping.</p>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {value.map((photo, index) => <div key={photo} className="min-w-0 rounded-xl border bg-white p-2">
        <img src={photo} alt={`Item photo ${index + 1}`} className="aspect-square w-full rounded-lg object-contain" />
        <button type="button" disabled={locked || index === 0} onClick={() => onChange(makeMainPhoto(value, index))} aria-label={`Make photo ${index + 1} the main photo`} className="mt-2 w-full rounded-lg border px-2 py-2 text-xs font-bold disabled:opacity-60">{index === 0 ? 'Main photo' : 'Make main'}</button>
        <button type="button" disabled={locked} onClick={() => onChange(value.filter((_, i) => i !== index))} aria-label={`Remove photo ${index + 1}`} className="mt-1 w-full rounded-lg px-2 py-2 text-xs font-semibold text-red-700">Remove</button>
      </div>)}
    </div>
    {value.length < MAX_LISTING_PHOTOS && <div className="flex flex-wrap gap-3">
      <label className={`flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-neutral-400 bg-neutral-50 p-3 text-sm font-semibold ${locked ? 'opacity-50' : ''}`}>
        <Camera size={18} /> Add photos
        <input type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={locked} className="sr-only" aria-label="Add item photos" onChange={e => { const files = Array.from(e.currentTarget.files ?? []); e.currentTarget.value = ''; void upload(files) }} />
      </label>
      <label className={`cursor-pointer rounded-xl border p-3 text-sm font-semibold ${locked ? 'opacity-50' : ''}`}>Take a photo
        <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={locked} className="sr-only" aria-label="Take an item photo" onChange={e => { const files = Array.from(e.currentTarget.files ?? []); e.currentTarget.value = ''; void upload(files) }} />
      </label>
    </div>}
    <p role="status" className="text-xs text-neutral-600">{busy ? 'Preparing photos… Please wait before saving.' : 'JPG, PNG or WebP. At least one photo is required.'}</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </fieldset>
}
