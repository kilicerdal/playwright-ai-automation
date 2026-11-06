import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
test.describe.configure({ mode: 'serial' });
const headers = { Origin: 'http://127.0.0.1:4174' };
test('V5 streams a real healthy journey, then exposes and exports an actual stock divergence', async ({
  page,
}) => {
  await page.goto('/#showtime');
  const run = page.getByRole('button', { name: 'Run journey locally', exact: true });
  await expect(run).toBeEnabled();
  await run.click();
  await expect(
    page.getByRole('heading', { name: 'Healthy journey passed', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('list', { name: 'Live journey steps' }).getByRole('listitem'),
  ).toHaveCount(9);
  await page.getByLabel('Execution mode').selectOption('missing-restock');
  await run.click();
  await expect(
    page.getByRole('heading', { name: 'Simulated fault detected', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'First divergence', exact: true })).toBeVisible();
  await expect(page.locator('#journey-difference')).toContainText('"field-notebook": 20');
  await expect(page.locator('#journey-difference')).toContainText('"field-notebook": 18');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download run evidence' }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();
  const report = JSON.parse(await readFile(path!, 'utf8'));
  expect(report.outcome).toBe('fault-detected');
  expect(report.control.passed).toBe(true);
  expect(report.fault.passed).toBe(false);
  expect(report.modelCalls).toBe(0);
  expect(report.reproduction).toBe(
    'npm run showcase:replay -- --journey=J-CANCEL --fault=missing-restock',
  );
  expect(JSON.stringify(report)).not.toMatch(
    /demo-pass|postgresql:|csrf|atlas_session=|Synthetic Reviewer|123 Example/,
  );
});
test('V5 reports a surviving fault honestly when the selected journey cannot detect it', async ({
  request,
}) => {
  const response = await request.post('/api/journeys/run', {
    headers,
    data: { journey: 'J-STOCK', fault: 'missing-restock' },
  });
  expect(response.status()).toBe(200);
  const events = (await response.text())
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  expect(events[0].type).toBe('started');
  expect(events.at(-1).report.outcome).toBe('fault-survived');
  expect(events.at(-1).report.divergence).toBeNull();
});
test('V5 rejects unknown plans, arbitrary targets and malformed or oversized requests', async ({
  request,
}) => {
  for (const data of [
    { journey: 'unknown' },
    { journey: 'J-CANCEL', url: 'https://example.com' },
    { journey: 'J-CANCEL', fault: 'arbitrary-code' },
  ]) {
    expect((await request.post('/api/journeys/run', { headers, data })).status()).toBe(422);
  }
  expect(
    (
      await request.post('/api/journeys/run', {
        headers: { ...headers, 'Content-Type': 'application/json' },
        data: Buffer.from('{'),
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post('/api/journeys/run', { headers, data: { journey: 'x'.repeat(3000) } })
    ).status(),
  ).toBe(413);
  expect(
    (
      await request.post('/api/journeys/run', {
        headers: { Origin: 'https://untrusted.example' },
        data: { journey: 'J-CANCEL' },
      })
    ).status(),
  ).toBe(403);
  expect((await request.get('/api/showcase/health')).ok()).toBe(true);
});
test('V5 walkthrough and presentation mode are keyboard-operable and mobile accessible', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#showtime');
  await expect(
    page.getByRole('button', { name: 'Run journey locally', exact: true }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Show durable business behavior.' }),
  ).toBeFocused();
  await page.getByRole('button', { name: 'Presentation mode', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Exit presentation', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Presentation mode', exact: true }),
  ).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Run journey locally', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Healthy journey passed', exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({ path: 'artifacts/v5-mobile.png', fullPage: true });
});
test('V5 does not retain a successful result after an incomplete execution stream', async ({
  page,
}) => {
  await page.goto('/#showtime');
  const run = page.getByRole('button', { name: 'Run journey locally', exact: true });
  await expect(run).toBeEnabled();
  await run.click();
  await expect(
    page.getByRole('heading', { name: 'Healthy journey passed', exact: true }),
  ).toBeVisible();
  await page.route('**/api/journeys/run', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/x-ndjson',
      body: JSON.stringify({ type: 'started', journey: 'J-CANCEL' }) + '\n',
    }),
  );
  await run.click();
  await expect(page.getByRole('alert')).toContainText('without a final result');
  await expect(
    page.getByRole('heading', { name: 'Healthy journey passed', exact: true }),
  ).not.toBeVisible();
  await expect(page.locator('#journey-export')).toBeDisabled();
});
