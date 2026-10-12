import { describe, expect, it } from 'vitest'
import { customerMatchesSearch } from '../src/lib/customerSearch'
import { primaryAdminDestination } from './adminDestination'
describe('buyer search and administrator destination', () => {
  const person = { name: 'Example Middle WILLIAMS', phone: '0770123456', email: 'example@test.invalid' }
  it('finds a first name and non-contiguous surname initial', () => {
    expect(customerMatchesSearch(person, 'example w')).toBe(true)
    expect(customerMatchesSearch(person, ' WILLIAMS   EXAMPLE ')).toBe(true)
    expect(customerMatchesSearch(person, 'example z')).toBe(false)
  })
  it('supports phone fragments, email and empty searches without matching punctuation alone', () => {
    expect(customerMatchesSearch(person, '0770 123')).toBe(true)
    expect(customerMatchesSearch(person, 'example@test.invalid')).toBe(true)
    expect(customerMatchesSearch(person, ' ')).toBe(true)
    expect(customerMatchesSearch(person, '+')).toBe(false)
  })
  it('directs the former production admin to the main host without secrets', () => {
    expect(primaryAdminDestination('https://ug-souq-production.up.railway.app/admin/operations?tab=customers&key=private&token=secret')).toBe('https://www.ugsouq.com/admin/operations?tab=customers')
    expect(primaryAdminDestination('https://www.ugsouq.com/admin')).toBeNull()
    expect(primaryAdminDestination('https://ug-souq-production.up.railway.app/api/trpc/admin.customers')).toBeNull()
    expect(primaryAdminDestination('https://ug-souq-production.up.railway.app/administrator')).toBeNull()
    expect(primaryAdminDestination('https://other.up.railway.app/admin')).toBeNull()
  })
})
