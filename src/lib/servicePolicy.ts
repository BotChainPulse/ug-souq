export const SERVICE_CATEGORIES = ['Cleaning', 'Plumbing', 'Electrical', 'Repairs', 'Painting', 'Moving', 'Tailoring', 'Photography', 'Computers', 'Beauty', 'Gardening', 'Construction', 'Carpentry', 'Welding', 'Roofing', 'Tiling', 'Automotive', 'Property Services', 'Catering', 'Events', 'Tutoring', 'Laundry', 'Pest Control'] as const
export const SERVICE_COMMISSION_BPS = 700
export const SERVICE_PROPOSAL_VERSION = 'services-pilot-2026-10-12'
export function serviceCommission(labourPaid: number, labourRefunded = 0) {
  if (!Number.isSafeInteger(labourPaid) || !Number.isSafeInteger(labourRefunded) || labourPaid < 0 || labourRefunded < 0 || labourRefunded > labourPaid) throw new Error('Invalid paid/refunded labour amounts')
  const netLabour = labourPaid - labourRefunded
  const commission = Math.round(netLabour * SERVICE_COMMISSION_BPS / 10000)
  return { netLabour, commission, providerNet: netLabour - commission }
}
export function sameRegistrationDay(value: Date | string, now = new Date()) {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kampala', year: 'numeric', month: '2-digit', day: '2-digit' })
  return day.format(new Date(value)) === day.format(now)
}
