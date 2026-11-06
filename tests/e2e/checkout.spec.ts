import { test, expect } from '../../src/fixtures/commerce';
test('@smoke @ORDER-01 complete shopping journey', async ({ signedInShop, page, commerce }) => {
  await signedInShop.add('Atlas Daypack');
  await expect(page.locator('#cart-count')).toHaveText('1');
  await signedInShop.add('Field Notebook');
  await expect(page.locator('#total')).toHaveText('$107.00');
  await signedInShop.checkout();
  await expect(page.getByRole('heading', { name: 'Order confirmed.', exact: true })).toBeVisible();
  await expect(page.locator('#order-detail')).toContainText('$107.00');
  await expect(page.locator('#cart-count')).toHaveText('0');
  const orders = await (await commerce.orders()).json();
  expect(orders).toHaveLength(1);
  expect(orders[0]).toMatchObject({ total: 10700, status: 'confirmed' });
});
test('@ORDER-01 empty cart checkout preserves form and shows error', async ({
  signedInShop,
  page,
}) => {
  await signedInShop.checkout();
  await expect(page.getByRole('status')).toHaveText('Your cart is empty');
  await expect(page.getByLabel('Full name')).toHaveValue('Alex Engineer');
  await expect(page.getByRole('heading', { name: 'Order confirmed.', exact: true })).toBeHidden();
});
