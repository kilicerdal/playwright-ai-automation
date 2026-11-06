import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { journeys } from '../../src/journeys/examples';
import { executeJourney, evaluateJourneys } from '../../src/journeys/runner';
for (const journey of journeys)
  test(`@V4-${journey.requirement} ${journey.title}`, async () => {
    const result = await executeJourney(journey);
    expect(result.passed, JSON.stringify(result.steps.filter((s) => !s.passed))).toBe(true);
    expect(result.steps).toHaveLength(journey.steps.length);
  });
test('@V4-EVAL all controls pass before non-pricing faults receive detection credit', async ({
  playwright,
}, info) => {
  void playwright;
  test.setTimeout(90000);
  const result = await evaluateJourneys(journeys);
  expect(result.controls.every((c) => c.passed)).toBe(true);
  expect(result.detected).toBe(result.total);
  expect(result.modelCalls).toBe(0);
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/v4-journeys.json', JSON.stringify(result, null, 2) + '\n');
  await info.attach('journey-evidence', {
    body: JSON.stringify(result, null, 2),
    contentType: 'application/json',
  });
});
