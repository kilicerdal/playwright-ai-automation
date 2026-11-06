import { defineConfig } from '@playwright/test';
export default defineConfig({
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['./src/reporters/quality.ts'],
  ],
});
