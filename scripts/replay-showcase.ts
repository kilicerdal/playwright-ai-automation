import { mkdir, writeFile } from 'node:fs/promises';
import { sessionSchema, runJourneySession } from '../src/showcase/journey-session';
const journey = process.argv.find((arg) => arg.startsWith('--journey='))?.slice(10) ?? 'J-CANCEL';
const fault = process.argv.find((arg) => arg.startsWith('--fault='))?.slice(8);
const result = await runJourneySession(
  sessionSchema.parse({ journey, ...(fault ? { fault } : {}) }),
);
await mkdir('artifacts', { recursive: true });
await writeFile('artifacts/v5-replay.json', JSON.stringify(result, null, 2) + '\n');
console.log(`${result.journey}: ${result.outcome}. Evidence: artifacts/v5-replay.json`);
if (result.outcome === 'fault-survived') process.exitCode = 1;
