import { describe, expect, it, vi } from 'vitest';
vi.hoisted(() => { process.env.ADMIN_KEY = 'synthetic-admin-test-key'; });
vi.mock('./queries/connection', () => ({ getDb: vi.fn(() => { throw new Error('Unauthorised calls must not access data'); }) }));
import { getDb } from './queries/connection';
import { appRouter } from './router';
import { createTRPCClient, httpLink } from '@trpc/client';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import superjson from 'superjson';

const context = { req: new Request('https://example.test'), resHeaders: new Headers() };
describe('administrator access and transport', () => {
 it('verifies login and denies wrong keys before database access', async () => {
  const caller = appRouter.createCaller(context);
  await expect(caller.admin.login({ key: 'synthetic-admin-test-key' })).resolves.toEqual({ ok: true });
  await expect(caller.admin.login({ key: '' })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  await expect(caller.admin.stats({ key: 'wrong-key' })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  expect(getDb).not.toHaveBeenCalled();
 });
 it('keeps administrator query credentials out of URLs using POST transport', async () => {
  const requests: Request[] = [];
  const client = createTRPCClient<typeof appRouter>({ links: [httpLink({
   url: 'https://example.test/api/trpc', transformer: superjson, methodOverride: 'POST',
   fetch: async (url, init) => {
    const req = new Request(url, init); requests.push(req.clone());
    return fetchRequestHandler({ endpoint: '/api/trpc', req, router: appRouter, allowMethodOverride: true, createContext: () => ({ req, resHeaders: new Headers() }) });
   },
  })] });
  await expect(client.admin.stats.query({ key: 'synthetic-wrong-private-key' })).rejects.toMatchObject({ data: { code: 'UNAUTHORIZED' } });
  expect(requests[0].method).toBe('POST');
  expect(requests[0].url).not.toContain('synthetic-wrong-private-key');
  expect(requests[0].url).not.toContain('input=');
  expect(await requests[0].text()).toContain('synthetic-wrong-private-key');
  expect(getDb).not.toHaveBeenCalled();
 });
});
