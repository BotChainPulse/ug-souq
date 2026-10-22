import { PRODUCT_TYPES, productType, requiredSpecFields, type ProductDetails, type Specification } from '../lib/productDetails'

export default function ProductDetailsEditor({ item, value, onChange, onTypeChange }: { item: ProductDetails; value: Specification[]; onChange: (value: Specification[]) => void; onTypeChange: (type: string) => void }) {
  const required = requiredSpecFields(item)
  const fields = [...required.map(label => value.find(spec => spec.label.toLowerCase() === label.toLowerCase()) ?? { label, value: '' }), ...value.filter(spec => !required.some(label => label.toLowerCase() === spec.label.toLowerCase()))]
  return <div className="space-y-3 rounded-xl border p-4">
    <label className="block text-sm font-bold">Product type
      <select value={item.productType ?? 'general'} onChange={event => onTypeChange(event.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2 text-neutral-900">
        {PRODUCT_TYPES.map(type => <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>)}
      </select>
    </label>
    <p className="text-xs text-neutral-600">Detected type: {productType(item)}. Record the exact item sold at this price. List different phone storage, laptop RAM or other configurations separately with their own price and stock. Include units, dimensions, compatibility, capacity and model where relevant.</p>
    {fields.map((spec, index) => <div key={`${required.includes(spec.label) ? spec.label : index}`} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] gap-2 items-center">
      {required.includes(spec.label) ? <label htmlFor={`spec-${index}`} className="text-sm font-semibold break-words">{spec.label} *</label> : <input aria-label={`Specification ${index + 1} name`} value={spec.label} maxLength={48} onChange={event => onChange(fields.map((row, i) => i === index ? { ...row, label: event.target.value } : row))} className="min-w-0 rounded border p-2" placeholder="Specification" />}
      <input id={`spec-${index}`} aria-label={spec.label || `Specification ${index + 1} value`} value={spec.value} maxLength={160} onChange={event => onChange(fields.map((row, i) => i === index ? { ...row, value: event.target.value } : row))} className="min-w-0 rounded border p-2" placeholder="Confirmed value with units" />
      {!required.includes(spec.label) && <button type="button" aria-label={`Remove specification ${index + 1}`} onClick={() => onChange(fields.filter((_, i) => i !== index))} className="rounded border p-2">×</button>}
    </div>)}
    <button type="button" disabled={fields.length >= 20} onClick={() => onChange([...fields, { label: '', value: '' }])} className="rounded border px-3 py-2 text-sm">Add specification</button>
  </div>
}
