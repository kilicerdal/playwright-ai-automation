import { chromium, expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const output = 'artifacts/showcase-recording';
await mkdir(output, { recursive: true });
await mkdir('docs/images', { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
  recordVideo: { dir: output, size: { width: 1440, height: 1000 } },
  reducedMotion: 'reduce',
});
const page = await context.newPage();
const video = page.video()!;
const chapters: { title: string; seconds: number }[] = [];
const started = Date.now();
const chapter = (title: string) =>
  chapters.push({ title, seconds: Math.round((Date.now() - started) / 1000) });
// These pauses pace a silent demo recording. All results below come from actual execution.
const hold = (milliseconds: number) => page.waitForTimeout(milliseconds);
try {
  await page.goto('http://127.0.0.1:4174/#showtime');
  await expect(
    page.getByRole('button', { name: 'Run journey locally', exact: true }),
  ).toBeEnabled();
  chapter('V5 local showcase: authored examples, no paid services');
  await page.screenshot({ path: 'docs/images/v5-showcase.png', fullPage: true });
  await hold(6000);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Prepare healthy journey', exact: true }).click();
  chapter('Run the healthy cancellation journey');
  await page.getByRole('button', { name: 'Run journey locally', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Healthy journey passed', exact: true }),
  ).toBeVisible();
  await page.locator('#journey-result').scrollIntoViewIfNeeded();
  await hold(6000);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Prepare stock defect demo', exact: true }).click();
  await page
    .getByRole('button', { name: 'Run journey locally', exact: true })
    .scrollIntoViewIfNeeded();
  chapter('Run a control first, then a simulated stock-restoration defect');
  await hold(3000);
  await page.getByRole('button', { name: 'Run journey locally', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Simulated fault detected', exact: true }),
  ).toBeVisible();
  await expect(page.locator('#journey-difference')).toContainText('"field-notebook": 18');
  await page.locator('#journey-result').scrollIntoViewIfNeeded();
  chapter('Inspect the first divergence: expected 20 notebooks, observed 18');
  await page.screenshot({ path: 'docs/images/v5-fault-evidence.png', fullPage: true });
  await hold(8000);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download run evidence', exact: true }).click();
  const download = await downloadPromise;
  const evidencePath = await download.path();
  const evidence = JSON.parse(await readFile(evidencePath!, 'utf8'));
  if (
    evidence.outcome !== 'fault-detected' ||
    evidence.modelCalls !== 0 ||
    !evidence.control.passed
  )
    throw new Error('Recording did not capture valid local fault evidence');
  chapter('Export safe evidence and replay the same authored journey');
  await page.locator('#journey-replay').scrollIntoViewIfNeeded();
  await hold(5000);
  await page.getByRole('button', { name: /V4 journey intelligence/ }).click();
  await page
    .getByRole('heading', { name: 'Follow the journey. Prove every step.' })
    .scrollIntoViewIfNeeded();
  chapter('Review the eight authored controls and curated fault matrix');
  await page.screenshot({ path: 'docs/images/v5-journey-matrix.png', fullPage: true });
  await hold(6000);
  await page.getByRole('button', { name: /V5 showcase/ }).click();
  await page.getByRole('heading', { name: 'Make quality visible.' }).scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Presentation mode', exact: true }).click();
  chapter('Presentation mode: local-only, no live AI claims');
  await hold(5000);
  await context.close();
  await video.saveAs(output + '/v5-showcase-demo.webm');
  await writeFile(
    output + '/recording.json',
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        durationSeconds: Math.round((Date.now() - started) / 1000),
        audio: false,
        viewport: '1440x1000',
        origin: 'actual-local-browser-recording',
        modelCalls: 0,
        chapters,
      },
      null,
      2,
    ) + '\n',
  );
  const metadata = JSON.parse(await readFile(output + '/recording.json', 'utf8')) as {
    durationSeconds: number;
    chapters: { title: string; seconds: number }[];
  };
  const timestamp = (seconds: number) => new Date(seconds * 1000).toISOString().slice(11, 23);
  const cues = metadata.chapters
    .map(
      (item, index) =>
        `${timestamp(item.seconds)} --> ${timestamp(metadata.chapters[index + 1]?.seconds ?? metadata.durationSeconds)}\n${item.title}\n`,
    )
    .join('\n');
  await writeFile(output + '/v5-demo-chapters.vtt', 'WEBVTT\n\n' + cues);
  console.log('Recorded actual local UI to ' + output + '/v5-showcase-demo.webm');
} finally {
  await context.close();
  await browser.close();
}
