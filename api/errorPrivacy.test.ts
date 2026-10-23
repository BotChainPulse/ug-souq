import { describe, expect, it, vi } from 'vitest'
vi.mock('./queries/connection', () => ({ getDb: vi.fn(() => { throw new Error('These transport tests must not access the database') }) }))
import { TRPCError } from '@trpc/server'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { createRouter, publicQuery } from './middleware'

const sensitive = 'Failed query: insert into admin_audit_logs params: private-customer-data data:image/jpeg;base64,PRIVATE'
const router = createRouter({
  databaseFailure: publicQuery.query(() => { throw new Error(sensitive) }),
  wrappedFailure: publicQuery.query(() => { throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: sensitive }) }),
  staleInventory: publicQuery.query(() => { throw new TRPCError({ code: 'CONFLICT', message: 'Item changed. Refresh inventory before saving.' }) }),
  invalidSize: publicQuery.query(() => { throw new TRPCError({ code: 'BAD_REQUEST', message: 'Each size must appear once.' }) }),
})

async function responseFor(path: string) {
  const req = new Request(`https://example.test/api/trpc/${path}`)
  const response = await fetchRequestHandler({ req, endpoint: '/api/trpc', router, createContext: () => ({ req, resHeaders: new Headers() }) })
  return { status: response.status, text: await response.text() }
}

describe('API error privacy', () => {
  it.each(['databaseFailure', 'wrappedFailure'])('hides SQL and values from %s responses', async path => {
    const response = await responseFor(path)
    expect(response.status).toBe(500)
    expect(response.text).toContain('Something went wrong. Please try again.')
    for (const value of ['Failed query', 'admin_audit_logs', 'private-customer-data', 'data:image', 'PRIVATE', 'stack']) expect(response.text).not.toContain(value)
  })
  it.each([
    ['staleInventory', 409, 'Item changed. Refresh inventory before saving.'],
    ['invalidSize', 400, 'Each size must appear once.'],
  ])('retains actionable validation for %s', async (path, status, message) => {
    const response = await responseFor(path as string)
    expect(response.status).toBe(status)
    expect(response.text).toContain(message)
  })
})
