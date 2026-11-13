import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/postgres',
  testMatch: 'inventory-pricing.spec.ts',
  workers: 1,
  retries: 0,
  timeout: 15000,
  reporter: [['json', { outputFile: 'artifacts/mutation-results.json' }]],
  outputDir: 'test-results/mutation',
});
