import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { CommerceError, PgCommerceStore } from '../src/db/store';
const credentials = z
  .object({ username: z.enum(['demo', 'buyer2']), password: z.literal('demo-pass') })
  .strict();
const add = z.object({ productId: z.string(), quantity: z.number().int().min(1).max(20) }).strict();
const shipping = z
  .object({ name: z.string().trim().min(2).max(80), address: z.string().trim().min(5).max(200) })
  .strict();
async function readBody(req: IncomingMessage): Promise<unknown> {
  let value = '';
  for await (const chunk of req) {
    value += chunk;
    if (value.length > 16384) throw new CommerceError(413, 'Request too large');
  }
  try {
    return value ? JSON.parse(value) : {};
  } catch {
    throw new CommerceError(400, 'Invalid JSON');
  }
}
function json(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}
export function createDurableServer(store: PgCommerceStore) {
  return createServer(async (req, res) => {
    const requestId = randomUUID();
    res.setHeader('X-Request-Id', requestId);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    );
    try {
      if (!/^127\.0\.0\.1:\d+$/.test(req.headers.host ?? ''))
        throw new CommerceError(403, 'Use the loopback address');
      const origin = `http://${req.headers.host}`;
      const url = new URL(req.url ?? '/', origin),
        method = req.method ?? 'GET';
      const cookie = req.headers.cookie?.match(/(?:^|;\s*)atlas_session=([^;]+)/)?.[1];
      const assets: Record<string, [string, string]> = {
        '/': ['index.html', 'text/html'],
        '/app.js': ['app.js', 'text/javascript'],
        '/style.css': ['style.css', 'text/css'],
      };
      if (!url.pathname.startsWith('/api/')) {
        const asset = Object.hasOwn(assets, url.pathname) ? assets[url.pathname] : undefined;
        if (!asset || method !== 'GET') throw new CommerceError(404, 'Not found');
        res.writeHead(200, { 'Content-Type': asset[1] });
        res.end(await readFile(new URL('./public/' + asset[0], import.meta.url)));
        return;
      }
      if (url.pathname === '/api/health' && method === 'GET') {
        await store.pool.query('SELECT 1');
        return json(res, 200, {
          status: 'healthy',
          service: 'atlas-commerce',
          version: '3.0.0',
          backend: 'postgres',
          orderLifecycle: true,
        });
      }
      if (method !== 'GET' && req.headers.origin && req.headers.origin !== origin)
        throw new CommerceError(403, 'Origin not allowed');
      if (url.pathname === '/api/session' && method === 'POST') {
        const parsed = credentials.safeParse(await readBody(req));
        if (!parsed.success) throw new CommerceError(401, 'Invalid credentials');
        const session = await store.login(parsed.data.username, cookie);
        res.setHeader(
          'Set-Cookie',
          `atlas_session=${session.id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600`,
        );
        return json(res, 201, { user: session.user, csrf: session.csrf });
      }
      if (url.pathname === '/api/products' && method === 'GET')
        return json(
          res,
          200,
          await store.catalog(
            url.searchParams.get('q') ?? '',
            url.searchParams.get('category') ?? '',
          ),
        );
      const session = await store.session(cookie);
      if (method !== 'GET' && req.headers['x-csrf-token'] !== session.csrf)
        throw new CommerceError(403, 'Invalid CSRF token');
      if (url.pathname === '/api/session' && method === 'GET')
        return json(res, 200, {
          user: {
            id: session.customer_id,
            name: session.customer_id === 'demo' ? 'Demo Engineer' : 'Second Buyer',
          },
          csrf: session.csrf,
        });
      if (url.pathname === '/api/session' && method === 'DELETE') {
        await store.logout(session.id);
        res.setHeader('Set-Cookie', 'atlas_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
        return json(res, 200, { signedOut: true });
      }
      if (url.pathname === '/api/cart' && method === 'GET')
        return json(res, 200, await store.cart(session.id));
      if (url.pathname === '/api/cart' && method === 'POST') {
        const parsed = add.safeParse(await readBody(req));
        if (!parsed.success)
          throw new CommerceError(422, 'Quantity must be an integer from 1 to 20');
        return json(
          res,
          200,
          await store.add(session.id, parsed.data.productId, parsed.data.quantity),
        );
      }
      if (/^\/api\/cart\/[^/]+$/.test(url.pathname) && method === 'DELETE')
        return json(
          res,
          200,
          await store.remove(session.id, decodeURIComponent(url.pathname.split('/').pop()!)),
        );
      if (url.pathname === '/api/orders' && method === 'POST') {
        const parsed = shipping.safeParse(await readBody(req));
        if (!parsed.success) throw new CommerceError(422, 'Enter a name and shipping address');
        const key = req.headers['idempotency-key'];
        if (typeof key !== 'string' || !/^[a-zA-Z0-9-]{8,100}$/.test(key))
          throw new CommerceError(400, 'Valid Idempotency-Key required');
        const result = await store.checkout(session, key, parsed.data);
        return json(res, result.status, result.order);
      }
      if (url.pathname === '/api/orders' && method === 'GET')
        return json(res, 200, await store.orders(session.customer_id));
      const action = url.pathname.match(/^\/api\/orders\/([^/]+)\/(cancel|refund)$/);
      if (action && method === 'POST')
        return json(
          res,
          200,
          await store.transition(
            session,
            action[1],
            action[2] === 'cancel' ? 'cancelled' : 'refunded',
          ),
        );
      if (/^\/api\/orders\/[^/]+$/.test(url.pathname) && method === 'GET')
        return json(
          res,
          200,
          await store.order(url.pathname.split('/').pop()!, session.customer_id),
        );
      throw new CommerceError(404, 'Not found');
    } catch (error) {
      if (error instanceof CommerceError)
        return json(res, error.status, { error: error.message, requestId });
      return json(res, 503, { error: 'Database request unavailable', requestId });
    }
  });
}
