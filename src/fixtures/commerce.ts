import { test as base, expect } from '@playwright/test';
import { CommerceClient } from '../api/CommerceClient';
import { ShopPage } from '../pages/ShopPage';
type Fixtures = { commerce: CommerceClient; shop: ShopPage; signedInShop: ShopPage };
export const test = base.extend<Fixtures>({
  commerce: async ({ request }, use) => {
    const response = await request.post('/api/session', {
      data: { username: 'demo', password: 'demo-pass' },
    });
    expect(response.status(), 'Fixture authentication must succeed').toBe(201);
    const session = (await response.json()) as { csrf: string };
    const client = new CommerceClient(request, session.csrf);
    try {
      await use(client);
    } finally {
      await client.signOut();
    }
  },
  shop: async ({ page }, use) => {
    await use(new ShopPage(page));
  },
  signedInShop: async ({ commerce, context, page }, use) => {
    // request is isolated per test; explicitly transfer only its session cookie to the browser.
    const state = await commerce.request.storageState();
    await context.addCookies(state.cookies);
    const shop = new ShopPage(page);
    await shop.goto();
    await expect(page.getByRole('heading', { name: 'Find your everyday.' })).toBeVisible();
    await use(shop);
  },
});
export { expect };
