export type SizeOption = { label: string; stock: number }
export const sizeLabel = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toUpperCase()
export const sizeCategory = (category?: string) => ['mens-fashion', 'womens-fashion', 'shoes'].includes(category ?? '')

export function validateSizes(options: SizeOption[]): SizeOption[] {
  if (!Array.isArray(options) || options.length > 30) throw new Error('Use up to 30 sizes.')
  const seen = new Set<string>()
  return options.map(option => {
    const label = sizeLabel(option.label)
    if (!label || label.length > 32 || (/[<>]/.test(label) || [...label].some(char => char.charCodeAt(0) < 32))) throw new Error('Enter a size label of 1–32 characters.')
    if (seen.has(label)) throw new Error('Each size must appear once.')
    if (!Number.isInteger(option.stock) || option.stock < 0 || option.stock > 10000) throw new Error('Size stock must be a whole number from 0–10,000.')
    seen.add(label)
    return { label, stock: option.stock }
  })
}

export function readSizes(raw: unknown): SizeOption[] {
  try { return validateSizes(typeof raw === 'string' ? JSON.parse(raw) : raw ?? []) } catch { return [] }
}

export const sizeTotal = (options: SizeOption[]) => options.reduce((sum, option) => sum + option.stock, 0)
export function needsSize(item: { category?: string; sizeOptions?: unknown }) {
  return sizeCategory(item.category) || (item.sizeOptions != null && item.sizeOptions !== '' && item.sizeOptions !== '[]')
}
