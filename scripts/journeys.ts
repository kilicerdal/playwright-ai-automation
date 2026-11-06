import { mkdir, writeFile } from 'node:fs/promises';
import { journeys } from '../src/journeys/examples';
import { evaluateJourneys } from '../src/journeys/runner';
const result = await evaluateJourneys(journeys);
await mkdir('artifacts', { recursive: true });
await writeFile('artifacts/v4-journeys.json', JSON.stringify(result, null, 2) + '\n');
console.log(
  `${result.controls.length} authored journey controls passed; ${result.detected}/${result.total} curated lifecycle faults detected; model calls: 0.`,
);
if (result.detected !== result.total) process.exitCode = 1;
