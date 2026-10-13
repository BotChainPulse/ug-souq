import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import ServiceProfileForm from './ServiceProfileForm'
const profile = { businessName: 'Synthetic property provider', category: 'Gardening', district: 'Wakiso', description: 'Synthetic property work description for a test.', experience: 'Synthetic private qualifications', priceUnit: 'quote', startingPrice: null, status: 'approved', revision: 'a'.repeat(64), contactEmail: 'synthetic@example.test' }
describe('service profile editor', () => {
  it('prefills current details and offers Property Services without a clinical category shortcut', () => {
    const html = renderToStaticMarkup(<MemoryRouter><ServiceProfileForm profile={profile} saving={false} onSave={() => undefined} /></MemoryRouter>)
    expect(html).toContain('value="Synthetic property provider"'); expect(html).toContain('selected="">Gardening')
    expect(html).toContain('<option>Property Services</option>')
    expect(html).not.toContain('<option>Doctor</option>'); expect(html).toContain('Existing enquiries remain saved')
    expect(html).toContain('type="checkbox" required=""')
  })
  it('shows saving and errors on the same form', () => {
    const html = renderToStaticMarkup(<MemoryRouter><ServiceProfileForm profile={profile} saving={true} error="Synthetic conflict" onSave={() => undefined} /></MemoryRouter>)
    expect(html).toContain('Submitting changes'); expect(html).toContain('fieldset disabled=""'); expect(html).toContain('Synthetic conflict')
  })
})
