import { journeySchema, type Journey } from './contracts';
// Independent, deliberately small reference model: no application/store imports.
const catalog = {
  'field-notebook': { price: 1800, stock: 20 },
  'atlas-pack': { price: 8900, stock: 8 },
  'arc-lamp': { price: 6500, stock: 0 },
};
export type Observation = {
  status: number;
  total?: number;
  count?: number;
  state?: string;
  sameOrder?: boolean;
  stock?: Record<string, number>;
};
export function compileJourney(input: Journey) {
  const journey = journeySchema.parse(input);
  const sessions = { owner: false, other: false };
  const carts: Record<'owner' | 'other', Record<string, number>> = { owner: {}, other: {} };
  const stock = Object.fromEntries(Object.entries(catalog).map(([id, p]) => [id, p.stock]));
  let order:
    | { owner: 'owner' | 'other'; total: number; state: string; items: Record<string, number> }
    | undefined;
  return journey.steps.map((step) => {
    const actor = step.actor;
    const cart = () => ({
      total: Object.entries(carts[actor]).reduce(
        (s, [id, q]) => s + catalog[id as keyof typeof catalog].price * q,
        0,
      ),
      count: Object.values(carts[actor]).reduce((s, q) => s + q, 0),
    });
    let expected: Observation = { status: 200 };
    if (step.action === 'login') {
      sessions[actor] = true;
      carts[actor] = {};
      expected.status = 201;
    } else if (step.action === 'inspect' && step.resource === 'stock')
      expected.stock = { ...stock };
    else if (!sessions[actor]) expected.status = 401;
    else if ('csrf' in step && !step.csrf) expected.status = 403;
    else if (step.action === 'logout') {
      sessions[actor] = false;
      carts[actor] = {};
    } else if (step.action === 'add') {
      const next = (carts[actor][step.product] ?? 0) + step.quantity;
      if (next > stock[step.product] || next > 20) expected.status = 409;
      else {
        carts[actor][step.product] = next;
        expected = { status: 200, ...cart() };
      }
    } else if (step.action === 'checkout') {
      if (order?.owner === actor)
        expected = { status: 200, total: order.total, state: order.state, sameOrder: true };
      else if (!cart().count) expected.status = 422;
      else if (Object.entries(carts[actor]).some(([id, q]) => q > stock[id])) expected.status = 409;
      else {
        if (order)
          throw new Error(
            'Journey supports one order owner; use separate journeys for independent orders',
          );
        order = {
          owner: actor,
          total: cart().total,
          state: 'confirmed',
          items: { ...carts[actor] },
        };
        for (const [id, q] of Object.entries(order.items)) stock[id] -= q;
        carts[actor] = {};
        expected = { status: 201, total: order.total, state: order.state };
      }
    } else if (step.action === 'transition') {
      if (!order) throw new Error('Transition needs an earlier successful checkout');
      if (actor !== order.owner) expected.status = 404;
      else {
        const target = step.target === 'cancel' ? 'cancelled' : 'refunded';
        if (order.state !== 'confirmed' && order.state !== target) expected.status = 409;
        else {
          if (order.state === 'confirmed')
            for (const [id, q] of Object.entries(order.items)) stock[id] += q;
          order.state = target;
          expected = { status: 200, total: order.total, state: target, sameOrder: true };
        }
      }
    } else if (step.action === 'inspect') {
      if (step.resource === 'cart') expected = { status: 200, ...cart() };
      if (step.resource === 'orders') expected.count = order?.owner === actor ? 1 : 0;
      if (step.resource === 'order') {
        if (!order) throw new Error('Order inspection needs an earlier successful checkout');
        expected =
          order.owner === actor
            ? { status: 200, total: order.total, state: order.state, sameOrder: true }
            : { status: 404 };
      }
    }
    return { step, expected };
  });
}
