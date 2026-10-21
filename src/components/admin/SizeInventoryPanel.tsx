import { useState } from 'react'
import { trpc } from '../../providers/trpc'
import { readSizes, validateSizes } from '../../lib/sizes'
import SizeStockEditor from '../SizeStockEditor'

export default function SizeInventoryPanel({ adminKey }: { adminKey: string }) {
  const inventory = trpc.admin.sizeInventory.useQuery({ key: adminKey }, { enabled: !!adminKey, retry: false })
  const [search, setSearch] = useState('')
  const save = trpc.admin.setItemSizes.useMutation({ onSuccess: () => inventory.refetch() })
  const [editing, setEditing] = useState<NonNullable<typeof inventory.data>[number] | null>(null)
  const [sizes, setSizes] = useState<ReturnType<typeof readSizes>>([])
  const [error, setError] = useState('')
  return <section className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4">
    <h2 className="text-lg font-bold">Size inventory</h2>
    <p className="text-sm text-neutral-600">Confirm actual sizes and available stock with the seller. Clothing, underwear and shoes cannot be ordered until sizes are recorded. Stock here excludes units already reserved by orders.</p>
    <button type="button" onClick={() => inventory.refetch()} className="rounded border px-3 py-2">Refresh stock</button>
    <input aria-label="Search size inventory" value={search} onChange={event => setSearch(event.target.value)} placeholder="Find product or listing" className="w-full rounded-lg border p-2" />
    {inventory.isLoading && <p>Loading size inventory…</p>}
    {inventory.error && <p role="alert">{inventory.error.message}</p>}
    {inventory.data?.filter(item => item.name.toLowerCase().includes(search.toLowerCase())).map(item => <div key={`${item.itemType}-${item.id}`} className="rounded-lg border p-3 text-sm">
      <b>{item.name}</b><p>{item.itemType === 'product' ? 'Catalogue product' : 'Seller listing'} · Available stock: {item.stock}</p>
      <p>{readSizes(item.sizeOptions).map(size => `${size.label}: ${size.stock}`).join(' · ') || 'Sizes not configured — ordering blocked'}</p>
      <button type="button" onClick={() => { setEditing(item); setSizes(readSizes(item.sizeOptions)); setError(''); save.reset() }} className="mt-2 rounded border px-3 py-2 font-bold">Edit sizes and stock</button>
    </div>)}
    {editing && <div className="space-y-3 rounded-xl border-2 border-emerald-700 p-4">
      <h3 className="font-bold">{editing.name}</h3>
      <SizeStockEditor value={sizes} onChange={setSizes} />
      {(error || save.error) && <p role="alert" className="text-red-700">{error || save.error?.message}</p>}
      <button type="button" disabled={save.isPending} onClick={async () => {
        try { setError(''); const checked = validateSizes(sizes); await save.mutateAsync({ key: adminKey, itemType: editing.itemType, id: editing.id, expectedStock: editing.stock, expectedSizes: editing.sizeOptions, sizes: checked }); setEditing(null) } catch (issue) { setError(issue instanceof Error ? issue.message : 'Could not save stock.') }
      }} className="rounded-lg bg-emerald-700 px-4 py-2 font-bold text-white disabled:opacity-50">{save.isPending ? 'Saving…' : 'Save confirmed stock'}</button>
      <button type="button" onClick={() => setEditing(null)} className="ml-2 rounded border px-3 py-2">Cancel</button>
    </div>}
    {save.isSuccess && !editing && <p role="status" className="text-emerald-800">Size stock saved.</p>}
  </section>
}
