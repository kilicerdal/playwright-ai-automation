import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { journeys } from '../journeys/examples';
import { journeyHash } from '../journeys/contracts';
import { executeJourney, type StepEvidence, type Fault } from '../journeys/runner';
// A short allowlist keeps demonstrations understandable; no raw plans, URLs, code or SQL accepted.
export const demoFaults = ['missing-restock', 'read-ownership', 'duplicate-replay'] as const;
export const sessionSchema = z
  .object({ journey: z.string(), fault: z.enum(demoFaults).optional() })
  .strict()
  .refine((input) => journeys.some((j) => j.id === input.journey), 'Unknown authored journey');
export type DemoRequest = z.infer<typeof sessionSchema>;
export type SessionEvent =
  | { type: 'started'; runId: string; journey: string; hash: string; origin: string }
  | { type: 'step'; phase: 'control' | 'fault'; evidence: StepEvidence }
  | { type: 'finished'; report: Awaited<ReturnType<typeof runJourneySession>> };
export async function runJourneySession(
  input: DemoRequest,
  emit: (event: Exclude<SessionEvent, { type: 'finished' }>) => void = () => {},
) {
  const parsed = sessionSchema.parse(input);
  const journey = journeys.find((j) => j.id === parsed.journey)!;
  const runId = randomUUID();
  emit({
    type: 'started',
    runId,
    journey: journey.id,
    hash: journeyHash(journey),
    origin: journey.origin,
  });
  const control = await executeJourney(journey, undefined, (evidence) =>
    emit({ type: 'step', phase: 'control', evidence }),
  );
  if (!control.passed) throw new Error('Control failed; fault evaluation is invalid');
  const fault = parsed.fault
    ? await executeJourney(journey, parsed.fault as Fault, (evidence) =>
        emit({ type: 'step', phase: 'fault', evidence }),
      )
    : null;
  const divergence = fault?.steps.find((s) => !s.passed) ?? null;
  return {
    schemaVersion: 1,
    runId,
    generatedAt: new Date().toISOString(),
    origin: journey.origin,
    journey: journey.id,
    title: journey.title,
    requirement: journey.requirement,
    hash: journeyHash(journey),
    modelCalls: 0,
    backend: 'postgres',
    outcome: fault ? (fault.passed ? 'fault-survived' : 'fault-detected') : 'control-passed',
    control,
    fault,
    divergence,
    reproduction: `npm run showcase:replay -- --journey=${journey.id}${parsed.fault ? ' --fault=' + parsed.fault : ''}`,
    note: 'Actual local execution in isolated disposable schemas. Authored plan; simulated fault when selected. No paid API calls. A detected divergence is evidence, not an AI root-cause diagnosis.',
  };
}
