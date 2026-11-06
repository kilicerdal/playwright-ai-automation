import { test, expect } from '../../src/fixtures/test';

test('@smoke user can add and remove a product from the cart', async ({
  page,
  loginPage,
  inventoryPage,
}) => {
  await loginPage.goto();
  await loginPage.login(
    process.env.TEST_USERNAME ?? 'standard_user',
    process.env.TEST_PASSWORD ?? 'secret_sauce',
  );
  await inventoryPage.expectLoaded();
  await inventoryPage.addProduct('Sauce Labs Backpack');
  await expect(page.locator('.shopping_cart_badge')).toHaveText('1');
  await inventoryPage.openCart();
  await expect(page).toHaveURL(/\/cart\.html$/);
  const items = page.locator('.cart_item');
  await expect(items).toHaveCount(1);
  await expect(items.locator('.inventory_item_name')).toHaveText('Sauce Labs Backpack');
  await items.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(items).toHaveCount(0);
  await expect(page.locator('.shopping_cart_badge')).toHaveCount(0);
});
