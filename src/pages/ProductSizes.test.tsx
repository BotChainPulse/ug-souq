import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import ProductDetail from './ProductDetail'
import Cart from './Cart'
import SizeStockEditor from '../components/SizeStockEditor'
const fixture = vi.hoisted(() => ({ name: 'Synthetic underwear', specifications: null as string | null, category: 'mens-fashion', sizeOptions: null as string | null }))
vi.mock('../providers/trpc', () => ({ trpc: {
  products: {
    bySlug: { useQuery: () => ({ data: { id: 1, kind: 'product', name: fixture.name, specifications: fixture.specifications, category: fixture.category, sizeOptions: fixture.sizeOptions, price: 20000, stock: 3, image: '/synthetic.png', sellerId: 1, sellerName: 'Synthetic seller', sellerRating: 0, condition: 'new' }, isLoading: false }) },
    browse: { useQuery: () => ({ data: [] }) },
  },
  orders: { create: { useMutation: () => ({ isPending: false }) } },
  plus: { status: { useQuery: () => ({ data: null }) } },
} }))
vi.mock('../lib/cart', async original => ({ ...await original<typeof import('../lib/cart')>(), useCart: () => ({ items: [
  { itemType: 'product', itemId: 1, name: 'Synthetic underwear', price: 20000, qty: 1, size: 'S', sizeRequired: true },
  { itemType: 'product', itemId: 1, name: 'Synthetic underwear', price: 20000, qty: 2, size: 'M', sizeRequired: true },
], subtotal: 60000, count: 3, add: vi.fn(), setQty: vi.fn(), remove: vi.fn(), clear: vi.fn() }) }))
const render = (component: typeof ProductDetail | typeof Cart) => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(component)))
describe('customer size selection', () => {
  beforeEach(() => { fixture.name = 'Synthetic underwear'; fixture.specifications = null; fixture.category = 'mens-fashion'; fixture.sizeOptions = null })
  it('explains why unconfigured underwear cannot be added', () => {
    const html = render(ProductDetail)
    expect(html).toContain('The seller has not confirmed sizes yet')
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Sizes pending<\/button>/)
  })
  it('shows real labels, disables sold-out sizes and requires a deliberate selection', () => {
    fixture.sizeOptions = JSON.stringify([{ label: 'UK 32B', stock: 3 }, { label: 'UK 34B', stock: 0 }])
    const html = render(ProductDetail)
    expect(html).toContain('Available sizes')
    expect(html).toContain('UK 32B')
    expect(html).toMatch(/<option[^>]*disabled=""[^>]*>UK 34B — Out of stock/)
    expect(html).toContain('Select a size')
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Select a size<\/button>/)
  })
  it('does not impose size selection on ordinary electronics', () => {
    fixture.category = 'phones'; fixture.name = 'USB charger'; fixture.specifications = JSON.stringify([{label: 'Connectors', value: 'USB-C'}, {label:'Length', value:'1 m'}, {label:'Compatibility',value:'USB-C devices'}])
    const html = render(ProductDetail)
    expect(html).not.toContain('Choose your size')
    expect(html).not.toContain('disabled=""')
  })
  it('blocks a sneaker even when it was filed under sports', () => {
    fixture.name = 'Running sneakers'; fixture.category = 'sports'
    expect(render(ProductDetail)).toContain('The seller has not confirmed sizes yet')
  })
  it('shows a phone specification warning instead of an enabled purchase button', () => {
    fixture.name = 'Synthetic smartphone'; fixture.category = 'phones'
    const html = render(ProductDetail)
    expect(html).toContain('Product specifications')
    expect(html).toContain('Ordering is unavailable until confirmed')
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Specifications pending<\/button>/)
  })
  it('blocks inconsistent size totals before the customer reaches checkout', () => {
    fixture.sizeOptions = JSON.stringify([{ label: 'EU 42', stock: 2 }])
    const html = render(ProductDetail)
    expect(html).toContain('The seller needs to confirm stock for each size')
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Availability pending<\/button>/)
    expect(html).toContain('Refresh availability')
  })
  it('renders different sizes of one item as separate cart rows', () => {
    const html = render(Cart)
    expect(html).toContain('Size: S'); expect(html).toContain('Size: M')
    expect(html).toContain('UGX 60,000')
  })
  it('provides labelled size and stock controls with sizing-system guidance', () => {
    const html = renderToStaticMarkup(createElement(SizeStockEditor, { value: [{ label: 'EU 42', stock: 2 }], onChange: () => undefined }))
    expect(html).toContain('aria-label="Size 1"')
    expect(html).toContain('aria-label="Stock for size 1"')
    expect(html).toContain('Include the sizing system for underwear and shoes')
  })
})
