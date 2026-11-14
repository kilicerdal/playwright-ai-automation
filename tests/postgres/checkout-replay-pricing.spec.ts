import { test, expect } from './fixtures';

test('same-key multi-line checkout replay preserves prices after catalog changes', async ({
  db,
  buyer,
}) => {
  const atlasResponse = await buyer.add('atlas-pack', 2);
  expect(atlasResponse.status()).toBe(200);
  const notebookResponse = await buyer.add('field-notebook', 3);
  expect(notebookResponse.status()).toBe(200);

  const key = 'price-change-multi-line';
  const firstResponse = await buyer.checkout(key);
  expect(firstResponse.status()).toBe(201);
  const order = await firstResponse.json();
  expect(order.total, 'Initial checkout total pricing').toBe(23200);
  expect(order.items, 'Initial checkout item pricing').toEqual([
    { productId: 'atlas-pack', quantity: 2, unitPrice: 8900 },
    { productId: 'field-notebook', quantity: 3, unitPrice: 1800 },
  ]);

  await db.store.pool.query("UPDATE inventory SET price=9900 WHERE id='atlas-pack'");
  await db.store.pool.query("UPDATE inventory SET price=2500 WHERE id='field-notebook'");
  const catalogPrices = await db.store.pool.query(
    "SELECT id,price FROM inventory WHERE id IN ('atlas-pack','field-notebook') ORDER BY id",
  );
  expect(catalogPrices.rows).toEqual([
    { id: 'atlas-pack', price: 9900 },
    { id: 'field-notebook', price: 2500 },
  ]);

  const replayResponse = await buyer.checkout(key);
  expect(replayResponse.status()).toBe(200);
  const replay = await replayResponse.json();
  expect(replay.id).toBe(order.id);
  expect(replay.total).toBe(23200);
  expect(replay.items).toEqual([
    { productId: 'atlas-pack', quantity: 2, unitPrice: 8900 },
    { productId: 'field-notebook', quantity: 3, unitPrice: 1800 },
  ]);

  const persistedOrder = await db.store.pool.query('SELECT total FROM orders WHERE id=$1', [
    order.id,
  ]);
  expect(persistedOrder.rows[0].total).toBe(23200);
  const persistedItems = await db.store.pool.query(
    'SELECT product_id AS "productId",quantity,unit_price AS "unitPrice" FROM order_items WHERE order_id=$1 ORDER BY product_id',
    [order.id],
  );
  expect(persistedItems.rows).toEqual([
    { productId: 'atlas-pack', quantity: 2, unitPrice: 8900 },
    { productId: 'field-notebook', quantity: 3, unitPrice: 1800 },
  ]);

  const orders = await db.store.pool.query('SELECT count(*)::integer AS count FROM orders');
  expect(orders.rows[0].count).toBe(1);
  const stock = await db.store.pool.query(
    "SELECT id,available FROM inventory WHERE id IN ('atlas-pack','field-notebook') ORDER BY id",
  );
  expect(stock.rows).toEqual([
    { id: 'atlas-pack', available: 6 },
    { id: 'field-notebook', available: 17 },
  ]);
});
