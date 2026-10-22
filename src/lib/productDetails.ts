export type Specification = { label: string; value: string }
export type ProductDetails = { name?: string; category?: string; productType?: string | null; requiresSize?: boolean | null; specifications?: unknown; sizeOptions?: unknown }
export const PRODUCT_TYPES = ['general', 'clothing', 'footwear', 'ring', 'bedding', 'phone', 'tablet', 'laptop', 'desktop', 'television', 'appliance', 'furniture', 'power_bank', 'storage', 'solar', 'tyre', 'cable', 'beauty', 'grocery'] as const
export const SPEC_FIELDS: Record<string, string[]> = {
  phone: ['Model', 'RAM', 'Storage', 'Network', 'Colour'],
  tablet: ['Model', 'RAM', 'Storage', 'Connectivity', 'Screen size', 'Colour'],
  laptop: ['Model', 'Processor', 'RAM', 'Storage', 'Screen size', 'Operating system'],
  desktop: ['Model', 'Processor', 'RAM', 'Storage', 'Operating system'],
  television: ['Model', 'Screen size', 'Resolution', 'Smart TV'],
  appliance: ['Model', 'Capacity', 'Power requirements'],
  furniture: ['Dimensions', 'Material'],
  bedding: ['Material', 'Dimensions'],
  power_bank: ['Model', 'Capacity', 'Output power', 'Ports'],
  storage: ['Model', 'Capacity', 'Interface'],
  solar: ['Model', 'Rated power', 'Voltage'],
  tyre: ['Tyre size', 'Vehicle compatibility'],
  cable: ['Connectors', 'Length', 'Compatibility'],
  beauty: ['Net quantity', 'Ingredients', 'Expiry or period after opening'],
  grocery: ['Net quantity', 'Ingredients or contents', 'Expiry or shelf life'],
}
const clean = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ')
export function inferredType(item: ProductDetails): string {
  const name = (item.name ?? '').toLowerCase()
  const accessory = /\b(case|cover|charger|cable|protector|stand|holder|adapter|sleeve|bag|keyboard|mouse)\b/.test(name)
  if (!accessory) {
    if (/\b(laptop|notebook|macbook|chromebook)\b/.test(name)) return 'laptop'
    if (/\b(desktop|imac|mini pc|gaming pc)\b/.test(name)) return 'desktop'
    if (/\b(tablet|ipad|galaxy tab)\b/.test(name)) return 'tablet'
    if (/\b(phone|smartphone|iphone|galaxy [aszm]\d|tecno|infinix|itel|redmi|poco)\b/.test(name)) return 'phone'
    if (/\b(tv|television)\b/.test(name)) return 'television'
  }
  if (/\b(power ?bank)\b/.test(name)) return 'power_bank'
  if (/\b(ssd|hdd|hard drive|flash drive|memory card|micro ?sd)\b/.test(name)) return 'storage'
  if (/\b(solar panel|inverter|solar battery)\b/.test(name)) return 'solar'
  if (/\b(tyres?|tires?)\b/.test(name)) return 'tyre'
  if (/\b(cable|charger|adapter)\b/.test(name)) return 'cable'
  if (/\b(refrigerator|fridge|washing machine|microwave|blender|rice cooker|pressure cooker|electric kettle|air fryer|freezer|oven|generator)\b/.test(name)) return 'appliance'
  if (/\b(sofa|wardrobe|dining table|desk|bookshelf|bed frame)\b/.test(name)) return 'furniture'

  if (/\b(sneakers?|shoes?|boots?|sandals?|slippers?|trainers?|loafers?|heels?|footwear|cleats?|gumboots?)\b/.test(name)) return 'footwear'
  if (/\b(underwear|underpants|pants|panties|briefs?|boxers?|bras?|lingerie|socks?|stockings?|tights?|leggings?|shirts?|t-shirts?|tees?|jerseys?|uniforms?|dresses?|trousers?|jeans|skirts?|shorts|swimwear|swimsuits?|bikinis?|jackets?|coats?|hoodies?|sweaters?|pajamas?|pyjamas?|rompers?|onesies?|bodysuits?|overalls?|gloves?|helmets?|hats?|caps?|belts?|diapers?|nappies|protective suits?|scrubs)\b/.test(name)) return 'clothing'
  if (/\b(ring|rings)\b/.test(name) && !/\b(light|binder|key|curtain)\b/.test(name)) return 'ring'
  if (/\b(mattress|mattresses|bedsheets?|bed sheets?|duvets?|curtains?|rugs?|carpets?)\b/.test(name)) return 'bedding'
  return 'general'
}
export function productType(item: ProductDetails) {
  const inferred = inferredType(item)
  // An explicit general type cannot bypass a clear product requirement.
  if (inferred !== 'general') return inferred
  if (item.productType && item.productType !== 'general') return item.productType
  if (item.category === 'phones') return /\b(case|cover|charger|cable|protector|stand|holder|adapter|sleeve|bag|keyboard|mouse|accessor|earbuds?|headphones?|headsets?|earphones?|speakers?|smartwatch|smart watch|watch|battery|batteries|power ?bank|tripod|gimbal)\b/i.test(item.name ?? '') ? 'general' : 'phone'
  if (item.category === 'furniture') return 'furniture'
  if (item.category === 'appliances') return 'appliance'
  if (['laptops', 'computers'].includes(item.category ?? '')) return 'laptop'
  return 'general'
}
export const requiredSpecFields = (item: ProductDetails) => SPEC_FIELDS[productType(item)] ?? []
export function validateSpecifications(raw: Specification[]) {
  if (!Array.isArray(raw) || raw.length > 20) throw new Error('Use up to 20 specifications.')
  const seen = new Set<string>()
  return raw.map(spec => {
    if (!spec || typeof spec.label !== 'string' || typeof spec.value !== 'string') throw new Error('Enter a specification name and value.')
    const label = clean(spec.label), value = clean(spec.value)
    if (!label || !value || label.length > 48 || value.length > 160 || (/[<>]/.test(label + value) || [...label + value].some(char => char.charCodeAt(0) < 32))) throw new Error('Each specification needs a name (up to 48 characters) and value (up to 160 characters).')
    const key = label.toLowerCase()
    if (seen.has(key)) throw new Error('Each specification name must appear once.')
    if (/^(unknown|tbd|tbc|n\/?a|demo|test|pending|not specified|-|\?)$/i.test(value)) throw new Error(`Confirm the actual ${label}.`)
    seen.add(key)
    return { label, value }
  })
}
export function readSpecifications(raw: unknown): Specification[] {
  try { return validateSpecifications(typeof raw === 'string' ? JSON.parse(raw) : raw ?? []) } catch { return [] }
}
export function confirmedSpecifications(item: ProductDetails): Specification[] {
  const raw = typeof item.specifications === 'string' ? JSON.parse(item.specifications) : item.specifications ?? []
  const specs = validateSpecifications(raw as Specification[])
  for (const label of requiredSpecFields(item)) {
    if (!specs.some(spec => spec.label.toLowerCase() === label.toLowerCase())) throw new Error(`Confirm ${label} before listing or ordering this item.`)
  }
  return specs
}
export function specificationIssue(item: ProductDetails) {
  try { confirmedSpecifications(item); return '' } catch (error) { return error instanceof Error ? error.message : 'Confirm product specifications.' }
}
export function configurationOf(item: ProductDetails) {
  return confirmedSpecifications(item).sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase())).map(spec => `${spec.label}: ${spec.value}`).join(' · ')
}
export const needsDetails = (item: ProductDetails) => requiredSpecFields(item).length > 0 || (item.specifications != null && item.specifications !== '' && item.specifications !== '[]')
