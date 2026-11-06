import 'dotenv/config';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { z } from 'zod';
import { requirementSchema, type Task } from '../src/ai/contracts';
import { OfflineProvider } from '../src/ai/offline';
import { OpenAIProvider } from '../src/ai/provider';
import { runTask } from '../src/ai/pipeline';
import { redact, retrieve } from '../src/ai/guardrails';
const live = process.argv.includes('--live');
if (live && (!process.env.OPENAI_API_KEY || !process.env.AI_MODEL))
  throw new Error('Live mode requires OPENAI_API_KEY and AI_MODEL. No fallback to offline.');
const requirements = z
  .array(requirementSchema)
  .parse(JSON.parse(await readFile('requirements/commerce.json', 'utf8')));
const provider = live
  ? new OpenAIProvider(process.env.AI_MODEL!)
  : new OfflineProvider(requirements);
const resultFile = process.argv
  .find((arg) => arg.startsWith('--results='))
  ?.slice('--results='.length);
if (resultFile && !live)
  throw new Error(
    'Actual report analysis requires live mode; offline examples only support the synthetic incident.',
  );
let evidence = [
  { id: 'E1', text: 'Illustrative failure: checkout expected HTTP 201; observed HTTP 503.' },
  {
    id: 'E2',
    text: 'Illustrative response: {"error":"Service unavailable"}. This is a synthetic demo incident, not a real suite failure.',
  },
];
if (resultFile) {
  const report = JSON.parse(await readFile(resultFile, 'utf8')) as {
    suites?: unknown[];
    stats?: unknown;
  };
  evidence = [
    { id: 'E1', text: redact(JSON.stringify(report.stats)) },
    { id: 'E2', text: redact(JSON.stringify(report.suites)).slice(0, 12000) },
  ];
}
const context = {
  requirements: retrieve('commerce checkout session cart security search', requirements),
  evidence: [
    ...evidence,
    { id: 'DOM1', text: '<button type="submit">Place demo order →</button>' },
  ],
  question:
    'Plan and investigate the commerce release using only supplied evidence. If the report shows no failure, report no observed failure and do not invent one.',
};
await mkdir('artifacts/drafts', { recursive: true });
const runs: Awaited<ReturnType<typeof runTask>>[] = [];
for (const task of ['plan', 'draft', 'triage', 'locator', 'impact'] as Task[]) {
  console.log(`AI ${provider.mode}: ${task}`);
  const taskContext =
    task === 'draft'
      ? {
          ...context,
          question:
            context.question +
            '\nValidated plan to implement:\n' +
            JSON.stringify(runs.find((run) => run.task === 'plan')?.data),
        }
      : context;
  runs.push(await runTask(task, provider, taskContext));
}
const artifact = {
  generatedAt: new Date().toISOString(),
  mode: provider.mode,
  evidenceSource: resultFile ? 'playwright-report' : 'synthetic-demo-incident',
  note: live
    ? 'Live model output validated by structural and semantic gates; human review still required.'
    : 'Authored deterministic examples. No model was called. Token counts are zero.',
  runs,
};
await writeFile('artifacts/ai-run.json', JSON.stringify(artifact, null, 2) + '\n');
const draft = runs.find((run) => run.task === 'draft')!;
await writeFile('artifacts/drafts/checkout.spec.ts.txt', (draft.data as { code: string }).code);
console.log('Saved artifacts/ai-run.json and quarantined draft. No generated code was executed.');
