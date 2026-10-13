import { createHash } from 'node:crypto'
import type { serviceProviders } from '../db/serviceSchema'
type Provider = typeof serviceProviders.$inferSelect
export const EDITABLE_SERVICE_FIELDS = ['businessName','category','district','description','experience','startingPrice','priceUnit'] as const
export function editableServiceFields(provider: Pick<Provider, typeof EDITABLE_SERVICE_FIELDS[number]>) {
  return { businessName: provider.businessName, category: provider.category, district: provider.district, description: provider.description, experience: provider.experience, startingPrice: provider.startingPrice, priceUnit: provider.priceUnit }
}
export function serviceProfileRevision(provider: Provider) {
  return createHash('sha256').update(JSON.stringify({ ...editableServiceFields(provider), status: provider.status, reviewedAt: provider.reviewedAt })).digest('hex')
}
