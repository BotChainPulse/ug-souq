import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { getServerDeliveryQuote } from '../../api/orderValidation'
import { checkoutDeliveryTiming, DELIVERY_ZONES, FOOD_DELIVERY_TIMING } from '../lib/delivery'
import Food from './Food'
import Restaurant from './Restaurant'
import Cart from './Cart'

const fixture = vi.hoisted(() => ({
  itemType: 'menu_item' as 'menu_item' | 'product',
  restaurant: { id: 4, slug: 'chips-chicken-express', name: 'Chips & Chicken Express', cuisine: 'Chips', area: 'Wandegeya', image: '/food.png', rating: 44, open: true, featured: false, deliveryFee: 2000, deliveryMins: 25, minOrder: 6000,
    items: [{ id: 9, name: 'Chips Masala', description: 'Spiced chips', price: 7000, popular: false }] },
}))

vi.mock('../providers/trpc', () => ({ trpc: {
  food: {
    restaurants: { useQuery: () => ({ data: [fixture.restaurant], isLoading: false }) },
    restaurant: { useQuery: () => ({ data: fixture.restaurant, isLoading: false }) },
  },
  plus: { status: { useQuery: () => ({ data: null }) } },
  orders: { create: { useMutation: () => ({ isPending: false }) } },
} }))
vi.mock('../lib/cart', async importOriginal => ({
  ...await importOriginal<typeof import('../lib/cart')>(),
  useCart: () => ({ items: [{ itemType: fixture.itemType, itemId: 9, name: 'Chips Masala', price: 7000, qty: 1 }], subtotal: 7000, count: 1, setQty: vi.fn(), remove: vi.fn(), clear: vi.fn(), add: vi.fn() }),
}))

const render = (component: typeof Food | typeof Restaurant | typeof Cart) =>
  renderToStaticMarkup(createElement(MemoryRouter, null, createElement(component)))

describe('food delivery quote consistency', () => {
  beforeEach(() => { fixture.itemType = 'menu_item' })

  it.each([Food, Restaurant])('does not advertise the legacy restaurant fee or minute estimate', component => {
    const html = render(component)
    expect(html).toContain('Delivery fee shown at checkout')
    expect(html).not.toContain('UGX 2,000')
    expect(html).not.toMatch(/25 min|under 45 minutes|Free delivery/)
    expect(html).toContain('Confirm food availability, the delivery area and timing')
    expect(html).toContain('href="/support"')
  })

  it('shows the server-owned Kampala fee and total, with confirmation guidance for food', () => {
    const html = render(Cart)
    const quote = getServerDeliveryQuote({ zoneId: 'kampala', deliveryMethod: 'door', address: 'Synthetic test address' })
    expect(quote.deliveryFee).toBe(4600)
    expect(html).toContain('UGX 4,600')
    expect(html).toContain('UGX 11,600')
    expect(html).toContain(FOOD_DELIVERY_TIMING)
    expect(html).toContain('Food delivery information')
    expect(html).not.toMatch(/today|tomorrow|business days/)
  })

  it('keeps standard delivery estimates on carts without food', () => {
    fixture.itemType = 'product'
    const html = render(Cart)
    expect(html).toContain('Delivered today – tomorrow')
    expect(html).not.toContain(FOOD_DELIVERY_TIMING)
    expect(html).not.toContain('Food delivery information')
  })

  it('never applies parcel estimates to food for any configured region or method', () => {
    for (const zone of DELIVERY_ZONES) {
      for (const method of ['door', 'pickup'] as const) {
        expect(checkoutDeliveryTiming(zone, method, true)).toBe(FOOD_DELIVERY_TIMING)
        expect(checkoutDeliveryTiming(zone, method, false)).toBe(method === 'door' ? zone.doorEta : zone.pickupEta)
      }
    }
  })
})
