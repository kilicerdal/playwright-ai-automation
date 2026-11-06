import { test, expect } from '../../src/fixtures/commerce';
test('@UX-01 collection visual regression', async ({ signedInShop, page }) => {
  await signedInShop.goto();
  await expect(page.locator('#products article')).toHaveCount(4);
  await expect(page).toHaveScreenshot('atlas-collection.png', {
    fullPage: true,
    animations: 'disabled',
  });
});
