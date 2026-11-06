import { mkdirSync, writeFileSync } from 'node:fs';
import type { Reporter, FullResult, TestCase, TestResult } from '@playwright/test/reporter';
import { relative } from 'node:path';
import { redact } from '../ai/guardrails';
export default class QualityReporter implements Reporter {
  private tests = new Map<
    string,
    {
      title: string;
      scenarioId: string;
      authorship: string;
      project: string;
      requirements: string[];
      status: string;
      durationMs: number;
      retries: number;
      error?: string;
    }
  >();
  onTestEnd(test: TestCase, result: TestResult) {
    this.tests.set(test.id, {
      title: test.title,
      scenarioId: `${relative(process.cwd(), test.location.file)}:${test.location.line}:${test.title}`,
      authorship:
        test.annotations.find((a) => a.type === 'authorship')?.description ??
        'engineering-authored (AI-assisted)',
      project: test.parent.project()?.name ?? 'unknown',
      requirements: test.title.match(/@[A-Z]+-\d+/g)?.map((tag) => tag.slice(1)) ?? [],
      status: test.outcome(),
      durationMs: result.duration,
      retries: result.retry,
      error: result.error ? redact(result.error.message ?? '').slice(0, 2000) : undefined,
    });
  }
  onEnd(result: FullResult) {
    const tests = [...this.tests.values()];
    mkdirSync('artifacts', { recursive: true });
    writeFileSync(
      'artifacts/quality.json',
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          status: result.status,
          durationMs: result.duration,
          total: tests.length,
          distinctScenarios: new Set(tests.map((t) => t.scenarioId)).size,
          passed: tests.filter((t) => t.status === 'expected').length,
          failed: tests.filter((t) => t.status === 'unexpected').length,
          flaky: tests.filter((t) => t.status === 'flaky').length,
          skipped: tests.filter((t) => t.status === 'skipped').length,
          tests,
        },
        null,
        2,
      ) + '\n',
    );
  }
}
