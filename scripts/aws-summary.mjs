import { readFile, mkdir, writeFile } from 'node:fs/promises';
const q = JSON.parse(await readFile('artifacts/quality.json', 'utf8'));
const e = JSON.parse(await readFile('artifacts/ai-evaluation.json', 'utf8'));
const summary = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  commit: process.env.GITHUB_SHA ?? null,
  status: q.status,
  executions: {
    total: q.total,
    passed: q.passed,
    failed: q.failed,
    flaky: q.flaky,
    skipped: q.skipped,
  },
  aiEvaluation: {
    guardrails: e.guardrails,
    seededDefects: { total: e.seededDefects.total, detected: e.seededDefects.detected },
    candidateOrigin: e.candidates.origin,
    candidateCount: e.candidates.count,
    candidateStatus: e.candidates.status,
  },
  note: 'Curated numerical summary only: excludes prompts, source code, error messages, user inputs, credentials, traces and videos.',
};
const encoded = JSON.stringify(summary, null, 2) + '\n';
if (Buffer.byteLength(encoded) > 1024 * 1024) throw new Error('Summary exceeds 1 MiB');
await mkdir('artifacts', { recursive: true });
await writeFile('artifacts/aws-summary.json', encoded);
console.log('Prepared artifacts/aws-summary.json; no AWS request made.');
