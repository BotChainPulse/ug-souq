export const HEALTHCARE_CONSENT_VERSION = 'healthcare-directory-2026-10-12'
export const PRESCRIPTION_CONSENT_VERSION = 'private-prescription-photo-2026-10-12'
export const PRESCRIPTION_MAX_BYTES = 600_000
export const PRESCRIPTION_RETENTION_DAYS = 7
export function validLicenceDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0,10) === value
}
export function currentProfessional(p: { status: string; verifiedAt: Date | string | null; licenceExpiresOn: string; facilityLicenceExpiresOn: string }, now = new Date()) {
  if (p.status !== 'approved' || !p.verifiedAt || !validLicenceDate(p.licenceExpiresOn) || !validLicenceDate(p.facilityLicenceExpiresOn)) return false
  const age = now.getTime() - new Date(p.verifiedAt).getTime()
  const kampalaDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kampala', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  return age >= 0 && age <= 30 * 86400_000 && p.licenceExpiresOn >= kampalaDay && p.facilityLicenceExpiresOn >= kampalaDay
}
