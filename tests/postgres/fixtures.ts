import {
  test as base,
  expect,
  request as requests,
  type APIRequestContext,
  type TestInfo,
} from '@playwright/test';
import { randomUUID, createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import type { Server } from 'node:http';
import { PgCommerceStore, localDatabaseURL, dropTestSchema } from '../../src/db/store';
import { createDurableServer } from '../../demo/durable-application';
import { CommerceClient } from '../../src/api/CommerceClient';
export function testDatabaseURL() {
  const value = process.env.TEST_DATABASE_URL ?? localDatabaseURL;
  const url = new URL(value);
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/eai_quality')
    throw new Error(
      'Tests require the disposable loopback eai_quality database via TEST_DATABASE_URL',
    );
  return value;
}
async function listen(server: Server) {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const a = server.address();
  if (!a || typeof a === 'string') throw new Error('Missing test address');
  return `http://127.0.0.1:${a.port}`;
}
async function closeServer(server: Server) {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}
export async function databaseHarness() {
  const connectionString = testDatabaseURL(),
    schema = 'eai_test_' + randomUUID().replaceAll('-', '');
  let store = new PgCommerceStore(connectionString, schema);
  await store.migrate();
  let server = createDurableServer(store),
    baseURL = await listen(server);
  let request = await requests.newContext({ baseURL });
  const extra: APIRequestContext[] = [];
  return {
    schema,
    connectionString,
    get store() {
      return store;
    },
    get server() {
      return server;
    },
    get baseURL() {
      return baseURL;
    },
    get request() {
      return request;
    },
    async login(username = 'demo', context = request) {
      const response = await context.post('/api/session', {
        data: { username, password: 'demo-pass' },
      });
      expect(response.status()).toBe(201);
      return new CommerceClient(context, (await response.json()).csrf);
    },
    async other(username = 'buyer2') {
      const context = await requests.newContext({ baseURL });
      extra.push(context);
      const response = await context.post('/api/session', {
        data: { username, password: 'demo-pass' },
      });
      expect(response.status()).toBe(201);
      return new CommerceClient(context, (await response.json()).csrf);
    },
    async restart() {
      const state = await request.storageState();
      for (const context of extra.splice(0)) await context.dispose();
      await request.dispose();
      await closeServer(server);
      await store.close();
      store = new PgCommerceStore(connectionString, schema);
      await store.migrate();
      server = createDurableServer(store);
      baseURL = await listen(server);
      request = await requests.newContext({ baseURL, storageState: state });
    },
    async close() {
      for (const context of extra) await context.dispose();
      await request.dispose();
      await closeServer(server);
      await store.close();
      await dropTestSchema(connectionString, schema);
    },
  };
}
export type DBHarness = Awaited<ReturnType<typeof databaseHarness>>;
async function captureFailure(db: DBHarness, info: TestInfo) {
  const migration = await readFile('migrations/001_commerce.sql', 'utf8');
  let state: unknown;
  try {
    state = {
      inventory: (await db.store.pool.query('SELECT id,available,price FROM inventory ORDER BY id'))
        .rows,
      orders: (
        await db.store.pool.query(
          'SELECT status,count(*)::integer AS count FROM orders GROUP BY status',
        )
      ).rows,
    };
  } catch {
    state = { databaseUnavailable: true };
  }
  const bundle = {
    schemaVersion: 1,
    scenario: info.title,
    project: info.project.name,
    applicationVersion: '3.0.0',
    migrationHash: createHash('sha256').update(migration).digest('hex'),
    seed: 'atlas-catalog-v1',
    commit: process.env.GITHUB_SHA ?? null,
    replay: {
      command: 'npm run test:postgres -- --grep ' + JSON.stringify(info.title),
      setup: 'npm run db:local:start',
      note: 'Fresh generated schema per scenario; no connection strings, session cookies, CSRF values or shipping data included.',
    },
    state,
  };
  const path = info.outputPath('reproduction.json');
  await writeFile(path, JSON.stringify(bundle, null, 2));
  await info.attach('reproduction', { path, contentType: 'application/json' });
  await mkdir('artifacts/reproductions', { recursive: true });
  await writeFile(
    'artifacts/reproductions/' +
      createHash('sha256').update(info.testId).digest('hex').slice(0, 16) +
      '.json',
    JSON.stringify(bundle, null, 2),
  );
}
export const test = base.extend<{ db: DBHarness; buyer: CommerceClient }>({
  db: async ({ playwright }, use, info) => {
    void playwright;
    const db = await databaseHarness();
    try {
      await use(db);
    } finally {
      if (info.status !== info.expectedStatus) await captureFailure(db, info);
      await db.close();
    }
  },
  buyer: async ({ db }, use) => {
    await use(await db.login());
  },
});
export { expect };
