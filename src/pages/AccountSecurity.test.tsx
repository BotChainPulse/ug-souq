import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { CartProvider } from '../lib/cart'
import AccountSecurity from './AccountSecurity'

describe('truthful account protection', () => {
  it('explains unavailable PIN protection without collecting a PIN or claiming setup succeeded', () => {
    const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(CartProvider, null, createElement(AccountSecurity))))
    expect(html).toContain('PIN protection is not available yet.')
    expect(html).toContain('did not save a PIN or add account protection')
    expect(html).not.toMatch(/<input[^>]*(?:type="password"|placeholder="Enter 4-6 digit PIN")/)
    expect(html).not.toMatch(/<button[^>]*>Save PIN<\/button>/)
    expect(html).not.toContain('Saved!')
    expect(html).toContain('Your secured device')
    expect(html).toContain('href="/support"')
    expect(html).toContain('No additional verification factor is enabled here.')
  })
})
