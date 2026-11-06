import { test, expect } from './fixtures';
import { randomUUID } from 'node:crypto';
import {
  PgCommerceStore,
  CommerceError,
  schemaIdentifier,
  dropTestSchema,
} from '../../src/db/store';
import { createDurableServer } from '../../demo/durable-application';
async function stock(db: { store: PgCommerceStore }, id = 'atlas-pack') {
  return (await db.store.pool.query('SELECT available FROM inventory WHERE id=$1', [id])).rows[0]
    .available as number;
}
async function action(
  buyer: { request: import('@playwright/test').APIRequestContext; csrf: string },
  id: string,
  kind: string,
) {
  return buyer.request.post(`/api/orders/${id}/${kind}`, {
    headers: { 'X-CSRF-Token': buyer.csrf },
  });
}
test('@DB-01 health confirms a real PostgreSQL backend', async ({ db }) => {
  const response = await db.request.get('/api/health');
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ backend: 'postgres', version: '3.0.0' });
  expect((await db.store.pool.query('SELECT version()')).rows[0].version).toContain('PostgreSQL');
});
test('@DB-01 migrations rerun without resetting committed inventory', async ({ db, buyer }) => {
  await buyer.add('atlas-pack');
  await buyer.checkout();
  await db.store.migrate();
  expect(await stock(db)).toBe(7);
  expect(
    (await db.store.pool.query('SELECT count(*)::integer AS n FROM schema_migrations')).rows[0].n,
  ).toBe(1);
});
test('@DB-01 applied migration checksum changes fail closed', async ({ db }) => {
  await db.store.pool.query("UPDATE schema_migrations SET checksum='tampered' WHERE version=1");
  await expect(db.store.migrate()).rejects.toThrow('Migration checksum mismatch');
});
test('@DB-01 database prevents negative inventory independently of HTTP validation', async ({
  db,
}) => {
  await expect(
    db.store.pool.query("UPDATE inventory SET available=-1 WHERE id='atlas-pack'"),
  ).rejects.toMatchObject({ code: '23514' });
  expect(await stock(db)).toBe(8);
});
test('@DB-01 database rejects orphan cart records', async ({ db }) => {
  await expect(
    db.store.pool.query('INSERT INTO cart_items(session_id,product_id,quantity) VALUES($1,$2,1)', [
      randomUUID(),
      'atlas-pack',
    ]),
  ).rejects.toMatchObject({ code: '23503' });
});
test('@DB-01 late transaction failure rolls back order stock and cart together', async ({
  db,
  buyer,
}) => {
  await buyer.add('atlas-pack');
  await db.store.pool.query(
    "CREATE FUNCTION reject_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'seeded transaction failure'; END $$; CREATE TRIGGER reject_event BEFORE INSERT ON order_events FOR EACH ROW EXECUTE FUNCTION reject_event();",
  );
  const response = await buyer.checkout();
  expect(response.status()).toBe(503);
  expect(await stock(db)).toBe(8);
  expect((await (await buyer.cart()).json()).count).toBe(1);
  expect((await db.store.pool.query('SELECT count(*)::integer AS n FROM orders')).rows[0].n).toBe(
    0,
  );
  expect(
    (await db.store.pool.query('SELECT count(*)::integer AS n FROM order_items')).rows[0].n,
  ).toBe(0);
});
test('@DB-01 cart and session survive an application restart', async ({ db, buyer }) => {
  await buyer.add('atlas-pack', 2);
  await db.restart();
  expect((await db.request.get('/api/session')).status()).toBe(200);
  expect((await (await db.request.get('/api/cart')).json()).total).toBe(17800);
});
test('@DB-01 order and inventory survive an application restart', async ({ db, buyer }) => {
  await buyer.add('atlas-pack', 2);
  const order = await (await buyer.checkout()).json();
  await db.restart();
  expect(await (await db.request.get(`/api/orders/${order.id}`)).json()).toMatchObject({
    id: order.id,
    total: 17800,
  });
  expect(await stock(db)).toBe(6);
});
test('@OWNER-01 order history survives logout and a new session for the same customer', async ({
  db,
  buyer,
}) => {
  await buyer.add('atlas-pack');
  const order = await (await buyer.checkout()).json();
  await buyer.signOut();
  const newSession = await db.login();
  expect((await (await newSession.orders()).json()).map((o: { id: string }) => o.id)).toEqual([
    order.id,
  ]);
});
test('@STOCK-01 competing customers cannot buy the same last unit', async ({ db, buyer }) => {
  await db.store.pool.query("UPDATE inventory SET available=1 WHERE id='atlas-pack'");
  const second = await db.other();
  await buyer.add('atlas-pack');
  await second.add('atlas-pack');
  const responses = await Promise.all([buyer.checkout(), second.checkout()]);
  expect(responses.map((r) => r.status()).sort()).toEqual([201, 409]);
  expect(await stock(db)).toBe(0);
  expect((await db.store.pool.query('SELECT count(*)::integer AS n FROM orders')).rows[0].n).toBe(
    1,
  );
});
test('@STOCK-01 multi-item shortage preserves every stock line and the entire cart', async ({
  db,
  buyer,
}) => {
  await buyer.add('atlas-pack');
  await buyer.add('field-notebook');
  await db.store.pool.query("UPDATE inventory SET available=0 WHERE id='field-notebook'");
  expect((await buyer.checkout()).status()).toBe(409);
  expect(await stock(db)).toBe(8);
  expect((await (await buyer.cart()).json()).count).toBe(2);
  expect(await (await buyer.orders()).json()).toEqual([]);
});
test('@ORDER-02 concurrent same-key submissions create one durable order', async ({
  db,
  buyer,
}) => {
  await buyer.add('atlas-pack');
  const key = randomUUID();
  const responses = await Promise.all([
    buyer.checkout(key),
    buyer.checkout(key),
    buyer.checkout(key),
  ]);
  expect(responses.map((r) => r.status()).sort()).toEqual([200, 200, 201]);
  expect(await stock(db)).toBe(7);
  expect(
    (await db.store.pool.query('SELECT count(*)::integer AS n FROM order_events')).rows[0].n,
  ).toBe(1);
});
test('@ORDER-02 same customer replays a key across sessions without another decrement', async ({
  db,
  buyer,
}) => {
  await buyer.add('atlas-pack');
  const key = randomUUID(),
    order = await (await buyer.checkout(key)).json();
  const second = await db.other('demo');
  expect((await second.checkout(key)).status()).toBe(200);
  expect((await (await second.checkout(key)).json()).id).toBe(order.id);
  expect(await stock(db)).toBe(7);
});
test('@ORDER-02 different customers can use the same idempotency key independently', async ({
  db,
  buyer,
}) => {
  const second = await db.other();
  await buyer.add('atlas-pack');
  await second.add('atlas-pack');
  const key = randomUUID();
  const a = await (await buyer.checkout(key)).json(),
    b = await (await second.checkout(key)).json();
  expect(a.id).not.toBe(b.id);
  expect(await stock(db)).toBe(6);
});
test('@LIFE-01 cancellation restocks exactly once under concurrent retries', async ({
  db,
  buyer,
}) => {
  await buyer.add('atlas-pack', 2);
  const order = await (await buyer.checkout()).json();
  const responses = await Promise.all([
    action(buyer, order.id, 'cancel'),
    action(buyer, order.id, 'cancel'),
  ]);
  expect(responses.map((r) => r.status())).toEqual([200, 200]);
  expect(await stock(db)).toBe(8);
  expect(
    (
      await db.store.pool.query(
        "SELECT count(*)::integer AS n FROM order_events WHERE kind='cancelled'",
      )
    ).rows[0].n,
  ).toBe(1);
});
test('@LIFE-01 simulated refund restocks exactly once', async ({ db, buyer }) => {
  await buyer.add('atlas-pack');
  const order = await (await buyer.checkout()).json();
  expect((await action(buyer, order.id, 'refund')).status()).toBe(200);
  expect((await (await action(buyer, order.id, 'refund')).json()).status).toBe('refunded');
  expect(await stock(db)).toBe(8);
});
test('@LIFE-01 cancellation and refund race has one terminal state', async ({ db, buyer }) => {
  await buyer.add('atlas-pack');
  const order = await (await buyer.checkout()).json();
  const responses = await Promise.all([
    action(buyer, order.id, 'cancel'),
    action(buyer, order.id, 'refund'),
  ]);
  expect(responses.map((r) => r.status()).sort()).toEqual([200, 409]);
  expect(await stock(db)).toBe(8);
  expect(
    (await db.store.pool.query('SELECT count(*)::integer AS n FROM order_events')).rows[0].n,
  ).toBe(2);
});
test('@OWNER-01 another customer cannot cancel or refund an order', async ({ db, buyer }) => {
  await buyer.add('atlas-pack');
  const order = await (await buyer.checkout()).json(),
    second = await db.other();
  expect((await action(second, order.id, 'cancel')).status()).toBe(404);
  expect((await action(second, order.id, 'refund')).status()).toBe(404);
  expect(await stock(db)).toBe(7);
});
test('@OWNER-01 another customer cannot read an order', async ({ db, buyer }) => {
  await buyer.add('atlas-pack');
  const order = await (await buyer.checkout()).json(),
    second = await db.other();
  expect((await second.request.get(`/api/orders/${order.id}`)).status()).toBe(404);
  expect(await (await second.orders()).json()).toEqual([]);
});
test('@OWNER-01 carts remain session-isolated within the same customer account', async ({
  db,
  buyer,
}) => {
  await buyer.add('atlas-pack');
  const second = await db.other('demo');
  expect((await (await second.cart()).json()).count).toBe(0);
  expect((await (await buyer.cart()).json()).count).toBe(1);
});
test('@ORDER-02 replay after cancellation returns the current order without restocking twice', async ({
  db,
  buyer,
}) => {
  await buyer.add('atlas-pack');
  const key = randomUUID(),
    order = await (await buyer.checkout(key)).json();
  await action(buyer, order.id, 'cancel');
  const replay = await (await buyer.checkout(key)).json();
  expect(replay).toMatchObject({ id: order.id, status: 'cancelled' });
  expect(await stock(db)).toBe(8);
});
test('@DB-01 confirmed order prices are immutable after catalog prices change', async ({
  db,
  buyer,
}) => {
  await buyer.add('atlas-pack');
  const order = await (await buyer.checkout()).json();
  await db.store.pool.query("UPDATE inventory SET price=9900 WHERE id='atlas-pack'");
  expect(await (await buyer.request.get(`/api/orders/${order.id}`)).json()).toMatchObject({
    total: 8900,
    items: [{ unitPrice: 8900 }],
  });
});
test('@OWNER-01 expired database sessions cannot mutate carts', async ({ db, buyer }) => {
  await db.store.pool.query("UPDATE sessions SET expires_at=now()-interval '1 second'");
  expect((await buyer.add('atlas-pack')).status()).toBe(401);
  expect(
    (await db.store.pool.query('SELECT count(*)::integer AS n FROM cart_items')).rows[0].n,
  ).toBe(0);
});
test('@DB-01 SQL-shaped product IDs cannot alter schema or inventory', async ({ db, buyer }) => {
  expect((await buyer.add("atlas-pack'; DROP TABLE inventory;--")).status()).toBe(404);
  expect(
    (await db.store.pool.query('SELECT count(*)::integer AS n FROM inventory')).rows[0].n,
  ).toBe(4);
});
test('@ORDER-02 normalized Unicode shipping payloads replay consistently', async ({ buyer }) => {
  await buyer.add('field-notebook');
  const key = randomUUID();
  const a = await buyer.checkout(key, { name: ' Zoë 李 ', address: ' 12345 桜通り ' });
  const b = await buyer.checkout(key, { name: 'Zoë 李', address: '12345 桜通り' });
  expect(a.status()).toBe(201);
  expect(b.status()).toBe(200);
  expect((await a.json()).id).toBe((await b.json()).id);
});
test('@STOCK-01 placing items in a cart does not reserve shared inventory', async ({
  db,
  buyer,
}) => {
  await buyer.add('atlas-pack', 8);
  expect(await stock(db)).toBe(8);
  const second = await db.other();
  expect((await second.add('atlas-pack', 8)).status()).toBe(200);
});
test('@DB-01 schema names and cleanup are constrained before SQL execution', async () => {
  expect(() => schemaIdentifier('public; DROP SCHEMA public')).toThrow('safe eai_');
  await expect(dropTestSchema('unused', 'eai_showcase')).rejects.toThrow('generated test schemas');
  expect(new CommerceError(409, 'example').status).toBe(409);
});

