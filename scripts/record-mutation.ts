import { chromium, expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const evidence = JSON.parse(await readFile('artifacts/mutation/report.json', 'utf8')) as {
  killed: number;
  total: number;
};
const browser = await chromium.launch();
await mkdir('docs/media', { recursive: true });
await mkdir('docs/images', { recursive: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  recordVideo: { dir: 'artifacts/mutation-recording', size: { width: 1440, height: 1000 } },
  reducedMotion: 'reduce',
});
const page = await context.newPage();
const video = page.video()!;
const chapters: { seconds: number; text: string }[] = [];
const started = Date.now();
const caption = async (text: string) => {
  chapters.push({ seconds: (Date.now() - started) / 1000, text });
  await page.evaluate((text) => {
    let caption = document.getElementById('recording-caption');
    if (!caption) {
      caption = document.createElement('div');
      caption.id = 'recording-caption';
      caption.style.cssText =
        'position:fixed;bottom:18px;left:270px;right:40px;z-index:10000;padding:18px 24px;border:1px solid #799b49;border-radius:10px;background:#0c111bf5;color:#e7f5db;font:20px/1.5 system-ui;box-shadow:0 8px 35px #0008;pointer-events:none';
      document.body.append(caption);
    }
    caption.textContent = text;
  }, text);
};
try {
  await page.goto('http://127.0.0.1:4174/#mutations');
  await expect(page.getByRole('heading', { name: 'Would your test catch it?' })).toBeVisible();
  await expect(page.getByLabel('Mutation results')).toContainText(
    `${evidence.killed}/${evidence.total}`,
  );
  await page.screenshot({ path: 'docs/images/mutation-testing.png', fullPage: false });
  await caption(
    `First, the unmodified application passes the healthy control. Then ${evidence.total} targeted source mutations challenge the same business expectations.`,
  );
  await page.waitForTimeout(6000);
  await page.getByRole('heading', { name: 'From surviving to detected' }).scrollIntoViewIfNeeded();
  await page.evaluate(() =>
    document.getElementById('mutation-recovery')!.scrollIntoView({ block: 'center' }),
  );
  await page.evaluate(() => document.getElementById('recording-caption')?.remove());
  await page.screenshot({ path: 'docs/images/mutation-recovery.png' });
  await caption(
    'Before: the stock-deduction mutation survives the status-only test. This is an authored learning example, separate from the complete campaign.',
  );
  await page.waitForTimeout(6000);
  await caption(
    'Improve the test by adding one business assertion: after buying 2 units from stock 8, expect stock 6. Keep the application mutation unchanged.',
  );
  await page.waitForTimeout(6000);
  await caption(
    'Rerun: the same mutation is detected. Both healthy controls pass; the mutated application hash is identical before and after.',
  );
  await page.waitForTimeout(6000);
  await page.locator('[data-mutation="inventory-skip-decrement"] summary').click();
  await page.locator('[data-mutation="inventory-skip-decrement"]').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-mutation="inventory-skip-decrement"]')).toContainText(
    'Received: 8',
  );
  await caption(
    'Inspect the exact source change and the actual Playwright failure. A timeout or database error earns no detection credit.',
  );
  await page.waitForTimeout(7000);
  await page.locator('[data-mutation="inventory-skip-decrement"] summary').click();
  await page.getByRole('heading', { name: 'Reproduce the evidence' }).scrollIntoViewIfNeeded();
  await caption(
    'Reproduce everything locally with the documented commands. No paid services, uploads, or hosted CI. Targeted results do not prove defect-free software.',
  );
  await page.waitForTimeout(6000);
  await context.close();
  await video.saveAs('docs/media/mutation-walkthrough.webm');
  const duration = (Date.now() - started) / 1000;
  const timestamp = (seconds: number) => new Date(seconds * 1000).toISOString().slice(11, 23);
  await writeFile(
    'docs/media/mutation-walkthrough.vtt',
    'WEBVTT\n\n' +
      chapters
        .map(
          (c, i) =>
            `${timestamp(c.seconds)} --> ${timestamp(chapters[i + 1]?.seconds ?? duration)}\n${c.text}\n`,
        )
        .join('\n'),
  );
  await writeFile(
    'artifacts/mutation-recording/metadata.json',
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        durationSeconds: duration,
        audio: false,
        provenance:
          'Actual local showcase browser recording of verified Playwright/PostgreSQL results',
        chapters,
      },
      null,
      2,
    ),
  );
  console.log('Saved docs/media/mutation-walkthrough.webm and docs/images/mutation-testing.png');
} finally {
  await context.close();
  await browser.close();
}
