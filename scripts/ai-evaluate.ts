import { readFile, mkdir, writeFile } from 'node:fs/promises';
type Row = { title: string; status: string; project: string };
const quality = JSON.parse(await readFile('artifacts/quality.json', 'utf8')) as { tests: Row[] };
const guards = quality.tests.filter((t) => t.project === 'framework');
const mutations = guards.filter((t) => t.title.includes('kills seeded defect:'));
const manifest = JSON.parse(await readFile('artifacts/candidates/manifest.json', 'utf8')) as {
  origin: string;
  candidateCount: number;
  status: string;
  codeHash: string;
};
const result = {
  generatedAt: new Date().toISOString(),
  evaluationType: 'deterministic-regression-and-seeded-defect-checks',
  modelBenchmark: false,
  guardrails: {
    executed: guards.length,
    passed: guards.filter((t) => t.status === 'expected').length,
  },
  seededDefects: {
    total: mutations.length,
    detected: mutations.filter((t) => t.status === 'expected').length,
    names: mutations.map((t) => t.title.split('kills seeded defect: ')[1]),
  },
  candidates: {
    origin: manifest.origin,
    count: manifest.candidateCount,
    status: manifest.status,
    codeHash: manifest.codeHash,
  },
  note: 'Seeded faults are a curated pricing fault set. This is not an exhaustive mutation score or a live-model quality benchmark. Candidates have not been executed.',
};
await mkdir('artifacts', { recursive: true });
await writeFile('artifacts/ai-evaluation.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
if (
  result.guardrails.passed !== result.guardrails.executed ||
  result.seededDefects.total !== 10 ||
  result.seededDefects.detected !== 10
)
  throw new Error('AI evaluation release gate did not pass');
