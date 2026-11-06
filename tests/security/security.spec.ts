import { test, expect } from '../../src/fixtures/commerce';
test.describe('Authentication and trust boundaries', () => {
  test('@AUTH-01 protected resources reject anonymous users', async ({ request }) => {
    for (const path of ['/api/cart', '/api/orders', '/api/session'])
      expect((await request.get(path)).status()).toBe(401);
  });
  test('@AUTH-01 invalid credentials are rejected', async ({ request }) => {
    expect(
      (
        await request.post('/api/session', { data: { username: 'demo', password: 'wrong' } })
      ).status(),
    ).toBe(401);
  });
  test('@SEC-01 session cookie restricts script and cross-site access', async ({ commerce }) => {
    const state = await commerce.request.storageState();
    const cookie = state.cookies.find((c) => c.name === 'atlas_session');
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'Strict' });
  });
  test('@SEC-01 missing CSRF token rejects mutation', async ({ commerce }) => {
    expect(
      (
        await commerce.request.post('/api/cart', { data: { productId: 'atlas-pack', quantity: 1 } })
      ).status(),
    ).toBe(403);
  });
  test('@SEC-01 wrong CSRF token rejects mutation', async ({ commerce }) => {
    expect(
      (
        await commerce.request.post('/api/cart', {
          data: { productId: 'atlas-pack', quantity: 1 },
          headers: { 'X-CSRF-Token': 'wrong' },
        })
      ).status(),
    ).toBe(403);
  });
  test('@SEC-01 cross-origin mutation is rejected', async ({ commerce }) => {
    expect(
      (
        await commerce.request.post('/api/cart', {
          data: { productId: 'atlas-pack', quantity: 1 },
          headers: { 'X-CSRF-Token': commerce.csrf, Origin: 'https://untrusted.example' },
        })
      ).status(),
    ).toBe(403);
  });
  test('@SEC-01 another session cannot read cart or order', async ({
    commerce,
    playwright,
    baseURL,
  }) => {
    await commerce.add('atlas-pack');
    const order = await (await commerce.checkout()).json();
    await commerce.add('field-notebook');
    const other = await playwright.request.newContext({ baseURL });
    try {
      await other.post('/api/session', { data: { username: 'demo', password: 'demo-pass' } });
      expect((await other.get(`/api/orders/${order.id}`)).status()).toBe(404);
      expect((await (await other.get('/api/cart')).json()).count).toBe(0);
    } finally {
      await other.dispose();
    }
  });
  test('@AUTH-01 sign out invalidates copied session cookie', async ({
    commerce,
    playwright,
    baseURL,
  }) => {
    const copy = await playwright.request.newContext({
      baseURL,
      storageState: await commerce.request.storageState(),
    });
    try {
      await commerce.signOut();
      expect((await copy.get('/api/cart')).status()).toBe(401);
    } finally {
      await copy.dispose();
    }
  });
  test('@AUTH-01 login rotates old session', async ({ commerce, playwright, baseURL }) => {
    const copy = await playwright.request.newContext({
      baseURL,
      storageState: await commerce.request.storageState(),
    });
    try {
      await commerce.request.post('/api/session', {
        data: { username: 'demo', password: 'demo-pass' },
      });
      expect((await copy.get('/api/cart')).status()).toBe(401);
    } finally {
      await copy.dispose();
    }
  });
  test('@SEC-01 malformed JSON does not crash server', async ({ commerce }) => {
    const response = await commerce.request.post('/api/cart', {
      data: Buffer.from('{'),
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': commerce.csrf },
    });
    expect(response.status()).toBe(400);
    expect((await commerce.request.get('/api/health')).status()).toBe(200);
  });
  test('@SEC-01 oversized request is rejected', async ({ commerce }) => {
    expect(
      (
        await commerce.request.post('/api/cart', {
          data: { blob: 'a'.repeat(17000) },
          headers: { 'X-CSRF-Token': commerce.csrf },
        })
      ).status(),
    ).toBe(413);
  });
  test('@SEC-01 static traversal cannot expose project files', async ({ request }) => {
    const response = await request.get('/package.json');
    expect(response.status()).toBe(404);
    expect(response.headers()['x-content-type-options']).toBe('nosniff');
    expect(response.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
  });
});
