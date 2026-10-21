import { TRPCError } from '@trpc/server'
import { eq } from 'drizzle-orm'
import type { getDb } from './queries/connection'
type InventoryTx = Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0]
import { listings, products } from '../db/schema'
import { needsSize, readSizes, sizeLabel, sizeTotal, validateSizes, type SizeOption } from '../src/lib/sizes'

export function listingSizes(category: string, options: SizeOption[] = []) {
  try {
    const sizes = validateSizes(options)
    if (needsSize({ category, sizeOptions: sizes.length ? sizes : null }) && !sizes.length) throw new Error('Enter sizes and stock for clothing, underwear and shoes.')
    if (sizes.length && (sizeTotal(sizes) < 1 || sizeTotal(sizes) > 10000)) throw new Error('Total size stock must be from 1–10,000.')
    return sizes
  } catch (error) { throw new TRPCError({ code: 'BAD_REQUEST', message: error instanceof Error ? error.message : 'Invalid sizes.' }) }
}

export function reserveSize(item: { name: string; stock: number; category?: string; sizeOptions?: unknown }, requested: string | undefined, qty: number) {
  const sizes = readSizes(item.sizeOptions)
  if (needsSize(item)) {
    if (!sizes.length) throw new TRPCError({ code: 'CONFLICT', message: `${item.name}: sizes are not available yet. Ask the seller to confirm size stock.` })
    if (sizeTotal(sizes) !== item.stock) throw new TRPCError({ code: 'CONFLICT', message: `${item.name}: size stock needs to be reconciled. Ask the seller to confirm availability.` })
    const selected = sizes.find(option => option.label === sizeLabel(requested ?? ''))
    if (!selected) throw new TRPCError({ code: 'BAD_REQUEST', message: `${item.name}: choose an available size on the product page.` })
    if (selected.stock < qty || item.stock < qty) throw new TRPCError({ code: 'CONFLICT', message: `${item.name}, size ${selected.label}: not enough stock. Refresh the product.` })
    const next = sizes.map(option => option.label === selected.label ? { ...option, stock: option.stock - qty } : option)
    return { size: selected.label, stock: sizeTotal(next), sizeOptions: JSON.stringify(next) }
  }
  if (requested) throw new TRPCError({ code: 'BAD_REQUEST', message: `${item.name} does not offer size selection.` })
  if (item.stock < qty) throw new TRPCError({ code: 'CONFLICT', message: `${item.name} has only ${item.stock} left in stock.` })
  return { size: null, stock: item.stock - qty, sizeOptions: null }
}

// The order is locked by both cancellation callers. Lock each inventory row too,
// so a cancellation cannot overwrite a simultaneous purchase or inventory edit.
export async function restoreItemStock(tx: InventoryTx, item: { itemType: string; itemId: number; qty: number; size?: string | null }) {
  if (item.itemType === 'menu_item') return
  const table = item.itemType === 'listing' ? listings : products
  const [row] = await tx.select().from(table).where(eq(table.id, item.itemId)).for('update')
  if (!row) return
  const sizes = readSizes(row.sizeOptions)
  if (item.size) {
    const label = sizeLabel(item.size)
    const found = sizes.find(option => option.label === label)
    const next = found ? sizes.map(option => option.label === label ? { ...option, stock: option.stock + item.qty } : option) : [...sizes, { label, stock: item.qty }]
    await tx.update(table).set({ sizeOptions: JSON.stringify(next), stock: sizeTotal(next) }).where(eq(table.id, item.itemId))
  } else if (!needsSize(row)) {
    await tx.update(table).set({ stock: row.stock + item.qty }).where(eq(table.id, item.itemId))
  }
  // A legacy order has no size. Do not invent size stock; administrator must
  // physically reconcile that return before adding it to size inventory.
}
