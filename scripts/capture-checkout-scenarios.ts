import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { databaseHarness } from '../tests/postgres/fixtures';
if (execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim())
  throw new Error('Commit capture source first so its source pin is exact');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const cases = [];
for (const scenario of ['replay', 'concurrent', 'changed-payload'] as const) {
  const db = await databaseHarness();
  try {
    const buyer = await db.login();
    const baseline = Number(
      (await db.store.pool.query("SELECT available FROM inventory WHERE id='field-notebook'"))
        .rows[0].available,
    );
    await buyer.add('field-notebook', 2);
    const key = randomUUID();
    const responses =
      scenario === 'concurrent'
        ? await Promise.all([buyer.checkout(key), buyer.checkout(key), buyer.checkout(key)])
        : [
            await buyer.checkout(key),
            await buyer.checkout(key, {
              name: scenario === 'changed-payload' ? 'Changed Synthetic Name' : 'Alex Engineer',
              address: '100 Test Avenue',
            }),
          ];
    const statuses = responses.map((r) => r.status());
    const orders = await (await buyer.orders()).json();
    const stock = Number(
      (await db.store.pool.query("SELECT available FROM inventory WHERE id='field-notebook'"))
        .rows[0].available,
    );
    const cart = await (await buyer.cart()).json();
    assert.deepEqual(
      scenario === 'concurrent' ? [...statuses].sort() : statuses,
      scenario === 'concurrent'
        ? [200, 200, 201]
        : scenario === 'changed-payload'
          ? [201, 409]
          : [201, 200],
    );
    assert.equal(orders.length, 1);
    assert.equal(stock, baseline - 2);
    assert.equal(cart.count, 0);
    const identities = await Promise.all(
      responses.filter((r) => r.status() < 400).map(async (r) => (await r.json()).id),
    );
    assert.equal(new Set(identities).size, 1);
    cases.push({
      id: scenario,
      requestStatuses: scenario === 'concurrent' ? [...statuses].sort() : statuses,
      orderCount: orders.length,
      distinctSuccessfulOrderIdentities: new Set(identities).size,
      stockBefore: baseline,
      stockAfter: stock,
      stockReduction: baseline - stock,
      cartCount: cart.count,
      totalCents: orders[0].total,
    });
  } finally {
    await db.close();
  }
}
const record = {
  schemaVersion: 1,
  capturedAt: new Date().toISOString(),
  origin: 'authored-synthetic-local-capture',
  backend: 'postgres',
  modelCalls: 0,
  source: { repository: 'https://github.com/kilicerdal/playwright-ai-automation', commit },
  cases,
  scope:
    'Each case uses a fresh disposable schema. Concurrent statuses are a sorted result set, not a timeline. No payments, credentials or shipping inputs are exported.',
  reproduction:
    'Start the disposable loopback PostgreSQL lab, then run npm run showcase:capture-checkout.',
};
await mkdir('artifacts', { recursive: true });
await writeFile('artifacts/checkout-scenarios.json', JSON.stringify(record, null, 2) + '\n');
console.log(
  'Captured replay, concurrent and changed-payload checkout: one order, stock reduced by two, empty cart.',
);
