import { test, expect } from './fixtures';
import { checkContract, validateResponse, contractHash } from '../../src/contracts/validate';
import { ShopPage } from '../../src/pages/ShopPage';
test('@CONTRACT-01 versioned OpenAPI document matches the approved baseline', async () => {
  expect(await checkContract()).toMatchObject({ version: '3.0.0', paths: 9 });
});
test('@CONTRACT-01 real database-backed responses satisfy the versioned schemas', async ({
  db,
  buyer,
}) => {
  for (const [path, route] of [
    ['/api/health', '/api/health'],
    ['/api/products', '/api/products'],
    ['/api/session', '/api/session'],
    ['/api/cart', '/api/cart'],
  ] as const) {
    const r = await db.request.get(route);
    expect(await validateResponse(path, 'get', r.status(), await r.json())).toEqual([]);
  }
  await buyer.add('atlas-pack');
  const response = await buyer.checkout();
  const order = await response.json();
  expect(await validateResponse('/api/orders', 'post', response.status(), order)).toEqual([]);
  const changed = await db.request.post(`/api/orders/${order.id}/cancel`, {
    headers: { 'X-CSRF-Token': buyer.csrf },
  });
  expect(
    await validateResponse(
      '/api/orders/{orderId}/cancel',
      'post',
      changed.status(),
      await changed.json(),
    ),
  ).toEqual([]);
});
test('@CONTRACT-01 contract rejects incorrect response types and undocumented statuses', async () => {
  expect(
    await validateResponse('/api/orders', 'post', 201, {
      id: 'not-a-uuid',
      total: '89',
      status: 'done',
      items: [],
    }),
  ).not.toEqual([]);
  expect(await validateResponse('/api/orders', 'post', 202, {})).toEqual([
    'Response is not documented in the versioned contract',
  ]);
  expect(contractHash({ a: 1, b: 2 })).toBe(contractHash({ b: 2, a: 1 }));
  expect(contractHash({ a: '1' })).not.toBe(contractHash({ a: 1 }));
});
test('@LIFE-01 browser checkout and cancellation reflect persisted inventory', async ({
  db,
  buyer,
  context,
  page,
}) => {
  await context.addCookies((await buyer.request.storageState()).cookies);
  await page.goto(db.baseURL);
  await expect(page.getByRole('heading', { name: 'Find your everyday.' })).toBeVisible();
  const shop = new ShopPage(page);
  await shop.add('Atlas Daypack');
  await expect(page.locator('#cart-count')).toHaveText('1');
  await shop.checkout();
  await expect(page.getByRole('heading', { name: 'Order confirmed.', exact: true })).toBeVisible();
  const row = page.locator('#order-history article').first();
  await expect(row).toContainText('confirmed');
  await row.getByRole('button', { name: 'Cancel demo order', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('stock restored');
  await expect(row).toContainText('cancelled');
  expect(
    (await db.store.pool.query("SELECT available FROM inventory WHERE id='atlas-pack'")).rows[0]
      .available,
  ).toBe(8);
});
test('@LIFE-01 browser simulated refund updates durable order status', async ({
  db,
  buyer,
  context,
  page,
}) => {
  await buyer.add('field-notebook');
  await buyer.checkout();
  await context.addCookies((await buyer.request.storageState()).cookies);
  await page.goto(db.baseURL);
  await page.getByRole('button', { name: 'Simulate refund', exact: true }).click();
  await expect(page.locator('#order-history')).toContainText('refunded');
  await expect(page.getByRole('button', { name: 'Simulate refund', exact: true })).toHaveCount(0);
});
test('@OWNER-01 switching browser customers clears the previous order history', async ({
  db,
  buyer,
  context,
  page,
}) => {
  await buyer.add('atlas-pack');
  const order = await (await buyer.checkout()).json();
  await context.addCookies((await buyer.request.storageState()).cookies);
  await page.goto(db.baseURL);
  await expect(page.locator('#order-history')).toContainText(order.id);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  const shop = new ShopPage(page);
  await shop.signIn('buyer2', 'demo-pass');
  await expect(page.locator('#order-history')).toContainText('No orders for this customer yet.');
  await expect(page.locator('#order-history')).not.toContainText(order.id);
});
