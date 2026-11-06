import 'dotenv/config';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { generatedCasesSchema, type Requirement } from '../src/ai/contracts';
import { OfflineProvider } from '../src/ai/offline';
import { OpenAIProvider } from '../src/ai/provider';
import { runTask } from '../src/ai/pipeline';
import { redact } from '../src/ai/guardrails';
import { renderCandidate, assessCandidate, candidateHash } from '../src/ai/test-generation';
async function main() {
  const live = process.argv.includes('--live');
  if (live) throw new Error('Live AI is disabled by the zero-spend policy. Use offline examples.');
  if (live && (!process.env.OPENAI_API_KEY || !process.env.AI_MODEL))
    throw new Error('Live generation requires OPENAI_API_KEY and AI_MODEL');
  const requirements: Requirement[] = JSON.parse(
    await readFile('requirements/commerce.json', 'utf8'),
  );
  const provider = live
    ? new OpenAIProvider(process.env.AI_MODEL!)
    : new OfflineProvider(requirements);
  const run = await runTask('cases', provider, {
    requirements,
    evidence: [],
    question:
      'Generate ten distinct cart API tests with exact independent expected outcomes. Include valid, boundary, invalid type, unavailable stock, and unknown-product cases.',
  });
  const bundle = generatedCasesSchema.parse(run.data);
  const code = renderCandidate(bundle);
  const errors = assessCandidate(code);
  if (errors.length) throw new Error('Candidate rejected: ' + errors.join('; '));

  const manifest = {
    generatedAt: new Date().toISOString(),
    status: 'pending-human-review',
    reviewer: null,
    origin: live ? 'live-model-generated' : 'authored-offline-example',
    model: run.attempts.at(-1)?.model,
    codeHash: candidateHash(code),
    candidateCount: bundle.cases.length,
    validation: { schema: true, oracle: true, typecheck: true, staticReview: true },
    run,
  };
  const directory = 'artifacts/candidates/' + (live ? 'live' : 'offline');
  await mkdir(directory, { recursive: true });
  await writeFile(directory + '/cart-generated.spec.ts.txt', code);
  await writeFile(directory + '/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
  let preserveLive = false;
  try {
    const current = JSON.parse(await readFile('artifacts/candidates/manifest.json', 'utf8'));
    preserveLive = !live && current.origin === 'live-model-generated';
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  if (!preserveLive) {
    await writeFile('artifacts/candidates/cart-generated.spec.ts.txt', code);
    await writeFile('artifacts/candidates/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
  }
  if (preserveLive)
    console.log(
      'Preserved the live candidate review queue; offline examples were saved separately.',
    );
  console.log(
    `${bundle.cases.length} ${manifest.origin} candidates validated. Pending human review; none executed or counted as active tests.`,
  );
}
main().catch(async (error: unknown) => {
  const detail = error instanceof Error ? error.message : String(error);
  const safeDetail = redact(detail);
  if (process.argv.includes('--live')) {
    await mkdir('artifacts/candidates', { recursive: true });
    await writeFile(
      'artifacts/candidates/live-attempt.json',
      JSON.stringify(
        {
          attemptedAt: new Date().toISOString(),
          status: 'failed',
          model: process.env.AI_MODEL ?? null,
          message: safeDetail,
        },
        null,
        2,
      ) + '\n',
    );
  }
  console.error(safeDetail);
  process.exitCode = 1;
});