test('@STOCK-01 independent application instances serialize the last shared item', async ({
  db,
  buyer,
  playwright,
}) => {
  await db.store.pool.query("UPDATE inventory SET available=1 WHERE id='atlas-pack'");
  const secondStore = new PgCommerceStore(db.connectionString, db.schema);
  await secondStore.migrate();
  const server = createDurableServer(secondStore);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No second server address');
  const context = await playwright.request.newContext({
    baseURL: `http://127.0.0.1:${address.port}`,
  });
  try {
    const response = await context.post('/api/session', {
      data: { username: 'buyer2', password: 'demo-pass' },
    });
    const csrf = (await response.json()).csrf;
    await buyer.add('atlas-pack');
    await context.post('/api/cart', {
      data: { productId: 'atlas-pack', quantity: 1 },
      headers: { 'X-CSRF-Token': csrf },
    });
    const responses = await Promise.all([
      buyer.checkout(),
      context.post('/api/orders', {
        data: { name: 'Second Buyer', address: '100 Test Avenue' },
        headers: { 'X-CSRF-Token': csrf, 'Idempotency-Key': randomUUID() },
      }),
    ]);
    expect(responses.map((r) => r.status()).sort()).toEqual([201, 409]);
    expect(await stock(db)).toBe(0);
  } finally {
    await context.dispose();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await secondStore.close();
  }
});
test('@DB-01 database outage returns a correlated error without disclosing connection details', async ({
  playwright,
}) => {
  const store = new PgCommerceStore(
    'postgresql://eai_demo:eai_demo@127.0.0.1:1/eai_quality',
    'eai_outage',
  );
  const server = createDurableServer(store);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No address');
  const context = await playwright.request.newContext({
    baseURL: `http://127.0.0.1:${address.port}`,
  });
  try {
    const response = await context.get('/api/health');
    expect(response.status()).toBe(503);
    const body = await response.json();
    expect(body.error).toBe('Database request unavailable');
    expect(body.requestId).toBe(response.headers()['x-request-id']);
    expect(JSON.stringify(body)).not.toContain('eai_demo');
  } finally {
    await context.dispose();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await store.close();
  }
});
test('@LIFE-01 cancellation requires CSRF and rejects unauthenticated stock changes', async ({
  db,
  buyer,
}) => {
  await buyer.add('atlas-pack');
  const order = await (await buyer.checkout()).json();
  expect((await buyer.request.post(`/api/orders/${order.id}/cancel`)).status()).toBe(403);
  expect(await stock(db)).toBe(7);
  expect((await (await buyer.request.get(`/api/orders/${order.id}`)).json()).status).toBe(
    'confirmed',
  );
});
