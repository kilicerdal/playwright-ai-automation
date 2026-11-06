import { journeySchema, type Step } from './contracts';
const login: Step = { action: 'login', actor: 'owner' };
const add: Step = { action: 'add', actor: 'owner', product: 'field-notebook', quantity: 2 };
const checkout: Step = { action: 'checkout', actor: 'owner', csrf: true };
const inspect = (
  resource: 'cart' | 'orders' | 'order' | 'stock',
  actor: 'owner' | 'other' = 'owner',
): Step => ({ action: 'inspect', actor, resource });
const transition = (
  target: 'cancel' | 'refund',
  actor: 'owner' | 'other' = 'owner',
  csrf = true,
): Step => ({ action: 'transition', actor, target, csrf });
const fixture = (id: string, title: string, requirement: string, steps: Step[]) =>
  journeySchema.parse({ id, title, requirement, origin: 'authored-offline-example', steps });
export const journeys = [
  fixture('J-CANCEL', 'Cancellation restores stock once and rejects later refund', 'LIFE-01', [
    login,
    add,
    checkout,
    inspect('cart'),
    transition('cancel'),
    transition('cancel'),
    inspect('stock'),
    transition('refund'),
    inspect('order'),
  ]),
  fixture('J-REFUND', 'Refund restores stock once and survives a fresh login', 'LIFE-01', [
    login,
    add,
    checkout,
    transition('refund'),
    transition('refund'),
    inspect('stock'),
    { action: 'logout', actor: 'owner' },
    login,
    inspect('orders'),
    inspect('order'),
  ]),
  fixture('J-OWNERSHIP', 'Other customers cannot read or finalize an existing order', 'OWNER-01', [
    login,
    add,
    checkout,
    { action: 'login', actor: 'other' },
    inspect('order', 'other'),
    inspect('orders', 'other'),
    transition('cancel', 'other'),
    transition('refund', 'other'),
    inspect('order'),
    inspect('stock'),
  ]),
  fixture(
    'J-REPLAY',
    'Checkout replay preserves one order and one inventory decrement',
    'ORDER-02',
    [login, add, checkout, checkout, inspect('orders'), inspect('stock'), inspect('cart')],
  ),
  fixture('J-LOGOUT', 'Logout invalidates access to cart and order mutations', 'AUTH-01', [
    login,
    add,
    checkout,
    { action: 'logout', actor: 'owner' },
    inspect('cart'),
    checkout,
    inspect('order'),
  ]),
  fixture('J-CSRF', 'Missing CSRF cannot create or finalize an order', 'SEC-01', [
    login,
    add,
    { ...checkout, csrf: false },
    inspect('stock'),
    checkout,
    transition('cancel', 'owner', false),
    transition('refund', 'owner', false),
    inspect('order'),
    inspect('stock'),
  ]),
  fixture('J-CARTS', 'Customer carts stay isolated before and after checkout', 'OWNER-01', [
    login,
    add,
    { action: 'login', actor: 'other' },
    inspect('cart', 'other'),
    { action: 'add', actor: 'other', product: 'atlas-pack', quantity: 1 },
    inspect('cart'),
    checkout,
    inspect('cart', 'other'),
    inspect('orders', 'other'),
  ]),
  fixture(
    'J-STOCK',
    'Sold out additions and empty checkout leave inventory unchanged',
    'STOCK-01',
    [
      login,
      { action: 'add', actor: 'owner', product: 'arc-lamp', quantity: 1 },
      checkout,
      inspect('cart'),
      inspect('stock'),
    ],
  ),
];
