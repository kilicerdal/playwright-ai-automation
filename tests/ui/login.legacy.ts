import { test, expect } from '../../src/fixtures/test';

test.describe('Login', () => {
  test('@smoke valid user can sign in', async ({ loginPage, inventoryPage }) => {
    await loginPage.goto();
    await loginPage.login(
      process.env.TEST_USERNAME ?? 'standard_user',
      process.env.TEST_PASSWORD ?? 'secret_sauce',
    );
    await inventoryPage.expectLoaded();
  });

  test('invalid credentials show a useful error', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.login('invalid-user', 'invalid-password');
    await loginPage.expectError('Username and password do not match');
    await expect(loginPage.loginButton).toBeVisible();
  });
});
