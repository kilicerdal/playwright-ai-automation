import { test, expect } from '../../src/fixtures/commerce';
import { randomUUID } from 'node:crypto';
import { authenticate } from '../support';
test('@CART-01 concurrent distinct additions preserve both lines', async ({ commerce }) => {
  const responses = await Promise.all([commerce.add('atlas-pack'), commerce.add('field-notebook')]);
  expect(responses.map((r) => r.status())).toEqual([200, 200]);
  const cart = await (await commerce.cart()).json();
  expect(cart.count).toBe(2);
  expect(cart.total).toBe(10700);
});
test('@CART-01 concurrent same-product additions accumulate exactly', async ({ commerce }) => {
  await Promise.all(Array.from({ length: 5 }, () => commerce.add('field-notebook')));
  const cart = await (await commerce.cart()).json();
  expect(cart.count).toBe(5);
  expect(cart.items).toHaveLength(1);
  expect(cart.total).toBe(9000);
});
test('@CART-01 concurrent stock boundary never exceeds eight units', async ({ commerce }) => {
  const responses = await Promise.all(Array.from({ length: 10 }, () => commerce.add('atlas-pack')));
  expect(responses.filter((r) => r.status() === 200)).toHaveLength(8);
  expect(responses.filter((r) => r.status() === 409)).toHaveLength(2);
  expect((await (await commerce.cart()).json()).count).toBe(8);
});
test('@ORDER-02 concurrent different checkout keys consume cart once', async ({ commerce }) => {
  await commerce.add('atlas-pack');
  const responses = await Promise.all([commerce.checkout(), commerce.checkout()]);
  expect(responses.map((r) => r.status()).sort()).toEqual([201, 422]);
  expect(await (await commerce.orders()).json()).toHaveLength(1);
});
test('@ORDER-02 conflicting concurrent key payloads preserve first commit', async ({
  commerce,
}) => {
  await commerce.add('atlas-pack');
  const key = randomUUID();
  const responses = await Promise.all([
    commerce.checkout(key, { name: 'Alex', address: '12345' }),
    commerce.checkout(key, { name: 'Other', address: '67890' }),
  ]);
  expect(responses.map((r) => r.status()).sort()).toEqual([201, 409]);
  expect(await (await commerce.orders()).json()).toHaveLength(1);
});
test('@ORDER-02 retry after cart changes returns original order without consuming new bag', async ({
  commerce,
}) => {
  await commerce.add('atlas-pack');
  const key = randomUUID();
  const first = await (await commerce.checkout(key)).json();
  await commerce.add('field-notebook');
  expect(await (await commerce.checkout(key)).json()).toEqual(first);
  expect((await (await commerce.cart()).json()).total).toBe(1800);
});
test('@ORDER-02 same key is independent across sessions', async ({
  commerce,
  playwright,
  baseURL,
}) => {
  const other = await playwright.request.newContext({ baseURL });
  try {
    const client = await authenticate(other);
    await commerce.add('atlas-pack');
    await client.add('field-notebook');
    const key = randomUUID();
    const a = await (await commerce.checkout(key)).json();
    const b = await (await client.checkout(key)).json();
    expect(a.id).not.toBe(b.id);
    expect(a.total).toBe(8900);
    expect(b.total).toBe(1800);
  } finally {
    await other.dispose();
  }
});
test('@ORDER-01 a second purchase has a distinct immutable order', async ({ commerce }) => {
  await commerce.add('atlas-pack');
  const first = await (await commerce.checkout()).json();
  await commerce.add('field-notebook', 2);
  const second = await (await commerce.checkout()).json();
  expect(second.id).not.toBe(first.id);
  expect(second.total).toBe(3600);
  expect(await (await commerce.orders()).json()).toEqual([first, second]);
});
test('@ORDER-01 failed checkout key can be retried after fixing shipping', async ({ commerce }) => {
  await commerce.add('atlas-pack');
  const key = randomUUID();
  expect((await commerce.checkout(key, { name: 'A', address: '12345' })).status()).toBe(422);
  expect((await commerce.checkout(key)).status()).toBe(201);
  expect(await (await commerce.orders()).json()).toHaveLength(1);
});
test('@CART-01 repeated removal is idempotent and preserves another product', async ({
  commerce,
}) => {
  await commerce.add('atlas-pack');
  await commerce.add('field-notebook');
  await Promise.all([commerce.remove('atlas-pack'), commerce.remove('atlas-pack')]);
  const cart = await (await commerce.cart()).json();
  expect(cart.count).toBe(1);
  expect(cart.items[0].productId).toBe('field-notebook');
});
