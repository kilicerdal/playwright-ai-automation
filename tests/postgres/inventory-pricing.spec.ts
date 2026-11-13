import { test, expect } from './fixtures';
import type { APIResponse } from '@playwright/test';

// Unexpected HTTP/transport/database failures never earn mutation detection credit.
async function healthy(response: APIResponse, status: number) {
  if (response.status() !== status)
    throw new Error(`Execution error: expected HTTP ${status}, received ${response.status()}`);
  return response.json();
}

test('pricing: multi-line quantities use integer cents and persist unit prices', async ({
  db,
  buyer,
}) => {
  await healthy(await buyer.add('atlas-pack', 2), 200);
  await healthy(await buyer.add('field-notebook', 3), 200);
  const cart = await healthy(await buyer.cart(), 200);
  expect(cart.total, 'MUTATION_ASSERTION cart total in cents').toBe(23200);
  const order = await healthy(await buyer.checkout(), 201);
  expect(order.total, 'MUTATION_ASSERTION order total in cents').toBe(23200);
  const stored = await db.store.pool.query('SELECT total FROM orders WHERE id=$1', [order.id]);
  expect(stored.rows[0].total, 'MUTATION_ASSERTION persisted total').toBe(23200);
  expect(order.items, 'MUTATION_ASSERTION immutable unit prices').toEqual([
    { productId: 'atlas-pack', quantity: 2, unitPrice: 8900 },
    { productId: 'field-notebook', quantity: 3, unitPrice: 1800 },
  ]);
});

test('inventory: exact available quantity is accepted', async ({ buyer }) => {
  const response = await buyer.add('atlas-pack', 8);
  if (![200, 409].includes(response.status())) throw new Error('Execution error: add failed');
  expect(response.status(), 'MUTATION_ASSERTION exact stock boundary').toBe(200);
});

test('inventory: cumulative additions cannot exceed available quantity', async ({ buyer }) => {
  await healthy(await buyer.add('atlas-pack', 5), 200);
  const response = await buyer.add('atlas-pack', 4);
  if (![200, 409].includes(response.status())) throw new Error('Execution error: add failed');
  expect(response.status(), 'MUTATION_ASSERTION cumulative stock boundary').toBe(409);
  const cart = await healthy(await buyer.cart(), 200);
  expect(cart.count, 'MUTATION_ASSERTION rejected addition preserves cart').toBe(5);
});

for (const kind of ['cancel', 'refund']) {
  test(`inventory: checkout decrements and ${kind} restores exactly once`, async ({
    db,
    buyer,
  }) => {
    await healthy(await buyer.add('atlas-pack', 2), 200);
    const order = await healthy(await buyer.checkout(), 201);
    const stock = async () =>
      (await db.store.pool.query("SELECT available FROM inventory WHERE id='atlas-pack'")).rows[0]
        .available;
    expect(await stock(), 'MUTATION_ASSERTION stock after checkout').toBe(6);
    for (let attempt = 0; attempt < 2; attempt++) {
      await healthy(
        await buyer.request.post(`/api/orders/${order.id}/${kind}`, {
          headers: { 'X-CSRF-Token': buyer.csrf },
        }),
        200,
      );
      expect(await stock(), 'MUTATION_ASSERTION stock restored exactly once').toBe(8);
    }
  });
}

test('pricing: fractional dollars are preserved without rounding', async ({ db, buyer }) => {
  await db.store.pool.query("UPDATE inventory SET price=1801 WHERE id='field-notebook'");
  await healthy(await buyer.add('field-notebook', 3), 200);
  expect(
    (await healthy(await buyer.cart(), 200)).total,
    'MUTATION_ASSERTION exact cent arithmetic',
  ).toBe(5403);
  const order = await healthy(await buyer.checkout(), 201);
  expect(order.total, 'MUTATION_ASSERTION exact cent order').toBe(5403);
  expect(order.items[0].unitPrice, 'MUTATION_ASSERTION exact cent snapshot').toBe(1801);
});

test('inventory: every order line is decremented and replay does not decrement twice', async ({
  db,
  buyer,
}) => {
  await healthy(await buyer.add('atlas-pack', 2), 200);
  await healthy(await buyer.add('field-notebook', 3), 200);
  const key = 'multi-line-replay';
  const order = await healthy(await buyer.checkout(key), 201);
  const replay = await healthy(await buyer.checkout(key), 200);
  expect(replay.id, 'MUTATION_ASSERTION replay returns same order').toBe(order.id);
  const rows = (
    await db.store.pool.query(
      "SELECT id,available FROM inventory WHERE id IN ('atlas-pack','field-notebook') ORDER BY id",
    )
  ).rows;
  expect(rows, 'MUTATION_ASSERTION all stock lines after replay').toEqual([
    { id: 'atlas-pack', available: 6 },
    { id: 'field-notebook', available: 17 },
  ]);
});
