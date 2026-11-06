import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/showcase',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 2,
  reporter: [['list'], ['json', { outputFile: 'artifacts/showcase-tests.json' }]],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4174',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run showcase',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: !process.env.CI,
  },
  outputDir: 'test-results/showcase',
});
