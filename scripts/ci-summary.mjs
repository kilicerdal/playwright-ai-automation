import { readFile } from 'node:fs/promises';
try {
  const q = JSON.parse(await readFile('artifacts/quality.json', 'utf8'));
  console.log(
    `## Quality execution\n\n| Outcome | Count |\n|---|---:|\n| Passed | ${q.passed} |\n| Failed | ${q.failed} |\n| Flaky | ${q.flaky} |\n| Skipped | ${q.skipped} |\n\nDuration: ${(q.durationMs / 1000).toFixed(1)}s. Browser projects count as separate executions.\n\nDownload the quality-evidence artifact for the HTML report, traces, AI examples, and showcase. AI examples are authored offline; no model is called by this workflow.`,
  );
} catch {
  console.log('Quality results are unavailable. Inspect preceding setup or runner failures.');
}

try {
  const e = JSON.parse(await readFile('artifacts/ai-evaluation.json', 'utf8'));
  console.log(
    `\n## AI quality evidence\n\nGuardrail/regression checks: ${e.guardrails.passed}/${e.guardrails.executed}. Seeded pricing defects detected: ${e.seededDefects.detected}/${e.seededDefects.total}. Candidate origin: ${e.candidates.origin}; ${e.candidates.count} pending review. These are separate from active-test counts and are not a live-model quality benchmark.`,
  );
} catch {
  console.log('AI evaluation evidence is unavailable; inspect the evaluation job.');
}
