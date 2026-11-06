import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

export const products = [
  {
    id: 'atlas-pack',
    name: 'Atlas Daypack',
    category: 'Carry',
    price: 8900,
    stock: 8,
    glyph: '↗',
    color: 'sage',
  },
  {
    id: 'orbit-headphones',
    name: 'Orbit Headphones',
    category: 'Audio',
    price: 14900,
    stock: 5,
    glyph: '◉',
    color: 'lavender',
  },
  {
    id: 'arc-lamp',
    name: 'Arc Desk Lamp',
    category: 'Workspace',
    price: 6500,
    stock: 0,
    glyph: '⌁',
    color: 'sand',
  },
  {
    id: 'field-notebook',
    name: 'Field Notebook',
    category: 'Workspace',
    price: 1800,
    stock: 20,
    glyph: '▤',
    color: 'blue',
  },
];
type Order = {
  id: string;
  items: { productId: string; quantity: number }[];
  total: number;
  status: 'confirmed';
};
type Session = {
  csrf: string;
  expires: number;
  cart: Map<string, number>;
  orders: Map<string, Order>;
  keys: Map<string, { fingerprint: string; order: Order }>;
};
const sessions = new Map<string, Session>();
const port = Number(process.env.PORT ?? 4173);
const origin = `http://127.0.0.1:${port}`;
const cartSchema = z
  .object({ productId: z.string(), quantity: z.number().int().min(1).max(20) })
  .strict();
const checkoutSchema = z
  .object({ name: z.string().trim().min(2).max(80), address: z.string().trim().min(5).max(200) })
  .strict();
