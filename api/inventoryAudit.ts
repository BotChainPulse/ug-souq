import { createHash } from 'node:crypto'

type InventoryState = {
  stock: number
  sizeOptions?: string | null
  productType?: string | null
  requiresSize?: boolean | null
  specifications?: string | null
}

// Audit TEXT columns have a 64 KiB limit. Keep oversized legacy fields as
// fingerprints rather than copying them (or unrelated uploaded images).
function auditField(value: string | null | undefined) {
  if (value == null) return null
  const bytes = Buffer.byteLength(value, 'utf8')
  return bytes <= 8192 ? value : { omitted: true, bytes, sha256: createHash('sha256').update(value).digest('hex') }
}

export function inventoryAuditState(item: InventoryState) {
  return {
    stock: item.stock,
    sizeOptions: auditField(item.sizeOptions),
    productType: item.productType ?? null,
    requiresSize: item.requiresSize ?? null,
    specifications: auditField(item.specifications),
  }
}
