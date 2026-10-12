import { afterEach, describe, expect, it } from 'vitest'
import { currentProfessional, validLicenceDate } from '../src/lib/healthcarePolicy'
import { encryptPrescription, decryptPrescription, prescriptionData, prescriptionStorageReady } from './prescriptionStorage'
const now = new Date('2026-10-12T12:00:00Z')
const profile = { status: 'approved', verifiedAt: now, licenceExpiresOn: '2026-12-31', facilityLicenceExpiresOn: '2026-12-31' }
const photo = Buffer.concat([Buffer.from([255,216,255]), Buffer.alloc(1200,42), Buffer.from([255,217])])
const data = 'data:image/jpeg;base64,' + photo.toString('base64')
afterEach(() => { delete process.env.HEALTHCARE_DOCUMENT_ENCRYPTION_KEY; delete process.env.HEALTHCARE_PRESCRIPTION_ENABLED })
describe('healthcare eligibility and photo storage', () => {
  it('requires approval and a fresh licence review', () => {
    expect(currentProfessional(profile, now)).toBe(true)
    expect(currentProfessional({ ...profile, status: 'pending' }, now)).toBe(false)
    expect(currentProfessional({ ...profile, verifiedAt: null }, now)).toBe(false)
    expect(currentProfessional({ ...profile, verifiedAt: new Date(now.getTime() - 30 * 86400_000 - 1) }, now)).toBe(false)
    expect(currentProfessional({ ...profile, verifiedAt: new Date(now.getTime() + 1) }, now)).toBe(false)
  })
  it('checks both licences using the Kampala calendar day', () => {
    expect(currentProfessional({ ...profile, licenceExpiresOn: '2026-10-11' }, now)).toBe(false)
    expect(currentProfessional({ ...profile, facilityLicenceExpiresOn: '2026-10-11' }, now)).toBe(false)
    expect(currentProfessional({ ...profile, licenceExpiresOn: '2026-10-12' }, new Date('2026-10-12T21:01:00Z'))).toBe(false)
    expect(validLicenceDate('2026-02-30')).toBe(false)
    expect(validLicenceDate('2026-12-31')).toBe(true)
  })
  it('fails closed unless a valid separate encryption key and activation flag exist', () => {
    expect(prescriptionStorageReady()).toBe(false)
    process.env.HEALTHCARE_DOCUMENT_ENCRYPTION_KEY = Buffer.alloc(32,7).toString('base64')
    expect(prescriptionStorageReady()).toBe(false)
    process.env.HEALTHCARE_PRESCRIPTION_ENABLED = 'true'
    expect(prescriptionStorageReady()).toBe(true)
    process.env.HEALTHCARE_DOCUMENT_ENCRYPTION_KEY = 'invalid'
    expect(prescriptionStorageReady()).toBe(false)
  })
  it('encrypts with a fresh nonce and detects tampering or a wrong key', () => {
    process.env.HEALTHCARE_DOCUMENT_ENCRYPTION_KEY = Buffer.alloc(32,7).toString('base64')
    const first = encryptPrescription(data), second = encryptPrescription(data)
    expect(first.iv).not.toBe(second.iv); expect(first.ciphertext).not.toContain(data)
    expect(decryptPrescription(first)).toBe(data)
    expect(() => decryptPrescription({ ...first, tag: '00'.repeat(16) })).toThrow()
    process.env.HEALTHCARE_DOCUMENT_ENCRYPTION_KEY = Buffer.alloc(32,8).toString('base64')
    expect(() => decryptPrescription(first)).toThrow()
  })
  it('rejects HTML, MIME spoofing, incomplete and oversized photos', () => {
    expect(() => prescriptionData('data:text/html;base64,PHNjcmlwdD4=')).toThrow()
    expect(() => prescriptionData('data:image/jpeg;base64,' + Buffer.alloc(1200).toString('base64'))).toThrow()
    expect(() => prescriptionData(data.slice(0,-4))).toThrow()
    expect(() => prescriptionData('data:image/jpeg;base64,' + Buffer.alloc(600_001).toString('base64'))).toThrow()
  })
})
