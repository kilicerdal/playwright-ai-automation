import { test, expect } from '../../src/fixtures/commerce';
test('@CAT-01 clearing search restores the full collection', async ({ signedInShop, page }) => {
  await page.getByLabel('Search collection').fill('Notebook');
  await expect(page.locator('#products article')).toHaveCount(1);
  await page.getByLabel('Search collection').fill('');
  await expect(page.locator('#products article')).toHaveCount(4);
  void signedInShop;
});
test('@CAT-01 category reset restores all products', async ({ signedInShop, page }) => {
  await page.getByLabel('Category', { exact: true }).selectOption('Audio');
  await expect(page.locator('#products article')).toHaveCount(1);
  await page.getByLabel('Category', { exact: true }).selectOption('');
  await expect(page.locator('#products article')).toHaveCount(4);
  void signedInShop;
});
test('@CAT-01 search and category intersect rather than override', async ({
  signedInShop,
  page,
}) => {
  await page.getByLabel('Search collection').fill('Notebook');
  await page.getByLabel('Category', { exact: true }).selectOption('Audio');
  await expect(page.getByText('No products match your search.')).toBeVisible();
  await page.getByLabel('Category', { exact: true }).selectOption('Workspace');
  await expect(page.locator('#products article')).toHaveCount(1);
  void signedInShop;
});
test('@ORDER-01 blank form is blocked before any order request', async ({ signedInShop, page }) => {
  let submissions = 0;
  page.on('request', (request) => {
    if (request.url().endsWith('/api/orders') && request.method() === 'POST') submissions++;
  });
  await page.getByRole('button', { name: 'Place demo order →', exact: true }).click();
  expect(
    await page
      .getByLabel('Full name')
      .evaluate((input: HTMLInputElement) => input.validity.valueMissing),
  ).toBe(true);
  expect(submissions).toBe(0);
  void signedInShop;
});
test('@ORDER-01 too-short shipping address is rejected by native validation', async ({
  signedInShop,
  page,
}) => {
  await signedInShop.checkout('Alex', '1234');
  expect(
    await page
      .getByLabel('Shipping address')
      .evaluate((input: HTMLInputElement) => input.validity.tooShort),
  ).toBe(true);
  await expect(page.getByRole('heading', { name: 'Order confirmed.', exact: true })).toBeHidden();
});
test('@UX-01 confirmation receives keyboard focus after checkout', async ({
  signedInShop,
  page,
}) => {
  await signedInShop.add('Atlas Daypack');
  await expect(page.locator('#cart-count')).toHaveText('1');
  await signedInShop.checkout();
  await expect(page.getByRole('heading', { name: 'Order confirmed.', exact: true })).toBeFocused();
});
test('@CART-01 stock-limit error preserves eight existing units', async ({
  signedInShop,
  page,
  commerce,
}) => {
  await commerce.add('atlas-pack', 8);
  await page.reload();
  await expect(page.locator('#cart-count')).toHaveText('8');
  await signedInShop.add('Atlas Daypack');
  await expect(page.getByRole('status')).toHaveText('Insufficient stock');
  await expect(page.locator('#cart-count')).toHaveText('8');
  await expect(page.locator('#total')).toHaveText('$712.00');
});
test('@CART-01 repeated additions display one combined cart row', async ({
  signedInShop,
  page,
}) => {
  await signedInShop.add('Field Notebook');
  await expect(page.locator('#cart-count')).toHaveText('1');
  await signedInShop.add('Field Notebook');
  await expect(page.locator('#cart-count')).toHaveText('2');
  await expect(page.locator('#cart-items .cart-row')).toHaveCount(1);
  await expect(page.locator('#cart-items')).toContainText('Field Notebook × 2');
});
test('@AUTH-01 a new sign-in starts a clean cart after signout', async ({ signedInShop, page }) => {
  await signedInShop.add('Atlas Daypack');
  await expect(page.locator('#cart-count')).toHaveText('1');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByLabel('Username', { exact: true })).toBeVisible();
  await signedInShop.signIn();
  await expect(page.locator('#cart-count')).toHaveText('0');
});
test('@UX-01 skip link supports direct keyboard access to main', async ({ shop, page }) => {
  await shop.goto();
  await page.getByRole('link', { name: 'Skip to content' }).focus();
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);
  await expect(page.getByRole('main')).toBeFocused();
});
