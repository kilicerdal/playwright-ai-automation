import { randomUUID } from 'node:crypto';
import { test, expect } from '../../src/fixtures/commerce';
import { cartSchema, orderSchema, productSchema } from '../../src/api/schemas/commerce';
test.describe('Commerce API', () => {
  test('@smoke @CAT-01 catalog satisfies strict contract', async ({ request }) => {
    const response = await request.get('/api/products');
    expect(response.status()).toBe(200);
    expect(productSchema.array().parse(await response.json())).toHaveLength(4);
  });
  test('@CAT-01 search is case-insensitive and combines category', async ({ request }) => {
    const response = await request.get('/api/products?q=NOTE&category=Workspace');
    expect((await response.json()).map((p: { id: string }) => p.id)).toEqual(['field-notebook']);
  });
  test('@CAT-01 unknown search has empty result', async ({ request }) => {
    expect(await (await request.get('/api/products?q=nonexistent')).json()).toEqual([]);
  });
  test('@smoke @CART-01 cart totals use integer cents', async ({ commerce }) => {
    expect((await commerce.add('atlas-pack', 2)).status()).toBe(200);
    await commerce.add('field-notebook', 3);
    const cart = cartSchema.parse(await (await commerce.cart()).json());
    expect(cart.total).toBe(23200);
    expect(cart.count).toBe(5);
  });
  for (const quantity of [0, -1, 1.5, 21])
    test(`@CART-01 rejects invalid quantity ${quantity}`, async ({ commerce }) => {
      expect((await commerce.add('atlas-pack', quantity)).status()).toBe(422);
      expect((await (await commerce.cart()).json()).count).toBe(0);
    });
  test('@CART-01 unknown product is 404', async ({ commerce }) => {
    expect((await commerce.add('unknown')).status()).toBe(404);
  });
  test('@CART-01 rejects sold-out stock', async ({ commerce }) => {
    expect((await commerce.add('arc-lamp')).status()).toBe(409);
  });
  test('@CART-01 aggregate quantity cannot exceed stock', async ({ commerce }) => {
    await commerce.add('atlas-pack', 8);
    expect((await commerce.add('atlas-pack')).status()).toBe(409);
    expect((await (await commerce.cart()).json()).count).toBe(8);
  });
  test('@CART-01 removes selected item only', async ({ commerce }) => {
    await commerce.add('atlas-pack');
    await commerce.add('field-notebook');
    await commerce.remove('atlas-pack');
    expect(
      (await (await commerce.cart()).json()).items.map((i: { productId: string }) => i.productId),
    ).toEqual(['field-notebook']);
  });
  test('@ORDER-01 rejects empty checkout', async ({ commerce }) => {
    expect((await commerce.checkout()).status()).toBe(422);
  });
  test('@ORDER-01 rejects missing shipping fields', async ({ commerce }) => {
    await commerce.add('atlas-pack');
    expect((await commerce.checkout(randomUUID(), { name: '', address: '' })).status()).toBe(422);
    expect((await (await commerce.cart()).json()).count).toBe(1);
  });
  test('@ORDER-01 rejects missing idempotency key', async ({ commerce }) => {
    await commerce.add('atlas-pack');
    expect(
      (
        await commerce.request.post('/api/orders', {
          data: { name: 'Alex', address: 'Test street' },
          headers: { 'X-CSRF-Token': commerce.csrf },
        })
      ).status(),
    ).toBe(400);
  });
  test('@smoke @ORDER-01 checkout returns contract-valid order and clears cart', async ({
    commerce,
  }) => {
    await commerce.add('atlas-pack', 2);
    const response = await commerce.checkout();
    expect(response.status()).toBe(201);
    const order = orderSchema.parse(await response.json());
    expect(order.total).toBe(17800);
    expect((await (await commerce.cart()).json()).count).toBe(0);
    expect(await (await commerce.orders()).json()).toEqual([order]);
  });
  test('@ORDER-02 duplicate submission creates one order', async ({ commerce }) => {
    await commerce.add('atlas-pack');
    const key = randomUUID();
    const first = await commerce.checkout(key);
    const retry = await commerce.checkout(key);
    expect(first.status()).toBe(201);
    expect(retry.status()).toBe(200);
    expect(await retry.json()).toEqual(await first.json());
    expect(await (await commerce.orders()).json()).toHaveLength(1);
  });
  test('@ORDER-02 concurrent duplicate submissions create one order', async ({ commerce }) => {
    await commerce.add('atlas-pack');
    const key = randomUUID();
    const responses = await Promise.all([
      commerce.checkout(key),
      commerce.checkout(key),
      commerce.checkout(key),
    ]);
    expect(responses.map((r) => r.status()).sort()).toEqual([200, 200, 201]);
    expect(new Set(await Promise.all(responses.map(async (r) => (await r.json()).id))).size).toBe(
      1,
    );
    expect(await (await commerce.orders()).json()).toHaveLength(1);
  });
  test('@ORDER-02 key reused with different payload is rejected', async ({ commerce }) => {
    await commerce.add('atlas-pack');
    const key = randomUUID();
    await commerce.checkout(key);
    expect(
      (
        await commerce.checkout(key, { name: 'Different Buyer', address: 'Another address' })
      ).status(),
    ).toBe(409);
  });
  test('@CART-01 client cannot override price', async ({ commerce }) => {
    const response = await commerce.request.post('/api/cart', {
      data: { productId: 'atlas-pack', quantity: 1, price: 1 },
      headers: { 'X-CSRF-Token': commerce.csrf },
    });
    expect(response.status()).toBe(422);
  });
});
