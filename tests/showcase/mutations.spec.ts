import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';

test('mutation showcase presents verified counts and the actual assertion comparison', async ({
  page,
}) => {
  const evidence = JSON.parse(await readFile('artifacts/mutation/report.json', 'utf8'));
  await page.goto('/#mutations');
  await expect(page.getByRole('heading', { name: 'Would your test catch it?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mutation testing', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.getByLabel('Mutation results')).toContainText(
    `${evidence.killed}/${evidence.total}`,
  );
  await expect(
    page.getByRole('heading', { name: 'Weak check passes. Defect remains.' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Strong check catches the defect.' }),
  ).toBeVisible();
  await expect(page.locator('#assertion-comparison')).toContainText('Observed stock 8');
  await page.locator('[data-mutation="inventory-skip-decrement"] summary').click();
  await expect(page.locator('[data-mutation="inventory-skip-decrement"]')).toContainText(
    'Expected: 6',
  );
  await expect(page.locator('[data-mutation="inventory-skip-decrement"]')).toContainText(
    'Received: 8',
  );
  expect((await new AxeBuilder({ page }).include('#mutations').analyze()).violations).toEqual([]);
});

test('mutation comparison fits mobile and supports keyboard expansion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#mutations');
  const summary = page.locator('[data-mutation="price-round-to-dollars"] summary');
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-mutation="price-round-to-dollars"]')).toHaveAttribute(
    'open',
    '',
  );
  const dimensions = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
  expect((await new AxeBuilder({ page }).include('#mutations').analyze()).violations).toEqual([]);
});

test('local walkthrough loads with captions and decodes a recorded frame', async ({
  page,
  request,
}) => {
  expect((await request.get('/mutation-walkthrough.webm')).headers()['content-type']).toBe(
    'video/webm',
  );
  expect(await (await request.get('/mutation-walkthrough.vtt')).text()).toContain('WEBVTT');
  await page.goto('/#mutations');
  const video = page.locator('#mutations video');
  await expect(video).toBeVisible();
  await video.evaluate(async (node: HTMLVideoElement) => {
    node.muted = true;
    await node.play();
    node.pause();
    node.currentTime = 12;
    await new Promise<void>((resolve) =>
      node.addEventListener('seeked', () => resolve(), { once: true }),
    );
  });
  expect(await video.evaluate((node: HTMLVideoElement) => node.duration)).toBeGreaterThan(25);
  await video.screenshot({ path: 'artifacts/mutation-recording/frame-12.png' });
});

test('surviving mutation is detected after the assertion improves, with business-area totals', async ({
  page,
}) => {
  const evidence = JSON.parse(await readFile('artifacts/mutation/report.json', 'utf8'));
  const [before, after] = evidence.recovery.stages;
  expect(before.mutant.outcome).toBe('survived');
  expect(after.mutant.outcome).toBe('killed');
  expect(before.mutant.sourceSHA256).toBe(after.mutant.sourceSHA256);
  for (const stage of [before, after]) {
    expect(stage.control.tests).toHaveLength(1);
    expect(stage.control.tests[0].status).toBe('passed');
  }
  await page.goto('/#mutations');
  await expect(page.getByLabel('Inventory results')).toContainText('6/6 targeted defects detected');
  await expect(page.getByLabel('Pricing results')).toContainText('6/6 targeted defects detected');
  await expect(
    page
      .locator('#mutation-recovery')
      .getByRole('heading', { name: 'Mutation survives', exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator('#mutation-recovery')
      .getByRole('heading', { name: 'Mutation detected', exact: true }),
  ).toBeVisible();
  await page.getByText('Inspect the actual rerun', { exact: true }).click();
  await expect(page.locator('#mutation-recovery')).toContainText('Expected: 6');
  await expect(page.locator('#mutation-recovery')).toContainText('Received: 8');
  const mutation = page.locator('[data-mutation="inventory-skip-decrement"]');
  await expect(mutation.locator('summary')).toHaveText(
    'Checkout skips the stock deduction — Detected',
  );
  await mutation.locator('summary').click();
  await expect(mutation).toContainText('Technical ID: inventory-skip-decrement');
});
