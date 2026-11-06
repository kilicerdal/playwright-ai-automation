import { Pool, type PoolClient } from 'pg';
import { randomUUID, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { products, type PriceCart } from '../../demo/application';
export const localDatabaseURL = 'postgresql://eai_demo:eai_demo@127.0.0.1:55432/eai_quality';
export class CommerceError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
export type SessionRecord = { id: string; customer_id: string; csrf: string };
export type PersistedOrder = {
  id: string;
  total: number;
  status: 'confirmed' | 'cancelled' | 'refunded';
  items: { productId: string; quantity: number; unitPrice: number }[];
};
export function schemaIdentifier(schema: string) {
  if (!/^eai_[a-z0-9_]{1,59}$/.test(schema))
    throw new Error('Schema must use a safe eai_ prefix and lowercase identifier');
  return '"' + schema + '"';
}
export class PgCommerceStore {
  readonly pool: Pool;
  private readonly priceCart: PriceCart;
  constructor(
    readonly connectionString: string,
    readonly schema: string,
    priceCart?: PriceCart,
  ) {
    schemaIdentifier(schema);
    this.pool = new Pool({
      connectionString,
      max: 6,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 5000,
      options: `-c search_path=${schema} -c statement_timeout=8000 -c lock_timeout=5000`,
    });
    this.priceCart =
      priceCart ??
      ((items) => items.reduce((sum, item) => sum + item.quantity * item.product.price, 0));
    this.pool.on('error', () => {
      /* request paths surface database failures without connection credentials */
    });
  }
  async migrate() {
    const admin = new Pool({ connectionString: this.connectionString, max: 1 });
    try {
      await admin.query(`CREATE SCHEMA IF NOT EXISTS ${schemaIdentifier(this.schema)}`);
    } finally {
      await admin.end();
    }
    const sql = await readFile(
      new URL('../../migrations/001_commerce.sql', import.meta.url),
      'utf8',
    );
    const checksum = createHash('sha256').update(sql).digest('hex');
    await this.transaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtext(current_schema()))');
      await client.query(
        'CREATE TABLE IF NOT EXISTS schema_migrations(version integer PRIMARY KEY, checksum text NOT NULL)',
      );
      const prior = await client.query('SELECT checksum FROM schema_migrations WHERE version=1');
      if (prior.rowCount) {
        if (prior.rows[0].checksum !== checksum)
          throw new Error('Migration checksum mismatch: do not edit applied migrations');
        return;
      }
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(version,checksum) VALUES(1,$1)', [
        checksum,
      ]);
    });
    await this.transaction(async (client) => {
      await client.query(
        "INSERT INTO customers(id) VALUES('demo'),('buyer2') ON CONFLICT DO NOTHING",
      );
      for (const p of products)
        await client.query(
          'INSERT INTO inventory(id,name,category,price,available,glyph,color) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING',
          [p.id, p.name, p.category, p.price, p.stock, p.glyph, p.color],
        );
    });
  }
  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  async close() {
    await this.pool.end();
  }
  async login(customer: string, oldId?: string) {
    return this.transaction(async (client) => {
      if (oldId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(oldId))
        await client.query('DELETE FROM sessions WHERE id=$1', [oldId]);
      const id = randomUUID(),
        csrf = randomUUID();
      await client.query(
        "INSERT INTO sessions(id,customer_id,csrf,expires_at) VALUES($1,$2,$3,now()+interval '1 hour')",
        [id, customer, csrf],
      );
      return {
        id,
        csrf,
        user: { name: customer === 'demo' ? 'Demo Engineer' : 'Second Buyer', id: customer },
      };
    });
  }
  async session(
    id: string | undefined,
    client: Pool | PoolClient = this.pool,
    lock = false,
  ): Promise<SessionRecord> {
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id))
      throw new CommerceError(401, 'Sign in required');
    const result = await client.query(
      'SELECT id,customer_id,csrf FROM sessions WHERE id=$1 AND expires_at>now()' +
        (lock ? ' FOR UPDATE' : ''),
      [id],
    );
    if (!result.rowCount) throw new CommerceError(401, 'Sign in required');
    return result.rows[0] as SessionRecord;
  }
  async logout(id: string) {
    await this.pool.query('DELETE FROM sessions WHERE id=$1', [id]);
  }
  async catalog(query = '', category = '') {
    const result = await this.pool.query(
      "SELECT id,name,category,price,available AS stock,glyph,color FROM inventory WHERE strpos(lower(name),lower($1))>0 AND ($2='' OR category=$2) ORDER BY id",
      [query, category],
    );
    return result.rows as {
      id: string;
      name: string;
      category: string;
      price: number;
      stock: number;
      glyph: string;
      color: string;
    }[];
  }
  async cart(id: string, client: Pool | PoolClient = this.pool, lockInventory = false) {
    const result = await client.query(
      'SELECT c.product_id,c.quantity,i.name,i.category,i.price,i.available,i.glyph,i.color FROM cart_items c JOIN inventory i ON i.id=c.product_id WHERE c.session_id=$1 ORDER BY c.product_id' +
        (lockInventory ? ' FOR UPDATE OF i' : ''),
      [id],
    );
    const items = result.rows.map((r) => ({
      productId: r.product_id as string,
      quantity: r.quantity as number,
      product: {
        id: r.product_id as string,
        name: r.name as string,
        category: r.category as string,
        price: r.price as number,
        stock: r.available as number,
        glyph: r.glyph as string,
        color: r.color as string,
      },
    }));
    return {
      items,
      total: this.priceCart(items),
      count: items.reduce((sum, item) => sum + item.quantity, 0),
    };
  }
  async add(id: string, productId: string, quantity: number) {
    return this.transaction(async (client) => {
      await this.session(id, client, true);
      const product = await client.query('SELECT available FROM inventory WHERE id=$1', [
        productId,
      ]);
      if (!product.rowCount) throw new CommerceError(404, 'Product not found');
      const previous = await client.query(
        'SELECT quantity FROM cart_items WHERE session_id=$1 AND product_id=$2',
        [id, productId],
      );
      const next = (previous.rows[0]?.quantity ?? 0) + quantity;
      if (next > product.rows[0].available || next > 20)
        throw new CommerceError(409, 'Insufficient stock');
      await client.query(
        'INSERT INTO cart_items(session_id,product_id,quantity) VALUES($1,$2,$3) ON CONFLICT(session_id,product_id) DO UPDATE SET quantity=EXCLUDED.quantity',
        [id, productId, next],
      );
      return this.cart(id, client);
    });
  }
  async remove(id: string, productId: string) {
    return this.transaction(async (client) => {
      await this.session(id, client, true);
      await client.query('DELETE FROM cart_items WHERE session_id=$1 AND product_id=$2', [
        id,
        productId,
      ]);
      return this.cart(id, client);
    });
  }
  private async readOrder(
    client: Pool | PoolClient,
    id: string,
    customer: string,
  ): Promise<PersistedOrder> {
    const result = await client.query(
      'SELECT id,total,status FROM orders WHERE id=$1 AND customer_id=$2',
      [id, customer],
    );
    if (!result.rowCount) throw new CommerceError(404, 'Order not found');
    const items = await client.query(
      'SELECT product_id AS "productId",quantity,unit_price AS "unitPrice" FROM order_items WHERE order_id=$1 ORDER BY product_id',
      [id],
    );
    return { ...result.rows[0], items: items.rows } as PersistedOrder;
  }
  async order(id: string, customer: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id))
      throw new CommerceError(404, 'Order not found');
    return this.readOrder(this.pool, id, customer);
  }
  async orders(customer: string) {
    const ids = await this.pool.query(
      'SELECT id FROM orders WHERE customer_id=$1 ORDER BY created_at,id',
      [customer],
    );
    return Promise.all(ids.rows.map((row) => this.readOrder(this.pool, row.id, customer)));
  }
  async checkout(session: SessionRecord, key: string, shipping: { name: string; address: string }) {
    return this.transaction(async (client) => {
      // Stable lock order: customer, session, then sorted inventory rows.
      await client.query('SELECT id FROM customers WHERE id=$1 FOR UPDATE', [session.customer_id]);
      await this.session(session.id, client, true);
      const fingerprint = createHash('sha256').update(JSON.stringify(shipping)).digest('hex');
      const prior = await client.query(
        'SELECT id,fingerprint FROM orders WHERE customer_id=$1 AND idempotency_key=$2',
        [session.customer_id, key],
      );
      if (prior.rowCount) {
        if (prior.rows[0].fingerprint !== fingerprint)
          throw new CommerceError(409, 'Idempotency key reused with different payload');
        return {
          status: 200,
          order: await this.readOrder(client, prior.rows[0].id, session.customer_id),
        };
      }
      const cart = await this.cart(session.id, client, true);
      if (!cart.items.length) throw new CommerceError(422, 'Your cart is empty');
      for (const item of cart.items) {
        const stock = await client.query('SELECT available FROM inventory WHERE id=$1 FOR UPDATE', [
          item.productId,
        ]);
        if (stock.rows[0].available < item.quantity)
          throw new CommerceError(409, 'Insufficient stock');
      }
      const id = randomUUID();
      await client.query(
        "INSERT INTO orders(id,customer_id,idempotency_key,fingerprint,total,status) VALUES($1,$2,$3,$4,$5,'confirmed')",
        [id, session.customer_id, key, fingerprint, cart.total],
      );
      for (const item of cart.items) {
        const changed = await client.query(
          'UPDATE inventory SET available=available-$1 WHERE id=$2 AND available>=$1 RETURNING available',
          [item.quantity, item.productId],
        );
        if (!changed.rowCount) throw new CommerceError(409, 'Insufficient stock');
        await client.query(
          'INSERT INTO order_items(order_id,product_id,quantity,unit_price) VALUES($1,$2,$3,$4)',
          [id, item.productId, item.quantity, item.product.price],
        );
      }
      await client.query("INSERT INTO order_events(order_id,kind) VALUES($1,'confirmed')", [id]);
      await client.query('DELETE FROM cart_items WHERE session_id=$1', [session.id]);
      return { status: 201, order: await this.readOrder(client, id, session.customer_id) };
    });
  }
  async transition(session: SessionRecord, id: string, target: 'cancelled' | 'refunded') {
    return this.transaction(async (client) => {
      await client.query('SELECT id FROM customers WHERE id=$1 FOR UPDATE', [session.customer_id]);
      await this.session(session.id, client, true);
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id))
        throw new CommerceError(404, 'Order not found');
      const result = await client.query(
        'SELECT status FROM orders WHERE id=$1 AND customer_id=$2 FOR UPDATE',
        [id, session.customer_id],
      );
      if (!result.rowCount) throw new CommerceError(404, 'Order not found');
      if (result.rows[0].status === target) return this.readOrder(client, id, session.customer_id);
      if (result.rows[0].status !== 'confirmed')
        throw new CommerceError(409, 'Order is already finalized');
      const items = await client.query(
        'SELECT product_id,quantity FROM order_items WHERE order_id=$1 ORDER BY product_id',
        [id],
      );
      for (const item of items.rows)
        await client.query('UPDATE inventory SET available=available+$1 WHERE id=$2', [
          item.quantity,
          item.product_id,
        ]);
      await client.query('UPDATE orders SET status=$1 WHERE id=$2', [target, id]);
      await client.query('INSERT INTO order_events(order_id,kind) VALUES($1,$2)', [id, target]);
      return this.readOrder(client, id, session.customer_id);
    });
  }
}
export async function dropTestSchema(connectionString: string, schema: string) {
  if (!/^eai_test_[a-f0-9]{32}$/.test(schema))
    throw new Error('Cleanup is restricted to generated test schemas');
  const pool = new Pool({ connectionString, max: 1 });
  try {
    await pool.query(`DROP SCHEMA ${schemaIdentifier(schema)} CASCADE`);
  } finally {
    await pool.end();
  }
}
