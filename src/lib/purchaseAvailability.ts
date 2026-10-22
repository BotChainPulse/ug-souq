import { specificationIssue, type ProductDetails } from './productDetails'
import { needsSize, readSizes, sizeTotal } from './sizes'

// Keep catalogue actions consistent with the checks performed at checkout.
// "ready" means the item details are complete; a sized item still needs a
// deliberate customer selection, and checkout always rechecks current stock.
export function purchaseAvailability(item: ProductDetails & { stock: number }) {
  if (specificationIssue(item)) return { status: 'specifications-pending', label: 'Specifications pending' } as const
  if (needsSize(item)) {
    const sizes = readSizes(item.sizeOptions)
    if (!sizes.length) return { status: 'sizes-pending', label: 'Sizes pending' } as const
    if (sizeTotal(sizes) !== item.stock) return { status: 'stock-review', label: 'Availability pending' } as const
  }
  if (item.stock < 1) return { status: 'out-of-stock', label: 'Out of stock' } as const
  return { status: 'ready', label: 'In stock' } as const
}
