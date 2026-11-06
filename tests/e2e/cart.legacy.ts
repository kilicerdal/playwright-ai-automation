import { test, expect } from '../../src/fixtures/test';

test('@smoke user can add a product to the cart', async ({ page, loginPage, inventoryPage }) => {
  await loginPage.goto();
  await loginPage.login(
    process.env.TEST_USERNAME ?? 'standard_user',
    process.env.TEST_PASSWORD ?? 'secret_sauce',
  );
  await inventoryPage.expectLoaded();
  await inventoryPage.addProduct('Sauce Labs Backpack');
  await inventoryPage.openCart();
  await expect(page.getByText('Sauce Labs Backpack')).toBeVisible();
});
