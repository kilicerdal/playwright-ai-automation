import { test, expect } from '../../src/fixtures/commerce';
import { randomUUID } from 'node:crypto';
const shipping = { name: 'Alex Engineer', address: '100 Test Avenue' };
for (const [name, payload] of [
  ['string quantity', { productId: 'atlas-pack', quantity: '1' }],
  ['missing product', { quantity: 1 }],
  ['null quantity', { productId: 'atlas-pack', quantity: null }],
  ['array payload', [{ productId: 'atlas-pack', quantity: 1 }]],
  ['unexpected nested field', { productId: 'atlas-pack', quantity: 1, metadata: { price: 1 } }],
] as const)
  test(`@CART-01 rejects ${name} without changing an existing bag`, async ({ commerce }) => {
    await commerce.add('field-notebook');
    const before = await (await commerce.cart()).json();
    const response = await commerce.request.post('/api/cart', {
      data: payload,
      headers: { 'X-CSRF-Token': commerce.csrf },
    });
    expect(response.status()).toBe(422);
    expect(await (await commerce.cart()).json()).toEqual(before);
  });
for (const [name, data] of [
  ['minimum length', { name: 'Al', address: '12345' }],
  ['maximum length', { name: 'A'.repeat(80), address: 'B'.repeat(200) }],
  ['Unicode shipping', { name: 'Zoë 李', address: '１２３ 桜通り Tokyo' }],
  ['trimmed shipping', { name: '  Alex  ', address: '  12345  ' }],
] as const)
  test(`@ORDER-01 accepts ${name} shipping`, async ({ commerce }) => {
    await commerce.add('field-notebook');
    const response = await commerce.checkout(randomUUID(), data);
    expect(response.status()).toBe(201);
    expect((await response.json()).total).toBe(1800);
  });
for (const [name, data] of [
  ['one-character name', { name: 'A', address: '12345' }],
  ['too-long name', { name: 'A'.repeat(81), address: '12345' }],
  ['four-character address', { name: 'Alex', address: '1234' }],
  ['too-long address', { name: 'Alex', address: 'A'.repeat(201) }],
  ['whitespace-only name', { name: '   ', address: '12345' }],
] as const)
  test(`@ORDER-01 rejects ${name} and preserves cart`, async ({ commerce }) => {
    await commerce.add('field-notebook');
    expect((await commerce.checkout(randomUUID(), data)).status()).toBe(422);
    expect((await (await commerce.cart()).json()).total).toBe(1800);
    expect(await (await commerce.orders()).json()).toEqual([]);
  });
for (const [name, key, status] of [
  ['short', 'a'.repeat(7), 400],
  ['minimum', 'a'.repeat(8), 201],
  ['maximum', 'b'.repeat(100), 201],
  ['too long', 'c'.repeat(101), 400],
  ['invalid characters', 'key.with.dots', 400],
] as const)
  test(`@ORDER-01 ${name} idempotency key boundary`, async ({ commerce }) => {
    await commerce.add('field-notebook');
    expect((await commerce.checkout(key, shipping)).status()).toBe(status);
  });
test('@CAT-01 search treats regex metacharacters as literal input', async ({ request }) => {
  const response = await request.get('/api/products', { params: { q: '.*' } });
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual([]);
});
