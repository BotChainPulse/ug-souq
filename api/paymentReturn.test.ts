import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { matchRoutes } from 'react-router'
import { paymentReturnPath } from './paymentReturn'

// Check generated callback URLs against the real client route declarations,
// without connecting to the payment provider or looking up customer orders.
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
const routes = Array.from(app.matchAll(/<Route path="([^"]+)"/g), match => ({ path: match[1] }))

describe('hosted payment return destinations', () => {
  it.each(['successful', 'pending', 'failed', 'reversed', 'invalid'])('opens the registered order-details route for %s', status => {
    const url = new URL(paymentReturnPath('US-TEST-123', status), 'https://www.ugsouq.com')
    const matches = matchRoutes(routes, url.pathname)
    expect(matches?.at(-1)?.route.path).toBe('/orders/:code')
    expect(matches?.at(-1)?.params.code).toBe('US-TEST-123')
    expect(url.searchParams.get('payment')).toBe(status)
  })

  it('returns to My Orders if verification has no order code', () => {
    const url = new URL(paymentReturnPath(null, 'invalid'), 'https://www.ugsouq.com')
    expect(matchRoutes(routes, url.pathname)?.at(-1)?.route.path).toBe('/orders')
    expect(url.searchParams.get('payment')).toBe('invalid')
  })

  it('keeps reserved characters inside the order code and payment query value', () => {
    const url = new URL(paymentReturnPath('US-X?payment=successful#fragment', 'failed&other=value'), 'https://www.ugsouq.com')
    expect(matchRoutes(routes, url.pathname)?.at(-1)?.params.code).toBe('US-X?payment=successful#fragment')
    expect(url.searchParams.get('payment')).toBe('failed&other=value')
    expect(url.searchParams.has('other')).toBe(false)
    expect(url.hash).toBe('')
  })

  it('uses the checked destination builder in the actual payment callback', () => {
    const boot = readFileSync(new URL('./boot.ts', import.meta.url), 'utf8')
    const callback = boot.slice(boot.indexOf('app.get("/api/pesapal/callback"'), boot.indexOf('const ipnHandler'))
    expect(callback).toContain('paymentReturnPath(result.orderCode, result.ok ? "successful" : result.status)')
    expect(callback).not.toContain('`/order/')
  })
})
