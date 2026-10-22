import { useState } from 'react'
import { trpc } from '../../providers/trpc'
import { needsSize, readSizes, validateSizes } from '../../lib/sizes'
import { readSpecifications, specificationIssue, type Specification, type PRODUCT_TYPES } from '../../lib/productDetails'
import SizeStockEditor from '../SizeStockEditor'
import ProductDetailsEditor from '../ProductDetailsEditor'
import { purchaseAvailability } from '../../lib/purchaseAvailability'

export default function SizeInventoryPanel({ adminKey }: { adminKey: string }) {
  const inventory = trpc.admin.sizeInventory.useQuery({ key: adminKey }, { enabled: !!adminKey, retry: false })
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const save = trpc.admin.setItemDetails.useMutation({ onSuccess: () => inventory.refetch() })
  const [editing, setEditing] = useState<NonNullable<typeof inventory.data>[number] | null>(null)
  const [sizes, setSizes] = useState<ReturnType<typeof readSizes>>([])
  const [specifications, setSpecifications] = useState<Specification[]>([])
  const [productType, setProductType] = useState('general')
  const [requiresSize, setRequiresSize] = useState(false)
  const [stock, setStock] = useState(0)
  const [error, setError] = useState('')
  const details = { name: editing?.name, category: editing?.category, productType, requiresSize, specifications }
  const sized = needsSize(details)
  const rows = inventory.data ?? []
  const needsAttention = (item: typeof rows[number]) => !['ready', 'out-of-stock'].includes(purchaseAvailability(item).status)
  const blocked = rows.filter(needsAttention).length
  const visible = rows.filter(item => item.name.toLowerCase().includes(search.toLowerCase()) && (filter !== 'attention' || needsAttention(item)))
  return <section className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4">
    <h2 className="text-lg font-bold">Sizes, specifications and inventory</h2>
    <p className="text-sm text-neutral-600">Review every item here, whatever its category. Confirm actual size labels, sizing system, measurements and available stock with the seller. Record exact phone, computer and other product specifications. Never guess stock or specifications. Stock excludes units reserved by orders.</p>
    <p className="text-sm font-semibold" role="status">{blocked} item{blocked === 1 ? '' : 's'} need sizes, specifications or stock reconciliation before ordering.</p>
    <label className="block text-sm font-semibold">Show inventory<select value={filter} disabled={!!editing} onChange={event => setFilter(event.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2 text-neutral-900"><option value="all">All items ({rows.length})</option><option value="attention">Needs attention ({blocked})</option></select></label>
    <button type="button" disabled={save.isPending} onClick={() => inventory.refetch()} className="rounded border px-3 py-2">Refresh stock</button>
    <input aria-label="Search size inventory" disabled={!!editing} value={search} onChange={event => setSearch(event.target.value)} placeholder="Find product or listing" className="w-full rounded-lg border p-2" />
    {inventory.isLoading && <p>Loading inventory…</p>}
    {inventory.error && <p role="alert">{inventory.error.message}</p>}
    {inventory.data && !visible.length && <p>No items match this search or filter.</p>}
    {visible.map(item => <div key={`${item.itemType}-${item.id}`} className="rounded-lg border p-3 text-sm">
      <b>{item.name}</b><p>{item.itemType === 'product' ? 'Catalogue product' : 'Seller listing'} · Available stock: {item.stock}</p>
      <p className={needsAttention(item) ? 'font-semibold text-amber-800' : 'text-neutral-600'}>{purchaseAvailability(item).label}</p>
      {needsSize(item) && <p>{readSizes(item.sizeOptions).map(size => `${size.label}: ${size.stock}`).join(' · ') || 'Sizes not configured — ordering blocked'}</p>}
      <p>{readSpecifications(item.specifications).map(spec => `${spec.label}: ${spec.value}`).join(' · ')}</p>
      {specificationIssue(item) && <p className="text-amber-800">{specificationIssue(item)}</p>}
      <button type="button" disabled={save.isPending} aria-expanded={editing?.itemType === item.itemType && editing.id === item.id} aria-controls={`inventory-editor-${item.itemType}-${item.id}`} onClick={() => { setEditing(item); setSizes(readSizes(item.sizeOptions)); setSpecifications(readSpecifications(item.specifications)); setProductType(item.productType ?? 'general'); setRequiresSize(needsSize(item)); setStock(item.stock); setError(''); save.reset() }} className="mt-2 rounded border px-3 py-2 font-bold">Edit sizes, specifications and stock</button>
    {editing?.itemType === item.itemType && editing.id === item.id && <div id={`inventory-editor-${item.itemType}-${item.id}`} className="mt-3 space-y-3 rounded-xl border-2 border-emerald-700 p-3 sm:p-4">
      <h3 className="font-bold">{editing.name}</h3>
      <ProductDetailsEditor item={details} value={specifications} onChange={setSpecifications} onTypeChange={setProductType} />
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={sized} disabled={needsSize({ ...details, requiresSize: false })} onChange={event => setRequiresSize(event.target.checked)} />This item is sold in sizes (including fixed One size)</label>
      {sized ? <SizeStockEditor value={sizes} onChange={setSizes} /> : <label className="block">Available stock<input type="number" min={0} max={10000} value={stock} onChange={event => setStock(Number(event.target.value))} className="m-2 rounded border p-2" /></label>}
      {(error || save.error) && <p role="alert" className="text-red-700">{error || save.error?.message}</p>}
      <button type="button" disabled={save.isPending} onClick={async () => {
        try {
          setError(''); const checked = validateSizes(sized ? sizes : []);
          await save.mutateAsync({ key: adminKey, itemType: editing.itemType, id: editing.id, expected: { stock: editing.stock, sizeOptions: editing.sizeOptions, productType: editing.productType, requiresSize: editing.requiresSize, specifications: editing.specifications }, sizes: checked, productType: productType as typeof PRODUCT_TYPES[number], requiresSize: sized, specifications, stock }); setEditing(null)
        } catch (issue) { setError(issue instanceof Error ? issue.message : 'Could not save inventory.') }
      }} className="rounded-lg bg-emerald-700 px-4 py-2 font-bold text-white disabled:opacity-50">{save.isPending ? 'Saving…' : 'Save confirmed details and stock'}</button>
      <button type="button" disabled={save.isPending} onClick={() => setEditing(null)} className="ml-2 rounded border px-3 py-2">Cancel</button>
    </div>}
    </div>)}
    {save.isSuccess && !editing && <p role="status" className="text-emerald-800">Item details and stock saved.</p>}
  </section>
}
