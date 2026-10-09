import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { InventoryPage } from '../pages/InventoryPage';
import { PostsClient } from '../api/clients/PostsClient';

type Fixtures = {
  loginPage: LoginPage;
  inventoryPage: InventoryPage;
  postsClient: PostsClient;
};

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  inventoryPage: async ({ page }, use) => use(new InventoryPage(page)),
  postsClient: async ({ request }, use) =>
    use(
      new PostsClient(request, process.env.API_BASE_URL ?? 'https://jsonplaceholder.typicode.com'),
    ),
});

export { expect } from '@playwright/test';
