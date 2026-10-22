import { sizeTotal, type SizeOption } from '../lib/sizes'

export default function SizeStockEditor({ value, onChange }: { value: SizeOption[]; onChange: (value: SizeOption[]) => void }) {
  return <fieldset className="space-y-3 rounded-xl border border-neutral-200 p-4">
    <legend className="px-1 font-bold">Sizes and available stock</legend>
    <p className="text-sm text-neutral-600">Use the labels on the item, for example S, M, XL, UK 32, EU 40 or One size. Include the sizing system for underwear and shoes. For helmets, rings, baby items and home textiles, include the relevant measurements or dimensions. Enter only stock you can supply.</p>
    {value.map((option, index) => <div key={index} className="grid grid-cols-[minmax(0,1fr)_80px] sm:grid-cols-[minmax(0,1fr)_100px_auto] items-end gap-2">
      <label className="min-w-0 text-sm">Size<input aria-label={`Size ${index + 1}`} maxLength={32} value={option.label} onChange={event => onChange(value.map((row, i) => i === index ? { ...row, label: event.target.value } : row))} className="mt-1 w-full rounded-lg border p-2 bg-white text-neutral-900" /></label>
      <label className="text-sm">Stock<input aria-label={`Stock for size ${index + 1}`} type="number" min={0} max={10000} step={1} value={Number.isNaN(option.stock) ? '' : option.stock} onChange={event => onChange(value.map((row, i) => i === index ? { ...row, stock: event.target.value === '' ? NaN : Number(event.target.value) } : row))} className="mt-1 w-full rounded-lg border p-2 bg-white text-neutral-900" /></label>
      <button type="button" aria-label={`Remove size ${index + 1}`} onClick={() => onChange(value.filter((_, i) => i !== index))} className="col-span-2 rounded-lg border px-2 py-2 sm:col-auto">Remove</button>
    </div>)}
    <button type="button" disabled={value.length >= 30} onClick={() => onChange([...value, { label: '', stock: 0 }])} className="rounded-lg border px-3 py-2 text-sm font-bold">Add size</button>
    <p className="text-sm">Total stock: {sizeTotal(value) || 0}</p>
  </fieldset>
}
