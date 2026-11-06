import { mkdir, writeFile } from 'node:fs/promises';
import { loadCandidate, evaluateApproved } from '../src/ai/approved-evaluation';
import { redact } from '../src/ai/guardrails';
async function main() {
  const directory =
    process.argv.find((arg) => arg.startsWith('--directory='))?.slice(12) ?? 'artifacts/candidates';
  const result = await evaluateApproved(await loadCandidate(directory));
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/approved-evaluation.json', JSON.stringify(result, null, 2) + '\n');
  console.log(
    JSON.stringify({
      mode: result.mode,
      origin: result.origin,
      controlPassed: result.controlPassed,
      cases: result.controls.length,
      detected: result.detected,
      totalMutants: result.totalMutants,
    }),
  );
  if (result.detected !== result.totalMutants)
    throw new Error('A curated mutant survived; inspect evidence before promotion');
}
main().catch((error) => {
  console.error(redact(error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
});
