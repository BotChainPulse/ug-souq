import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import ProviderReviewControls from './ProviderReviewControls'
describe('provider decision controls', () => {
  it('lets the administrator open a decision before notes or checks are supplied', () => {
    const html = renderToStaticMarkup(createElement(ProviderReviewControls, { providerName: 'Synthetic provider', busy: false, onOpen: () => undefined, onDecision: async () => ({ok:true}) }))
    expect(html).toContain('Approve profile'); expect(html).toContain('Reject application'); expect(html).toContain('Suspend profile')
    expect(html).not.toContain('disabled='); expect(html).toContain('Choose a decision to open its review form')
  })
  it('blocks duplicate decision submission while a request is pending', () => {
    const html = renderToStaticMarkup(createElement(ProviderReviewControls, { providerName: 'Synthetic provider', busy: true, onOpen: () => undefined, onDecision: async () => ({ok:true}) }))
    expect(html.match(/disabled=""/g)).toHaveLength(3)
  })
})
