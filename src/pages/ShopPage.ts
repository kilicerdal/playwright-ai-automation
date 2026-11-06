import type { Page } from '@playwright/test';
export class ShopPage {
  constructor(readonly page: Page) {}
  async goto() {
    await this.page.goto('/');
  }
  async signIn(username = 'demo', password = 'demo-pass') {
    await this.page.getByLabel('Username', { exact: true }).fill(username);
    await this.page.getByLabel('Password', { exact: true }).fill(password);
    await this.page.getByRole('button', { name: 'Sign in →', exact: true }).click();
  }
  async add(name: string) {
    await this.page.getByRole('button', { name: `Add ${name}`, exact: true }).click();
  }
  async checkout(name = 'Alex Engineer', address = '100 Test Avenue') {
    await this.page.getByLabel('Full name', { exact: true }).fill(name);
    await this.page.getByLabel('Shipping address', { exact: true }).fill(address);
    await this.page.getByRole('button', { name: 'Place demo order →', exact: true }).click();
  }
}
