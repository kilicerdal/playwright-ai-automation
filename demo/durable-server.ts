import 'dotenv/config';
import { PgCommerceStore, localDatabaseURL } from '../src/db/store';
import { createDurableServer } from './durable-application';
const store = new PgCommerceStore(
  process.env.DATABASE_URL ?? localDatabaseURL,
  process.env.DATABASE_SCHEMA ?? 'eai_showcase',
);
await store.migrate();
const server = createDurableServer(store);
const port = Number(process.env.DURABLE_PORT ?? 4175);
server.listen(port, '127.0.0.1', () =>
  console.log(`Atlas PostgreSQL demo: http://127.0.0.1:${port}`),
);
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => server.close(() => void store.close().then(() => process.exit(0))));
