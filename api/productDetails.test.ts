import { describe, expect, it } from 'vitest'
import { configurationOf, confirmedSpecifications, productType, requiredSpecFields, specificationIssue, validateSpecifications } from '../src/lib/productDetails'
import { needsSize } from '../src/lib/sizes'
import { checkoutConfiguration, listingSizes, reserveSize } from './sizeStock'

const phone = { name: 'Samsung Galaxy A16', category: 'phones', specifications: [
  { label: 'Model', value: 'SM-A166' }, { label: 'RAM', value: '8 GB' }, { label: 'Storage', value: '128 GB' }, { label: 'Network', value: '5G / dual SIM' }, { label: 'Colour', value: 'Black' },
] }

describe('size requirements independent of department', () => {
  it.each([
    ['StrideFlex Running Sneakers, White/Orange (Unisex)', 'sports'],
    ["Women's underwear", 'other'], ['Boxer briefs', 'other'], ['Baby romper', 'baby'], ['Kids school uniform', 'office'], ['Football jersey', 'sports'], ['Motorcycle helmet', 'boda-auto'], ['Work gloves', 'tools'], ['Gold ring', 'beauty'], ['Cotton bed sheets', 'home'], ['Diapers', 'baby'],
  ])('requires confirmed size stock for %s in %s', (name, category) => {
    expect(needsSize({ name, category, requiresSize: false, productType: 'general' })).toBe(true)
    expect(() => listingSizes(category, [], { name })).toThrow(/sizes/)
    expect(() => reserveSize({ name, category, stock: 10 }, undefined, 1)).toThrow(/not available/)
  })
  it('supports explicit sizes for any unrecognised item', () => {
    expect(needsSize({ name: 'Custom item', category: 'other', requiresSize: true })).toBe(true)
    expect(() => listingSizes('other', [], { requiresSize: true })).toThrow()
  })
  it.each(['USB-C cable', 'Bluetooth speaker', 'Football', 'Laptop case', 'Ring light'])('does not require apparel sizes for %s', name => {
    expect(needsSize({ name, category: 'electronics' })).toBe(false)
  })
})

describe('confirmed product specifications', () => {
  it('requires phone and laptop configurations even in a different category', () => {
    expect(specificationIssue({ name: 'Refurbished iPhone 11', category: 'refurbished' })).toMatch(/Model/)
    expect(requiredSpecFields({ name: 'HP laptop', category: 'office' })).toEqual(['Model', 'Processor', 'RAM', 'Storage', 'Screen size', 'Operating system'])
    expect(specificationIssue(phone)).toBe('')
  })
  it.each(['iPhone case', 'Laptop sleeve', 'Tablet stand'])('does not misclassify accessory %s as the device', name => {
    expect(productType({ name, category: 'phones' })).toBe('general')
  })
  it('requires explicit types and supports additional specifications for any goods', () => {
    expect(specificationIssue({ name: 'Custom console', productType: 'desktop' })).toMatch(/Model/)
    expect(confirmedSpecifications({ specifications: [{ label: 'Compatibility', value: 'Model X only' }] })).toHaveLength(1)
  })
  it('rejects malformed, duplicate, empty and placeholder specifications', () => {
    for (const specifications of ['{bad', '{}', '[{"label":"RAM","value":"TBD"}]']) expect(() => confirmedSpecifications({ specifications })).toThrow()
    expect(() => validateSpecifications([{ label: 'RAM', value: '8 GB' }, { label: ' ram ', value: '16 GB' }])).toThrow(/once/)
    expect(() => validateSpecifications([{ label: 'RAM', value: '' }])).toThrow()
  })
  it('rejects missing or stale configurations at checkout', () => {
    expect(() => checkoutConfiguration(phone)).toThrow(/cart/)
    const original = configurationOf(phone)
    expect(checkoutConfiguration(phone, original)).toBe(original)
    expect(() => checkoutConfiguration({ ...phone, specifications: phone.specifications.map(spec => spec.label === 'Storage' ? { ...spec, value: '256 GB' } : spec) }, original)).toThrow(/changed/)
    expect(() => checkoutConfiguration({ name: 'Laptop', category: 'office' })).toThrow(/seller must confirm/)
  })
  it('uses stable ordering and accepts ordinary goods without a fabricated configuration', () => {
    expect(configurationOf({ ...phone, specifications: [...phone.specifications].reverse() })).toBe(configurationOf(phone))
    expect(checkoutConfiguration({ name: 'Plain cup', category: 'home' })).toBeNull()
  })
})
