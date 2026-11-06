import { createCommerceServer } from './application';
const port = Number(process.env.PORT ?? 4173);
const server = createCommerceServer();
server.listen(port, '127.0.0.1', () =>
  console.log(`Atlas Commerce ready at http://127.0.0.1:${port}`),
);
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => server.close(() => process.exit(0)));