function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}
async function body(req: IncomingMessage): Promise<unknown> {
  let value = '';
  for await (const chunk of req) {
    value += chunk;
    if (value.length > 16384) throw new Error('BODY_TOO_LARGE');
  }
  return value ? JSON.parse(value) : {};
}
function cart(session: Session) {
  const items = [...session.cart].map(([productId, quantity]) => ({
    productId,
    quantity,
    product: products.find((p) => p.id === productId)!,
  }));
  return {
    items,
    total: items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    count: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}
const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  );
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Request-Id', randomUUID());
  const url = new URL(req.url ?? '/', origin);
  const method = req.method ?? 'GET';
  try {
    if (!url.pathname.startsWith('/api/')) {
      const paths: Record<string, [string, string]> = {
        '/': ['index.html', 'text/html'],
        '/app.js': ['app.js', 'text/javascript'],
        '/style.css': ['style.css', 'text/css'],
      };
      const asset = paths[url.pathname];
      if (!asset || method !== 'GET') return send(res, 404, { error: 'Not found' });
      res.writeHead(200, { 'Content-Type': asset[1] });
      res.end(await readFile(new URL(`./public/${asset[0]}`, import.meta.url)));
      return;
    }
    if (url.pathname === '/api/health')
      return send(res, 200, { status: 'healthy', service: 'atlas-commerce', version: '2.0.0' });
    if (method !== 'GET' && req.headers.origin && req.headers.origin !== origin)
      return send(res, 403, { error: 'Origin not allowed' });
    if (url.pathname === '/api/session' && method === 'POST') {
      const parsed = z
        .object({ username: z.literal('demo'), password: z.literal('demo-pass') })
        .strict()
        .safeParse(await body(req));
      if (!parsed.success) return send(res, 401, { error: 'Invalid credentials' });
      // Login rotates and invalidates an existing session.
      const oldId = req.headers.cookie?.match(/(?:^|;\s*)atlas_session=([^;]+)/)?.[1];
      if (oldId) sessions.delete(oldId);
      const id = randomUUID();
      const csrf = randomUUID();
      sessions.set(id, {
        csrf,
        expires: Date.now() + 3600000,
        cart: new Map(),
        orders: new Map(),
        keys: new Map(),
      });
      res.setHeader(
        'Set-Cookie',
        `atlas_session=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600`,
      );
      return send(res, 201, { user: { name: 'Demo Engineer' }, csrf });
    }
    if (url.pathname === '/api/products' && method === 'GET') {
      const query = (url.searchParams.get('q') ?? '').toLowerCase();
      const category = url.searchParams.get('category');
      return send(
        res,
        200,
        products.filter(
          (p) => p.name.toLowerCase().includes(query) && (!category || p.category === category),
        ),
      );
    }
    const id = req.headers.cookie?.match(/(?:^|;\s*)atlas_session=([^;]+)/)?.[1];
    const session = id ? sessions.get(id) : undefined;
    if (!session || session.expires < Date.now()) {
      if (id) sessions.delete(id);
      return send(res, 401, { error: 'Sign in required' });
    }
    if (method !== 'GET' && req.headers['x-csrf-token'] !== session.csrf)
      return send(res, 403, { error: 'Invalid CSRF token' });
    if (url.pathname === '/api/session' && method === 'GET')
      return send(res, 200, { user: { name: 'Demo Engineer' }, csrf: session.csrf });
    if (url.pathname === '/api/session' && method === 'DELETE') {
      sessions.delete(id!);
      res.setHeader('Set-Cookie', 'atlas_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
      return send(res, 200, { signedOut: true });
    }
    if (url.pathname === '/api/cart' && method === 'GET') return send(res, 200, cart(session));
    if (url.pathname === '/api/cart' && method === 'POST') {
      const parsed = cartSchema.safeParse(await body(req));
      if (!parsed.success)
        return send(res, 422, { error: 'Quantity must be an integer from 1 to 20' });
      const product = products.find((p) => p.id === parsed.data.productId);
      if (!product) return send(res, 404, { error: 'Product not found' });
      const quantity = (session.cart.get(product.id) ?? 0) + parsed.data.quantity;
      if (quantity > product.stock) return send(res, 409, { error: 'Insufficient stock' });
      session.cart.set(product.id, quantity);
      return send(res, 200, cart(session));
    }
    if (url.pathname.startsWith('/api/cart/') && method === 'DELETE') {
      session.cart.delete(url.pathname.split('/').pop()!);
      return send(res, 200, cart(session));
    }
    if (url.pathname === '/api/orders' && method === 'POST') {
      const parsed = checkoutSchema.safeParse(await body(req));
      if (!parsed.success) return send(res, 422, { error: 'Enter a name and shipping address' });
      const key = req.headers['idempotency-key'];
      if (typeof key !== 'string' || !/^[a-zA-Z0-9-]{8,100}$/.test(key))
        return send(res, 400, { error: 'Valid Idempotency-Key required' });
      const fingerprint = JSON.stringify(parsed.data);
      const previous = session.keys.get(key);
      if (previous)
        return previous.fingerprint === fingerprint
          ? send(res, 200, previous.order)
          : send(res, 409, { error: 'Idempotency key reused with different payload' });
      if (!session.cart.size) return send(res, 422, { error: 'Your cart is empty' });
      const order: Order = {
        id: randomUUID(),
        items: [...session.cart].map(([productId, quantity]) => ({ productId, quantity })),
        total: cart(session).total,
        status: 'confirmed',
      };
      session.orders.set(order.id, order);
      session.keys.set(key, { fingerprint, order });
      session.cart.clear();
      return send(res, 201, order);
    }
    if (url.pathname === '/api/orders' && method === 'GET')
      return send(res, 200, [...session.orders.values()]);
    if (url.pathname.startsWith('/api/orders/') && method === 'GET') {
      const order = session.orders.get(url.pathname.split('/').pop()!);
      return order ? send(res, 200, order) : send(res, 404, { error: 'Order not found' });
    }
    send(res, 404, { error: 'Not found' });
  } catch (error) {
    send(res, error instanceof Error && error.message === 'BODY_TOO_LARGE' ? 413 : 400, {
      error: 'Invalid request body',
    });
  }
});
const cleanup = setInterval(() => {
  for (const [id, s] of sessions) if (s.expires < Date.now()) sessions.delete(id);
}, 60000);
cleanup.unref();
server.listen(port, '127.0.0.1', () =>
  console.log(`Atlas Commerce ready at ${origin} (${fileURLToPath(import.meta.url)})`),
);
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    clearInterval(cleanup);
    server.close(() => process.exit(0));
  });
