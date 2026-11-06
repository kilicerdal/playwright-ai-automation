import { request as requests, type APIRequestContext } from '@playwright/test';
import type { Server } from 'node:http';
import { createCommerceServer, type ApplicationOptions } from '../demo/application';
import { CommerceClient } from '../src/api/CommerceClient';
export async function isolatedApp(options: ApplicationOptions = {}) {
  const server = createCommerceServer(options);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test address');
  const baseURL = `http://127.0.0.1:${address.port}`;
  const context = await requests.newContext({ baseURL });
  return {
    server,
    baseURL,
    context,
    close: async () => {
      await context.dispose();
      await closeServer(server);
    },
  };
}
async function closeServer(server: Server) {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}
export async function authenticate(context: APIRequestContext) {
  const response = await context.post('/api/session', {
    data: { username: 'demo', password: 'demo-pass' },
  });
  if (response.status() !== 201) throw new Error('Test authentication failed');
  return new CommerceClient(context, (await response.json()).csrf);
}
