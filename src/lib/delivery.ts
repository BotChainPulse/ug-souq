// Delivery zones & fees (UGX). Kampala is cheaper/faster; upcountry costs more and takes longer.
export type DeliveryZone = {
  id: string
  label: string
  areas: string[]
  pickupFee: number
  doorFee: number
  pickupEta: string
  doorEta: string
}

export const FOOD_DELIVERY_FEE_NOTICE = 'Delivery fee shown at checkout'
export const FOOD_DELIVERY_TIMING = 'Confirm food timing before ordering'

export function checkoutDeliveryTiming(zone: DeliveryZone, method: 'door' | 'pickup', containsFood: boolean) {
  return containsFood ? FOOD_DELIVERY_TIMING : method === 'door' ? zone.doorEta : zone.pickupEta
}

export const DELIVERY_ZONES: DeliveryZone[] = [
  {
    id: 'kampala',
    label: 'Kampala Region',
    areas: ['Central Business District', 'Nakasero', 'Kololo', 'Makindye', 'Rubaga', 'Kawempe', 'Ntinda', 'Bugolobi', 'Kira', 'Nansana'],
    pickupFee: 2900,
    doorFee: 4600,
    pickupEta: 'Ready for pickup today – tomorrow',
    doorEta: 'Delivered today – tomorrow',
  },
  {
    id: 'upcountry',
    label: 'Outside Kampala',
    areas: ['Entebbe', 'Jinja', 'Mbarara', 'Gulu', 'Mbale', 'Masaka', 'Lira', 'Arua', 'Fort Portal', 'Soroti', 'Hoima', 'Kabale'],
    pickupFee: 5000,
    doorFee: 9000,
    pickupEta: 'Ready for pickup in 1–3 business days',
    doorEta: 'Delivered in 1–3 business days',
  },
]

export const RETURN_POLICY = 'Free return within 7 days for eligible items — unused and in original packaging. Refund via mobile money within 48 hours of approval.'

export const PICKUP_STATIONS: Record<string, string> = {
  kampala: 'UG Souq Pickup Point — Kampala Road, Central Business District',
  upcountry: 'Nearest UG Souq partner agent in your town',
}

// Stations a buyer can choose when "Pickup station" is selected at checkout
export const PICKUP_POINTS: Record<string, { id: string; name: string; detail: string }[]> = {
  kampala: [
    { id: 'cbd', name: 'UG Souq CBD Point', detail: 'Kampala Road, Central Business District' },
    { id: 'kikuubo', name: 'Kikuubo Lane Point', detail: 'Kikuubo Lane, near Nakivubo Stadium' },
    { id: 'ntinda', name: 'Ntinda Point', detail: 'Ntinda Shopping Centre, Ntinda Road' },
    { id: 'makindye', name: 'Makindye Point', detail: 'Makindye, near the military police junction' },
  ],
  upcountry: [
    { id: 'entebbe', name: 'Entebbe Agent', detail: 'Entebbe town centre' },
    { id: 'jinja', name: 'Jinja Agent', detail: 'Jinja main street' },
    { id: 'mbarara', name: 'Mbarara Agent', detail: 'Mbarara High Street' },
    { id: 'gulu', name: 'Gulu Agent', detail: 'Gulu town centre' },
    { id: 'mbale', name: 'Mbale Agent', detail: 'Mbale Republic Street' },
    { id: 'masaka', name: 'Masaka Agent', detail: 'Masaka town centre' },
  ],
}
