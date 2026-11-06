import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../../src/fixtures/commerce';
for (const state of ['sign-in', 'collection', 'confirmation'])
  test(`@UX-01 WCAG 2.2 AA automated scan: ${state}`, async ({ shop, page }) => {
    await shop.goto();
    if (state !== 'sign-in') {
      await shop.signIn();
      await expect(page.getByRole('heading', { name: 'Find your everyday.' })).toBeVisible();
    }
    if (state === 'confirmation') {
      await shop.add('Atlas Daypack');
      await expect(page.locator('#cart-count')).toHaveText('1');
      await shop.checkout();
      await expect(
        page.getByRole('heading', { name: 'Order confirmed.', exact: true }),
      ).toBeVisible();
    }
    const scan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(scan.violations).toEqual([]);
  });
test('@UX-01 login works with keyboard only', async ({ shop, page }) => {
  await shop.goto();
  await page.getByLabel('Username', { exact: true }).focus();
  await page.keyboard.type('demo');
  await page.keyboard.press('Tab');
  await page.keyboard.type('demo-pass');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Find your everyday.' })).toBeVisible();
});
