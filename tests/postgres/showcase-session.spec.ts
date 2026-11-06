import { test, expect } from '@playwright/test';
import { runJourneySession, type SessionEvent } from '../../src/showcase/journey-session';
test('V5 failure evidence is preceded by every healthy control step', async () => {
  const events: Exclude<SessionEvent, { type: 'finished' }>[] = [];
  const result = await runJourneySession(
    { journey: 'J-OWNERSHIP', fault: 'read-ownership' },
    (event) => events.push(event),
  );
  expect(result.outcome).toBe('fault-detected');
  expect(result.divergence?.actual.status).toBe(200);
  expect(result.divergence?.expected.status).toBe(404);
  expect(events.filter((e) => e.type === 'step' && e.phase === 'control')).toHaveLength(
    result.control.steps.length,
  );
  const firstFault = events.findIndex((e) => e.type === 'step' && e.phase === 'fault');
  expect(firstFault).toBe(result.control.steps.length + 1);
});
test('V5 duplicate-replay demo identifies a changed response and preserves a replay recipe', async () => {
  const result = await runJourneySession({ journey: 'J-REPLAY', fault: 'duplicate-replay' });
  expect(result.outcome).toBe('fault-detected');
  expect(result.divergence?.expected).toMatchObject({ status: 200, sameOrder: true });
  expect(result.divergence?.actual).toMatchObject({ status: 201, sameOrder: false });
  expect(result.reproduction).toContain('--fault=duplicate-replay');
});
