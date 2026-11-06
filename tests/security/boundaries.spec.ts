import { test, expect } from '../../src/fixtures/commerce';
import { authenticate, isolatedApp } from '../support';
for (const [name, data] of [
  ['missing password', { username: 'demo' }],
  ['null credentials', null],
  ['array credentials', ['demo', 'demo-pass']],
  ['username case mismatch', { username: 'DEMO', password: 'demo-pass' }],
  ['extra privilege field', { username: 'demo', password: 'demo-pass', role: 'admin' }],
] as const)
  test(`@AUTH-01 rejects ${name} without issuing a session`, async ({ request }) => {
    const response = await request.post('/api/session', { data });
    expect(response.status()).toBe(401);
    expect(response.headers()['set-cookie']).toBeUndefined();
    expect((await request.get('/api/cart')).status()).toBe(401);
  });
test('@SEC-01 forged session cookie is rejected', async ({ request }) => {
  expect(
    (
      await request.get('/api/cart', { headers: { Cookie: 'atlas_session=forged-session' } })
    ).status(),
  ).toBe(401);
});
test('@SEC-01 token from another session cannot authorize mutation', async ({
  commerce,
  playwright,
  baseURL,
}) => {
  const other = await playwright.request.newContext({ baseURL });
  try {
    const client = await authenticate(other);
    expect(
      (
        await commerce.request.post('/api/cart', {
          data: { productId: 'atlas-pack', quantity: 1 },
          headers: { 'X-CSRF-Token': client.csrf },
        })
      ).status(),
    ).toBe(403);
    expect((await (await commerce.cart()).json()).count).toBe(0);
  } finally {
    await other.dispose();
  }
});
test('@AUTH-01 rotated CSRF token cannot be reused', async ({ commerce }) => {
  await commerce.request.post('/api/session', {
    data: { username: 'demo', password: 'demo-pass' },
  });
  expect((await commerce.add('atlas-pack')).status()).toBe(403);
});
test('@SEC-01 cross-origin login does not issue cookie', async ({ request }) => {
  const response = await request.post('/api/session', {
    data: { username: 'demo', password: 'demo-pass' },
    headers: { Origin: 'https://untrusted.example' },
  });
  expect(response.status()).toBe(403);
  expect(response.headers()['set-cookie']).toBeUndefined();
});
test('@SEC-01 cross-origin signout cannot invalidate session', async ({ commerce }) => {
  expect(
    (
      await commerce.request.delete('/api/session', {
        headers: { Origin: 'https://untrusted.example', 'X-CSRF-Token': commerce.csrf },
      })
    ).status(),
  ).toBe(403);
  expect((await commerce.cart()).status()).toBe(200);
});
test('@SEC-01 session response never exposes password or cookie identifier', async ({
  commerce,
}) => {
  const response = await commerce.request.get('/api/session');
  expect(Object.keys(await response.json()).sort()).toEqual(['csrf', 'user']);
  expect(await response.text()).not.toContain('demo-pass');
  expect(response.headers()['cache-control']).toBe('no-store');
});
test('@SEC-01 logout cookie expires at the same root scope', async ({ commerce }) => {
  const response = await commerce.signOut();
  expect(response.headers()['set-cookie']).toContain('Max-Age=0');
  expect(response.headers()['set-cookie']).toContain('Path=/');
});
test('@AUTH-01 session expires at its exact deadline', async () => {
  let now = 1000;
  const app = await isolatedApp({ now: () => now, sessionLifetimeMs: 100 });
  try {
    const client = await authenticate(app.context);
    now = 1099;
    expect((await client.cart()).status()).toBe(200);
    now = 1100;
    expect((await client.cart()).status()).toBe(401);
  } finally {
    await app.close();
  }
});
test('@AUTH-01 expired session cannot submit an existing cart', async () => {
  let now = 1000;
  const app = await isolatedApp({ now: () => now, sessionLifetimeMs: 100 });
  try {
    const client = await authenticate(app.context);
    await client.add('atlas-pack');
    now = 1101;
    expect((await client.checkout()).status()).toBe(401);
    expect((await client.orders()).status()).toBe(401);
  } finally {
    await app.close();
  }
});
test('@SEC-01 prototype-shaped JSON cannot mutate global objects', async ({ commerce }) => {
  const response = await commerce.request.post('/api/cart', {
    data: Buffer.from('{"productId":"atlas-pack","quantity":1,"__proto__":{"polluted":true}}'),
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': commerce.csrf },
  });
  expect(response.status()).toBe(422);
  expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  expect((await (await commerce.cart()).json()).count).toBe(0);
});
