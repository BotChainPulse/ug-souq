import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { CartProvider } from '../lib/cart'
import Preferences from './Preferences'
describe('truthful communication preferences', () => {
  it('does not represent an unverified email subscription with an enabled browser switch', () => {
    const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(CartProvider, null, createElement(Preferences))))
    const switches = html.match(/<button[^>]*role="switch"[^>]*>/g) ?? []
    const marketing = switches.find(tag => tag.includes('aria-label="Marketing Emails"')) ?? ''
    expect(marketing).toBe('')
    expect(html).toContain('Manage in email')
    const dark = switches.find(tag => tag.includes('aria-label="Dark Mode"')) ?? ''
    expect(dark).not.toContain('disabled=')
    expect(html).toContain('use Unsubscribe in any UGSouq promotional email')
    expect(html).toContain('This page does not display your email subscription status')
    expect(html).toContain('Get unsubscribe help')
  })
})
