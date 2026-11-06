import { randomUUID } from 'node:crypto';
import { request, type APIRequestContext } from '@playwright/test';
import { PgCommerceStore, dropTestSchema, localDatabaseURL } from '../db/store';
import { createDurableServer } from '../../demo/durable-application';
import { compileJourney, type Observation } from './model';
import { journeyHash, type Journey } from './contracts';
export type Fault =
  | 'read-ownership'
  | 'transition-ownership'
  | 'missing-restock'
  | 'double-restock'
  | 'duplicate-replay'
  | 'retained-cart'
  | 'cart-leak'
  | 'history-leak'
  | 'terminal-reopen';
export const faults: Fault[] = [
  'read-ownership',
  'transition-ownership',
  'missing-restock',
  'double-restock',
  'duplicate-replay',
  'retained-cart',
  'cart-leak',
  'history-leak',
  'terminal-reopen',
];
// Faults only alter generated disposable schemas; there is no HTTP switch or production hook.
function injectFault(store: PgCommerceStore, fault: Fault) {
  if (fault === 'read-ownership') {
    const original = store.order.bind(store);
    store.order = (id) => original(id, 'demo');
  }
  if (fault === 'history-leak') {
    const original = store.orders.bind(store);
    store.orders = () => original('demo');
  }
  if (fault === 'cart-leak') {
    const original = store.cart.bind(store);
    let first: string | undefined;
    store.cart = async (id, client, lock) => {
      first ??= id;
      return original(first, client, lock);
    };
  }
  if (
    ['missing-restock', 'double-restock', 'terminal-reopen', 'transition-ownership'].includes(fault)
  ) {
    const original = store.transition.bind(store);
    store.transition = async (session, id, target) => {
      const before = await store.pool.query('SELECT status FROM orders WHERE id=$1', [id]);
      if (fault === 'terminal-reopen' && before.rows[0]?.status !== target)
        await store.pool.query("UPDATE orders SET status='confirmed' WHERE id=$1", [id]);
      const result = await original(
        fault === 'transition-ownership' ? { ...session, customer_id: 'demo' } : session,
        id,
        target,
      );
      if (
        before.rows[0]?.status === 'confirmed' &&
        ['missing-restock', 'double-restock'].includes(fault)
      ) {
        await store.pool.query(
          'UPDATE inventory i SET available=i.available+($2::integer*o.quantity) FROM order_items o WHERE o.order_id=$1 AND o.product_id=i.id',
          [id, fault === 'missing-restock' ? -1 : 1],
        );
      }
      return result;
    };
  }
  if (fault === 'retained-cart' || fault === 'duplicate-replay') {
    const original = store.checkout.bind(store);
    store.checkout = async (session, key, shipping) => {
      const result = await original(session, key, shipping);
      if (fault === 'retained-cart' || result.status === 200) {
        for (const item of result.order.items)
          await store.pool.query(
            'INSERT INTO cart_items(session_id,product_id,quantity) VALUES($1,$2,$3) ON CONFLICT(session_id,product_id) DO UPDATE SET quantity=EXCLUDED.quantity',
            [session.id, item.productId, item.quantity],
          );
      }
      return fault === 'duplicate-replay' && result.status === 200
        ? original(session, randomUUID(), shipping)
        : result;
    };
  }
}
export type StepEvidence = {
  index: number;
  action: string;
  actor: string;
  expected: Observation;
  actual: Observation;
  passed: boolean;
};
export async function executeJourney(
  journey: Journey,
  fault?: Fault,
  onStep?: (step: StepEvidence) => void,
) {
  const compiled = compileJourney(journey); // Reject unsafe/invalid plans before opening a database.
  const connectionString = process.env.TEST_DATABASE_URL ?? localDatabaseURL;
  const url = new URL(connectionString);
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/eai_quality')
    throw new Error('Journeys require the disposable loopback eai_quality database');
  const schema = 'eai_test_' + randomUUID().replaceAll('-', '');
  const store = new PgCommerceStore(connectionString, schema);
  const server = createDurableServer(store);
  const contexts: Partial<Record<'owner' | 'other', APIRequestContext>> = {};
  const csrf: Partial<Record<'owner' | 'other', string>> = {};
  let orderId: string | undefined;
  const observations = [];
  try {
    await store.migrate();
    if (fault) injectFault(store, fault);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing local journey server');
    const baseURL = `http://127.0.0.1:${address.port}`;
    for (const [index, { step, expected }] of compiled.entries()) {
      const actor = step.actor;
      contexts[actor] ??= await request.newContext({ baseURL, timeout: 5000 });
      const context = contexts[actor]!;
      const headers: Record<string, string> = {
        'X-CSRF-Token': 'csrf' in step && !step.csrf ? 'deliberately-invalid' : (csrf[actor] ?? ''),
      };
      let response;
      if (step.action === 'login')
        response = await context.post('/api/session', {
          data: { username: actor === 'owner' ? 'demo' : 'buyer2', password: 'demo-pass' },
        });
      else if (step.action === 'logout')
        response = await context.delete('/api/session', { headers });
      else if (step.action === 'add')
        response = await context.post('/api/cart', {
          headers,
          data: { productId: step.product, quantity: step.quantity },
        });
      else if (step.action === 'checkout')
        response = await context.post('/api/orders', {
          headers: { ...headers, 'Idempotency-Key': 'journey-key-one' },
          data: { name: 'Synthetic Reviewer', address: '123 Example Street' },
        });
      else if (step.action === 'transition') {
        if (!orderId) throw new Error('Journey reference is unavailable');
        response = await context.post(`/api/orders/${orderId}/${step.target}`, { headers });
      } else {
        const path =
          step.resource === 'stock'
            ? '/api/products'
            : step.resource === 'order'
              ? `/api/orders/${orderId}`
              : `/api/${step.resource}`;
        response = await context.get(path);
      }
      if (response.status() >= 500)
        throw new Error(
          'Infrastructure/server failure: journey evaluation invalid; no detection credited',
        );
      const body = await response.json();
      if (step.action === 'login' && response.status() === 201) csrf[actor] = body.csrf;
      const actual: Observation = { status: response.status() };
      if (expected.total !== undefined) actual.total = body.total;
      if (expected.count !== undefined)
        actual.count = Array.isArray(body) ? body.length : body.count;
      if (expected.state !== undefined) actual.state = body.status;
      if (expected.stock)
        actual.stock = Object.fromEntries(
          (body as { id: string; stock: number }[])
            .filter((p) => Object.hasOwn(expected.stock!, p.id))
            .map((p) => [p.id, p.stock]),
        );
      if (expected.sameOrder) actual.sameOrder = body.id === orderId;
      if (step.action === 'checkout' && response.status() === 201) orderId ??= body.id;
      const passed = Object.entries(expected).every(([key, value]) =>
        key === 'stock'
          ? Object.entries(value as Record<string, number>).every(
              ([id, n]) => actual.stock?.[id] === n,
            )
          : actual[key as keyof Observation] === value,
      );
      const observation = {
        index: index + 1,
        action: step.action,
        actor,
        expected,
        actual,
        passed,
      };
      observations.push(observation);
      onStep?.(observation);
      // Stop after a divergence: later states cannot be interpreted against the control model.
      if (!passed) break;
    }
    return {
      id: journey.id,
      title: journey.title,
      requirement: journey.requirement,
      hash: journeyHash(journey),
      origin: journey.origin,
      fault: fault ?? null,
      passed: observations.every((s) => s.passed),
      steps: observations,
    };
  } finally {
    for (const context of Object.values(contexts)) await context.dispose();
    if (server.listening)
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    await store.close();
    await dropTestSchema(connectionString, schema);
  }
}
export async function evaluateJourneys(journeys: Journey[]) {
  const controls = [];
  for (const journey of journeys) controls.push(await executeJourney(journey));
  if (controls.some((c) => !c.passed))
    throw new Error('Journey controls failed: mutation evidence is invalid');
  const mutations = [];
  for (const fault of faults) {
    const results = [];
    for (const journey of journeys) results.push(await executeJourney(journey, fault));
    mutations.push({
      fault,
      detected: results.some((r) => !r.passed),
      detectedBy: results.filter((r) => !r.passed).map((r) => r.id),
      results,
    });
  }
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    origin: 'authored-offline-example',
    modelCalls: 0,
    backend: 'postgres',
    controls,
    mutations,
    detected: mutations.filter((m) => m.detected).length,
    total: mutations.length,
    note: 'Authored multi-step fixtures, independent reference model, actual isolated PostgreSQL applications. Curated faults only; not live AI generation or exhaustive mutation coverage.',
  };
}
