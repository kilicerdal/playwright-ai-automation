import { test, expect } from '@playwright/test';
import { isolatedApp, authenticate } from '../support';
import type { PriceCart } from '../../demo/application';
const correct: PriceCart = (items) =>
  items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
const faults: Record<string, PriceCart> = {
  'zero total': () => 0,
  'dollars instead of cents': (items) => correct(items) / 100,
  'quantity ignored': (items) => items.reduce((sum, item) => sum + item.product.price, 0),
  'first line omitted': (items) => correct(items.slice(1)),
  'double charge': (items) => correct(items) * 2,
  'one cent surcharge': (items) => correct(items) + 1,
  'rounded to thousand': (items) => Math.round(correct(items) / 1000) * 1000,
  'cheapest item only': (items) => Math.min(...items.map((i) => i.product.price)),
  'unrequested tax': (items) => Math.round(correct(items) * 1.08),
  'negative charge': (items) => -correct(items),
};
for (const [name, priceCart] of Object.entries(faults))
  test(`@ORDER-01 independent total assertion kills seeded defect: ${name}`, async () => {
    // Authored defect-detection harness; generated drafts are never loaded here.
    const control = await isolatedApp();
    const mutant = await isolatedApp({ priceCart });
    try {
      const good = await authenticate(control.context);
      const bad = await authenticate(mutant.context);
      for (const client of [good, bad]) {
        await client.add('atlas-pack', 2);
        await client.add('field-notebook', 3);
      }
      const baseline = await (await good.checkout()).json();
      const corrupted = await (await bad.checkout()).json();
      expect(baseline.total).toBe(23200);
      let detected = false;
      try {
        expect(corrupted.total).toBe(23200);
      } catch {
        detected = true;
      }
      expect(detected, `Independent assertion must detect ${name}`).toBe(true);
    } finally {
      await control.close();
      await mutant.close();
    }
  });
