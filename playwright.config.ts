import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const firefoxAppHome = resolve('artifacts/firefox-app-home');
if (process.platform === 'darwin') mkdirSync(firefoxAppHome, { recursive: true });
const baseURL = 'http://127.0.0.1:4173';
const browserTests = /tests\/(ui|e2e|resilience|accessibility)\/.*\.spec\.ts/;
export default defineConfig({
  testDir: './tests',
  testIgnore: ['**/login.spec.ts', '**/cart.spec.ts', '**/posts.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  failOnFlakyTests: !!process.env.CI,
  workers: process.env.CI ? 2 : 4,
  timeout: 30000,
  expect: { timeout: 7000 },
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['./src/reporters/quality.ts'],
  ],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
  },
  webServer: {
    command: 'npm run demo:app',
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
  projects: [
    { name: 'api', testMatch: /tests\/(api|security)\/.*\.spec\.ts/ },
    { name: 'framework', testMatch: /tests\/framework\/.*\.spec\.ts/ },
    { name: 'chromium', testMatch: browserTests, use: { ...devices['Desktop Chrome'] } },
    {
      name: 'firefox',
      testMatch: browserTests,
      use: {
        ...devices['Desktop Firefox'],
        ...(process.platform === 'darwin'
          ? { launchOptions: { env: { ...process.env, CFFIXED_USER_HOME: firefoxAppHome } } }
          : {}),
      },
    },
    { name: 'webkit', testMatch: browserTests, use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', testMatch: browserTests, use: { ...devices['Pixel 7'] } },
    {
      name: 'visual',
      testMatch: /tests\/visual\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  snapshotPathTemplate: '{testDir}/visual/baselines/{platform}/{projectName}/{arg}{ext}',
  outputDir: 'test-results/artifacts',
});
