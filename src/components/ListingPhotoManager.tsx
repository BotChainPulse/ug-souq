import { useState } from 'react'
import { Link } from 'react-router'
import { trpc } from '../providers/trpc'
import { getAccount } from '../lib/account'
import { readListingPhotos } from '../lib/listingPhotos'
import ListingPhotoEditor from './ListingPhotoEditor'

type Props = {
  listing: { id: number; name: string; imageData?: string | null; imageGallery?: string | null; photoRevision: string }
  phone?: string; adminKey?: string; onSaved: () => void
}
export default function ListingPhotoManager({ listing, phone, adminKey, onSaved }: Props) {
  const [editing, setEditing] = useState(false)
  const [photos, setPhotos] = useState<string[]>([])
  const [revision, setRevision] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const sellerMutation = trpc.sellers.updateListingPhotos.useMutation()
  const adminMutation = trpc.admin.setListingPhotos.useMutation()
  const pending = sellerMutation.isPending || adminMutation.isPending
  const account = getAccount()
  const canEdit = !!adminKey || (!!account?.deletionToken && account.phone.replace(/[\s-]+/g, '').trim() === phone?.replace(/[\s-]+/g, '').trim())
  const save = async () => {
    try {
      const input = { id: listing.id, photos, expectedRevision: revision }
      const result = adminKey ? await adminMutation.mutateAsync({ ...input, key: adminKey }) : await sellerMutation.mutateAsync({ ...input, phone: phone! })
      setEditing(false)
      setMessage(result.unchanged ? 'Photos are unchanged.' : 'Photos saved. This listing is awaiting review before it can appear to shoppers.')
      onSaved()
    } catch { /* Error is shown beneath the editor. Keep the draft for retry. */ }
  }
  return <div className="mt-3 min-w-0">
    {!editing ? <button type="button" onClick={() => { setPhotos(readListingPhotos(listing.imageData, listing.imageGallery)); setRevision(listing.photoRevision); setMessage(''); sellerMutation.reset(); adminMutation.reset(); setEditing(true) }} className="rounded-xl border bg-white px-4 py-2 text-sm font-bold">Edit photos · {readListingPhotos(listing.imageData, listing.imageGallery).length}/6</button> : <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
      <h3 className="text-sm font-bold">Edit photos: {listing.name}</h3>
      <p className="text-xs">Saving photo changes sends the listing back for review. It is hidden from shoppers until approved.</p>
      {!canEdit ? <p className="text-sm">Use the secured <Link to="/account" className="font-bold underline">account</Link> registered with your shop phone to edit these photos. If unavailable, contact seller support.</p> : <>
        <ListingPhotoEditor value={photos} onChange={setPhotos} disabled={pending} onBusyChange={setBusy} />
        <button type="button" disabled={busy || pending || !photos.length} onClick={() => { void save() }} className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{pending ? 'Saving…' : 'Save photos for review'}</button>
      </>}
      <button type="button" disabled={busy || pending} onClick={() => setEditing(false)} className="ml-2 rounded-xl border bg-white px-4 py-3 text-sm font-semibold disabled:opacity-50">Cancel</button>
      {(sellerMutation.error || adminMutation.error) && <p role="alert" className="break-words text-sm text-red-700">{(sellerMutation.error || adminMutation.error)?.message}</p>}
    </div>}
    {message && <p role="status" className="mt-2 text-sm text-emerald-800">{message}</p>}
  </div>
}
