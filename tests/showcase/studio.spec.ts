import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('navigation, result search, and offline AI Studio work', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Confidence, engineered/ })).toBeVisible();
  await page.getByRole('button', { name: /AI engineering lab/ }).click();
  await expect(page.getByRole('heading', { name: 'Interactive AI Studio' })).toBeVisible();
  await page.getByLabel('AI task', { exact: true }).selectOption('draft');
  await page.getByRole('button', { name: 'Run validated AI task →', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Authored examples');
  await expect(page.locator('#studio-result')).toContainText('checkout retry preserves one order');
  await page.getByRole('button', { name: /Generated test review/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Test generation, with evidence.' }),
  ).toBeVisible();
  await expect(page.getByText('pending-human-review', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /V3 database evidence/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Quality that survives a restart.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: /V4 journey intelligence/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Follow the journey. Prove every step.' }),
  ).toBeVisible();
  await page.getByText(/J-CANCEL · Cancellation/).click();
  await expect(page.getByRole('table', { name: 'Step evidence for J-CANCEL' })).toBeVisible();
  await page.getByRole('button', { name: /Test explorer/ }).click();
  await page.getByLabel('Filter test results').fill('no-test-can-match-this');
  await expect(page.getByText('No matching tests.')).toBeVisible();
});
test('dashboard accessibility and mobile layout', async ({ page }) => {
  await page.goto('/');
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: /AI engineering lab/ }).click();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.getByRole('button', { name: /Generated test review/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Test generation, with evidence.' }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.getByRole('button', { name: /V3 database evidence/ }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
  await page.getByRole('button', { name: /V4 journey intelligence/ }).click();
  await page.getByText(/J-CANCEL · Cancellation/).click();
  const overflow = await page.evaluate(() =>
    Array.from(document.querySelectorAll('body *'))
      .filter((e) => e.getBoundingClientRect().right > innerWidth + 1)
      .slice(0, 12)
      .map((e) => ({
        tag: e.tagName,
        class: e.className,
        width: e.getBoundingClientRect().width,
        text: e.textContent?.slice(0, 70),
      })),
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    JSON.stringify(overflow),
  ).toBe(true);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
});
test('Studio rejects cross-origin requests', async ({ request }) => {
  const response = await request.post('/api/ai/run', {
    headers: { Origin: 'https://untrusted.example' },
    data: { task: 'plan', mode: 'offline', question: 'Plan tests' },
  });
  expect(response.status()).toBe(403);
});
test('Studio validates input before model invocation', async ({ request }) => {
  const response = await request.post('/api/ai/run', {
    headers: { Origin: 'http://127.0.0.1:4174' },
    data: { task: 'execute-shell', mode: 'offline', question: 'bad' },
  });
  expect(response.status()).toBe(422);
});
test('Studio status exposes availability without credentials', async ({ request }) => {
  const response = await request.get('/api/ai/status');
  const body = await response.json();
  expect(response.status()).toBe(200);
  expect(typeof body.liveAvailable).toBe('boolean');
  expect(body).not.toHaveProperty('apiKey');
  expect(body.limit).toBe(10);
});

test('Studio blocks live requests under the zero-spend policy', async ({ request }) => {
  const response = await request.post('/api/ai/run', {
    headers: { Origin: 'http://127.0.0.1:4174' },
    data: { task: 'plan', mode: 'live', question: 'Plan checkout tests' },
  });
  expect(response.status()).toBe(403);
  expect((await response.json()).error).toContain('zero-spend');
  expect((await (await request.get('/api/ai/status')).json()).liveAvailable).toBe(false);
});
