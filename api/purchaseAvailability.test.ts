import { describe, expect, it } from 'vitest'
import { purchaseAvailability } from '../src/lib/purchaseAvailability'
import { configurationOf } from '../src/lib/productDetails'
import { checkoutConfiguration, reserveSize } from './sizeStock'

describe('purchase availability shown to customers and administrators', () => {
  const shoes = { name: 'Synthetic running shoes', stock: 3, sizeOptions: null as string | null }
  it('reports missing size data and malformed size data as pending', () => {
    expect(purchaseAvailability(shoes).status).toBe('sizes-pending')
    expect(purchaseAvailability({ ...shoes, sizeOptions: '{bad' }).status).toBe('sizes-pending')
  })
  it('reports unreconciled sizes before a buyer can add them', () => {
    const item = { ...shoes, sizeOptions: JSON.stringify([{ label: 'EU 42', stock: 2 }]) }
    expect(purchaseAvailability(item).status).toBe('stock-review')
    expect(() => reserveSize(item, 'EU 42', 1)).toThrow(/reconciled/)
  })
  it('allows confirmed size stock while retaining server-side size selection', () => {
    const item = { ...shoes, sizeOptions: JSON.stringify([{ label: 'EU 42', stock: 3 }]) }
    expect(purchaseAvailability(item).status).toBe('ready')
    expect(() => reserveSize(item, undefined, 1)).toThrow(/choose/)
    expect(reserveSize(item, 'EU 42', 1).stock).toBe(2)
    expect(purchaseAvailability({ ...item, stock: 0, sizeOptions: JSON.stringify([{ label: 'EU 42', stock: 0 }]) }).status).toBe('out-of-stock')
  })
  it('allows an appliance only after the exact required specifications are saved', () => {
    const item = { name: 'Synthetic blender', stock: 2 }
    expect(purchaseAvailability(item).status).toBe('specifications-pending')
    const confirmed = { ...item, specifications: [
      { label: 'Model', value: 'Synthetic QA model' }, { label: 'Capacity', value: '2 L' }, { label: 'Power requirements', value: '500 W, 220–240 V' },
    ] }
    expect(purchaseAvailability(confirmed).status).toBe('ready')
    expect(checkoutConfiguration(confirmed, configurationOf(confirmed))).toContain('Capacity: 2 L')
  })
  it('keeps ordinary items available and reports actual zero stock separately', () => {
    expect(purchaseAvailability({ name: 'Plain mug', stock: 2 }).status).toBe('ready')
    expect(purchaseAvailability({ name: 'Plain mug', stock: 0 }).status).toBe('out-of-stock')
  })
})
