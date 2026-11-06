import { defineConfig } from '@playwright/test';
import config from './playwright.config';
export default defineConfig({
  ...config,
  projects: config.projects?.filter((project) => project.name === 'visual'),
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report/visual', open: 'never' }],
    ['json', { outputFile: 'artifacts/visual-results.json' }],
  ],
  outputDir: 'test-results/visual',
});
