import { describe, expect, it } from 'vitest'
import { serviceCommission, sameRegistrationDay } from '../src/lib/servicePolicy'
describe('proposed service labour commission', () => {
  it('calculates 7% only from the specified labour base', () => { expect(serviceCommission(100000)).toEqual({ netLabour: 100000, commission: 7000, providerNet: 93000 }) })
  it('reverses commission proportionately for labour refunds', () => { expect(serviceCommission(100000, 20000)).toEqual({ netLabour: 80000, commission: 5600, providerNet: 74400 }) })
  it('has no commission on fully refunded or unpaid labour', () => { expect(serviceCommission(100000,100000).commission).toBe(0); expect(serviceCommission(0).commission).toBe(0) })
  it.each([[100,101],[-1,0],[100.5,0],[Infinity,0]])('rejects invalid ledger inputs', (paid,refunded) => { expect(() => serviceCommission(paid,refunded)).toThrow() })
  it('uses Kampala day boundaries for the administrator Today filter', () => {
    expect(sameRegistrationDay('2026-10-11T21:00:00Z',new Date('2026-10-12T12:00:00Z'))).toBe(true)
    expect(sameRegistrationDay('2026-10-11T20:59:59Z',new Date('2026-10-12T12:00:00Z'))).toBe(false)
  })
})
