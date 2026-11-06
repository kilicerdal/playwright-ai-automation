import { test, expect } from '@playwright/test';
import { journeySchema, journeyHash } from '../../src/journeys/contracts';
import { compileJourney } from '../../src/journeys/model';
import { journeys } from '../../src/journeys/examples';
import { OpenAIProvider } from '../../src/ai/provider';
test('journey plans reject URLs, code, unknown actors, and extra fields', () => {
  for (const extra of [
    { url: 'https://example.com' },
    { code: 'process.exit()' },
    { actor: 'admin' },
  ])
    expect(
      journeySchema.safeParse({
        ...journeys[0],
        steps: [{ ...journeys[0].steps[0], ...extra }, ...journeys[0].steps.slice(1)],
      }).success,
    ).toBe(false);
});
test('journey oracle rejects references before successful checkout', () => {
  expect(() =>
    compileJourney({
      ...journeys[0],
      steps: [
        { action: 'login', actor: 'owner' },
        { action: 'transition', actor: 'owner', target: 'cancel', csrf: true },
      ],
    }),
  ).toThrow('earlier successful checkout');
});
test('journey schema bounds work and rejects false live provenance', () => {
  expect(
    journeySchema.safeParse({ ...journeys[0], steps: Array(31).fill(journeys[0].steps[0]) })
      .success,
  ).toBe(false);
  expect(journeySchema.safeParse({ ...journeys[0], origin: 'live-model-generated' }).success).toBe(
    false,
  );
});
test('journey artifact identity changes with step data', () => {
  const modified = structuredClone(journeys[0]);
  modified.steps[1] = { action: 'add', actor: 'owner', product: 'field-notebook', quantity: 3 };
  expect(journeyHash(modified)).not.toBe(journeyHash(journeys[0]));
});
test('independent oracle predicts exact-once restocking and terminal conflict', () => {
  const compiled = compileJourney(journeys[0]);
  expect(compiled[2].expected).toMatchObject({ status: 201, total: 3600, state: 'confirmed' });
  expect(compiled[6].expected.stock?.['field-notebook']).toBe(20);
  expect(compiled[7].expected.status).toBe(409);
});
test('zero-spend policy rejects default OpenAI client before construction or network access', () => {
  expect(() => new OpenAIProvider('anything')).toThrow('zero-spend');
});
