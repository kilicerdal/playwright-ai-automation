import { test, expect } from '../../src/fixtures/commerce';
test('@ORDER-01 failed checkout preserves bag and supports retry', async ({
  signedInShop,
  page,
  commerce,
}) => {
  await signedInShop.add('Atlas Daypack');
  await expect(page.locator('#cart-count')).toHaveText('1');
  await page.route('**/api/orders', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Service unavailable. Please retry.' }),
    }),
  );
  await signedInShop.checkout();
  await expect(page.getByRole('status')).toHaveText('Service unavailable. Please retry.');
  await expect(page.locator('#cart-count')).toHaveText('1');
  await page.unroute('**/api/orders');
  await signedInShop.checkout();
  await expect(page.getByRole('heading', { name: 'Order confirmed.', exact: true })).toBeVisible();
  expect(await (await commerce.orders()).json()).toHaveLength(1);
});
test('@ORDER-02 lost response retry does not duplicate successful order', async ({
  signedInShop,
  page,
  commerce,
}) => {
  await signedInShop.add('Atlas Daypack');
  await expect(page.locator('#cart-count')).toHaveText('1');
  await page.route('**/api/orders', async (route) => {
    await route.fetch();
    await route.abort('failed');
  });
  await signedInShop.checkout();
  await expect(page.getByRole('status')).not.toHaveText('Atlas Daypack added to your bag');
  await page.unroute('**/api/orders');
  await signedInShop.checkout();
  await expect(page.getByRole('heading', { name: 'Order confirmed.', exact: true })).toBeVisible();
  expect(await (await commerce.orders()).json()).toHaveLength(1);
});
