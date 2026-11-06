import { test, expect } from '../../src/fixtures/commerce';
test('@smoke @AUTH-01 user can sign in and sign out', async ({ shop, page }) => {
  await shop.goto();
  await shop.signIn();
  await expect(page.getByRole('heading', { name: 'Find your everyday.' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('You are signed out');
  await page.reload();
  await expect(page.getByLabel('Username', { exact: true })).toBeVisible();
});
test('@AUTH-01 invalid login shows feedback', async ({ shop, page }) => {
  await shop.goto();
  await shop.signIn('demo', 'bad');
  await expect(page.getByRole('status')).toHaveText('Invalid credentials');
  await expect(page.getByLabel('Username', { exact: true })).toBeVisible();
});
test('@CAT-01 search filters and announces empty state', async ({ signedInShop, page }) => {
  await signedInShop.goto();
  await page.getByLabel('Search collection').fill('NOTE');
  await expect(page.locator('#products article')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Field Notebook', exact: true })).toBeVisible();
  await page.getByLabel('Search collection').fill('does-not-exist');
  await expect(page.getByText('No products match your search.')).toBeVisible();
});
test('@CAT-01 category filter selects workspace items', async ({ signedInShop, page }) => {
  await signedInShop.goto();
  await page.getByLabel('Category', { exact: true }).selectOption('Workspace');
  await expect(page.locator('#products article')).toHaveCount(2);
});
test('@UX-01 sold-out product cannot be added', async ({ signedInShop, page }) => {
  await signedInShop.goto();
  await expect(page.getByRole('button', { name: 'Sold out', exact: true })).toBeDisabled();
});
test('@CART-01 @UX-01 cart persists across browser reload', async ({ signedInShop, page }) => {
  await signedInShop.add('Atlas Daypack');
  await expect(page.locator('#cart-count')).toHaveText('1');
  await page.reload();
  await expect(page.locator('#cart-count')).toHaveText('1');
  await expect(page.locator('#total')).toHaveText('$89.00');
});
test('@CART-01 remove item updates subtotal', async ({ signedInShop, page }) => {
  await signedInShop.add('Atlas Daypack');
  await page.getByRole('button', { name: 'Remove Atlas Daypack', exact: true }).click();
  await expect(page.locator('#cart-count')).toHaveText('0');
  await expect(page.locator('#total')).toHaveText('$0.00');
});
test('@UX-01 page has no horizontal overflow', async ({ signedInShop, page }) => {
  await signedInShop.goto();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
