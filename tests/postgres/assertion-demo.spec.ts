import { test, expect } from './fixtures';
import { mkdir, writeFile } from 'node:fs/promises';

// Teaching comparison only: the status-only example is intentionally incomplete.
// Both variants exercise the same checkout against the same application version.
for (const strength of ['weak', 'strong'] as const) {
  test(`assertion demonstration: ${strength} checkout check`, async ({ db, buyer }) => {
    const added = await buyer.add('atlas-pack', 2);
    if (added.status() !== 200) throw new Error('Execution error: cart setup failed');
    const response = await buyer.checkout();
    if (response.status() >= 500) throw new Error('Execution error: checkout unavailable');
    const observedStock = (
      await db.store.pool.query("SELECT available FROM inventory WHERE id='atlas-pack'")
    ).rows[0].available as number;
    await mkdir('artifacts/assertion-demo', { recursive: true });
    await writeFile(
      `artifacts/assertion-demo/${strength}.json`,
      JSON.stringify({
        strength,
        httpStatus: response.status(),
        initialStock: 8,
        purchasedQuantity: 2,
        expectedStock: 6,
        observedStock,
      }),
    );
    expect(response.status(), 'MUTATION_ASSERTION checkout response status').toBe(201);
    if (strength === 'strong')
      expect(observedStock, 'MUTATION_ASSERTION purchased stock is deducted').toBe(6);
  });
}
