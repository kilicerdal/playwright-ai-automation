import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/postgres',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  workers: 2,
  retries: 0,
  timeout: 30000,
  expect: { timeout: 7000 },
  use: { ...devices['Desktop Chrome'], trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report/postgres', open: 'never' }],
    ['json', { outputFile: 'artifacts/postgres-results.json' }],
    ['junit', { outputFile: 'test-results/postgres-junit.xml' }],
  ],
  outputDir: 'test-results/postgres',
});
