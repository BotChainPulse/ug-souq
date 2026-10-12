import { getDb } from './queries/connection'
import { serviceProviders, serviceRequests } from '../db/serviceSchema'
import { eq } from 'drizzle-orm'
export async function deleteCustomerServiceData(tx: Pick<ReturnType<typeof getDb>, 'select' | 'delete'>, customerId: number) {
  const [provider] = await tx.select({ id: serviceProviders.id }).from(serviceProviders).where(eq(serviceProviders.customerId, customerId)).limit(1)
  await tx.delete(serviceRequests).where(eq(serviceRequests.customerId, customerId))
  if (provider) {
    await tx.delete(serviceRequests).where(eq(serviceRequests.providerId, provider.id))
    await tx.delete(serviceProviders).where(eq(serviceProviders.id, provider.id))
  }
}
export const SERVICE_RETENTION_SQL = [
  'DELETE FROM service_requests WHERE created_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 180 DAY)',
  'DELETE FROM service_requests WHERE customer_id NOT IN (SELECT id FROM customers) OR provider_id IN (SELECT id FROM service_providers WHERE customer_id NOT IN (SELECT id FROM customers))',
  "DELETE FROM service_requests WHERE provider_id IN (SELECT id FROM service_providers WHERE status IN ('rejected','suspended') AND reviewed_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 365 DAY))",
  "DELETE FROM service_providers WHERE customer_id NOT IN (SELECT id FROM customers) OR (status IN ('rejected','suspended') AND reviewed_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 365 DAY))",
]
export async function cleanupServiceData() {
  type Client = { query: (statement: string) => unknown; promise?: () => { query: (statement: string) => unknown } }
  const raw = getDb().$client as unknown as Client
  const client = raw.promise ? raw.promise() : raw
  for (const stmt of SERVICE_RETENTION_SQL) await client.query(stmt)
}
