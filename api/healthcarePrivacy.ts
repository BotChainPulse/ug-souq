import { eq } from 'drizzle-orm'
import { getDb } from './queries/connection'
import { healthcareProfessionals as professionals, prescriptionPhotos as photos } from '../db/healthcareSchema'
export async function deleteCustomerHealthcareData(tx: Pick<ReturnType<typeof getDb>, 'select' | 'delete'>, id: number) {
  const [professional] = await tx.select({ id: professionals.id }).from(professionals).where(eq(professionals.customerId, id)).limit(1)
  await tx.delete(photos).where(eq(photos.customerId, id))
  if (professional) {
    await tx.delete(photos).where(eq(photos.professionalId, professional.id))
    await tx.delete(professionals).where(eq(professionals.id, professional.id))
  }
}
export const HEALTHCARE_RETENTION_SQL = [
  'DELETE FROM prescription_photos WHERE expires_at <= UTC_TIMESTAMP() OR customer_id NOT IN (SELECT id FROM customers) OR professional_id NOT IN (SELECT id FROM healthcare_professionals)',
  "DELETE FROM prescription_photos WHERE professional_id IN (SELECT id FROM healthcare_professionals WHERE status <> 'approved' OR verified_at IS NULL OR verified_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 DAY) OR licence_expires_on < DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+03:00')) OR facility_licence_expires_on < DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+03:00')) OR customer_id NOT IN (SELECT id FROM customers))",
  "DELETE FROM healthcare_professionals WHERE customer_id NOT IN (SELECT id FROM customers) OR (status IN ('rejected','suspended') AND created_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 365 DAY))",
]
export async function cleanupHealthcareData() {
  type Client = { query: (statement: string) => unknown; promise?: () => { query: (statement: string) => unknown } }
  const raw = getDb().$client as unknown as Client; const client = raw.promise ? raw.promise() : raw
  for (const statement of HEALTHCARE_RETENTION_SQL) await client.query(statement)
}
