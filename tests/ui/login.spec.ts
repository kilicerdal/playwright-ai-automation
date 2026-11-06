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

test('locked-out user remains on the login page', async ({ page, loginPage }) => {
  await loginPage.goto();
  await loginPage.login('locked_out_user', 'secret_sauce');
  await loginPage.expectError('Sorry, this user has been locked out.');
  await expect(loginPage.loginButton).toBeVisible();
  await expect(page).not.toHaveURL(/inventory\.html/);
});
