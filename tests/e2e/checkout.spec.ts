import { test, expect } from '../../src/fixtures/test';

test.beforeEach(async ({ page, loginPage, inventoryPage }) => {
  await loginPage.goto();
  await loginPage.login('standard_user', 'secret_sauce');
  await inventoryPage.expectLoaded();
  await inventoryPage.addProduct('Sauce Labs Backpack');
  await inventoryPage.addProduct('Sauce Labs Bike Light');
  await inventoryPage.openCart();
  await expect(page.locator('.cart_item')).toHaveCount(2);
  await page.getByRole('button', { name: 'Checkout', exact: true }).click();
});

test('checkout validates required customer fields', async ({ page }) => {
  const proceed = page.getByRole('button', { name: 'Continue', exact: true });
  const error = page.locator('[data-test="error"]');
  await proceed.click();
  await expect(error).toContainText('First Name is required');
  await page.getByPlaceholder('First Name').fill('Demo');
  await proceed.click();
  await expect(error).toContainText('Last Name is required');
  await page.getByPlaceholder('Last Name').fill('Tester');
  await proceed.click();
  await expect(error).toContainText('Postal Code is required');
  await expect(page).toHaveURL(/checkout-step-one\.html$/);
});

test('@smoke checkout calculates totals and completes the demo order', async ({ page }) => {
  await page.getByPlaceholder('First Name').fill('Demo');
  await page.getByPlaceholder('Last Name').fill('Tester');
  await page.getByPlaceholder('Zip/Postal Code').fill('00000');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page).toHaveURL(/checkout-step-two\.html$/);
  await expect(page.locator('.inventory_item_name')).toHaveText([
    'Sauce Labs Backpack',
    'Sauce Labs Bike Light',
  ]);
  const prices = await page.locator('.inventory_item_price').allTextContents();
  const cents = prices.reduce(
    (sum, price) => sum + Math.round(Number(price.replace('$', '')) * 100),
    0,
  );
  expect(cents).toBe(3998);
  const tax = Math.round(cents * 0.08);
  await expect(page.locator('.summary_subtotal_label')).toHaveText(
    `Item total: $${(cents / 100).toFixed(2)}`,
  );
  await expect(page.locator('.summary_tax_label')).toHaveText(`Tax: $${(tax / 100).toFixed(2)}`);
  await expect(page.locator('.summary_total_label')).toHaveText(
    `Total: $${((cents + tax) / 100).toFixed(2)}`,
  );
  await page.getByRole('button', { name: 'Finish', exact: true }).click();
  await expect(page).toHaveURL(/checkout-complete\.html$/);
  await expect(page.getByRole('heading', { name: 'Thank you for your order!' })).toBeVisible();
  await expect(page.locator('.shopping_cart_badge')).toHaveCount(0);
});

test('cancelled checkout preserves the cart', async ({ page }) => {
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page).toHaveURL(/cart\.html$/);
  await expect(page.locator('.cart_item')).toHaveCount(2);
  await expect(page.locator('.shopping_cart_badge')).toHaveText('2');
});
