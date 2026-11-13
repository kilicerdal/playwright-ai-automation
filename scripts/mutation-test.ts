import { mutationDescription } from '../src/mutations/catalog';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { stripVTControlCharacters } from 'node:util';
import { classifyMutation, type MutationTestResult } from './mutation-results';
import { localDatabaseURL } from '../src/db/store';

if (process.env.CI) throw new Error('Mutation testing is local-only; hosted CI is disabled.');
const root = resolve('.');
const output = join(root, 'artifacts/mutation');
await mkdir(output, { recursive: true });
for (const file of ['report.json', 'report.md', 'report.html'])
  await rm(join(output, file), { force: true });
const sourcePath = 'src/db/store.ts';
const original = await readFile(join(root, sourcePath), 'utf8');
const mutations = [
  {
    id: 'price-round-to-dollars',
    from: 'sum + item.quantity * item.product.price',
    to: 'sum + item.quantity * Math.round(item.product.price / 100) * 100',
  },
  {
    id: 'price-last-line-only',
    from: 'sum + item.quantity * item.product.price',
    to: '0 * sum + item.quantity * item.product.price',
  },
  {
    id: 'price-ignore-quantity',
    from: 'sum + item.quantity * item.product.price',
    to: 'sum + item.product.price',
  },
  {
    id: 'price-add-instead-of-multiply',
    from: 'sum + item.quantity * item.product.price',
    to: 'sum + item.quantity + item.product.price',
  },
  {
    id: 'price-one-cent-surcharge',
    from: 'sum + item.quantity * item.product.price, 0',
    to: 'sum + item.quantity * item.product.price, 1',
  },
  {
    id: 'price-inflate-unit-snapshot',
    from: '[id, item.productId, item.quantity, item.product.price]',
    to: '[id, item.productId, item.quantity, item.product.price + 1]',
  },
  {
    id: 'inventory-reject-exact-stock',
    from: 'next > product.rows[0].available',
    to: 'next >= product.rows[0].available',
  },
  {
    id: 'inventory-ignore-existing-cart',
    from: '(previous.rows[0]?.quantity ?? 0) + quantity',
    to: 'quantity',
  },
  {
    id: 'inventory-skip-decrement',
    from: 'available=available-$1',
    to: 'available=available-0*$1',
  },
  {
    id: 'inventory-decrement-one-only',
    from: 'available=available-$1',
    to: 'available=available-1+0*$1',
  },
  { id: 'inventory-skip-restock', from: 'available=available+$1', to: 'available=available+0*$1' },
  {
    id: 'inventory-restock-one-only',
    from: 'available=available+$1',
    to: 'available=available+1+0*$1',
  },
];
const selected = process.argv.find((arg) => arg.startsWith('--mutant='))?.slice(9);
if (process.argv.slice(2).some((arg) => !arg.startsWith('--mutant=')))
  throw new Error('Usage: npm run test:mutation -- [--mutant=<id>]');
if (selected && !mutations.some((m) => m.id === selected)) throw new Error('Unknown mutant ID');
// Fail closed on source drift rather than report a mutation that was never applied.
for (const mutation of mutations)
  if (original.split(mutation.from).length !== 2)
    throw new Error(`Mutation anchor must occur exactly once: ${mutation.id}`);
const workspace = await mkdtemp(join(output, 'work-'));
type TestResult = MutationTestResult;
type Suite = {
  suites?: Suite[];
  specs?: {
    title: string;
    tests: { results: { status: string; errors?: { message?: string }[] }[] }[];
  }[];
};
const flatten = (suite: Suite): TestResult[] => [
  ...(suite.specs ?? []).flatMap((spec) =>
    spec.tests.flatMap((test) =>
      test.results.map((r) => ({ title: spec.title, status: r.status, errors: r.errors ?? [] })),
    ),
  ),
  ...(suite.suites ?? []).flatMap(flatten),
];
try {
  for (const path of [
    'src',
    'demo',
    'tests',
    'migrations',
    'package.json',
    'tsconfig.json',
    'playwright.mutation.config.ts',
  ])
    await cp(join(root, path), join(workspace, path), { recursive: true });
  await symlink(join(root, 'node_modules'), join(workspace, 'node_modules'), 'dir');
  const run = async (id: string, content: string, baselineTitles?: string[], expectedCount = 7) => {
    await writeFile(join(workspace, sourcePath), content);
    const reportFile = join(workspace, 'artifacts/mutation-results.json');
    await rm(reportFile, { force: true });
    const execution = spawnSync(
      process.execPath,
      [
        join(root, 'node_modules/@playwright/test/cli.js'),
        'test',
        '--config=playwright.mutation.config.ts',
      ],
      {
        cwd: workspace,
        env: { ...process.env, CI: '', TEST_DATABASE_URL: localDatabaseURL, FORCE_COLOR: '0' },
        encoding: 'utf8',
        timeout: 90000,
        maxBuffer: 5 * 1024 * 1024,
      },
    );
    await writeFile(join(output, `${id}.log`), execution.stdout + execution.stderr);
    let report: Suite & { errors?: unknown[] };
    try {
      report = JSON.parse(await readFile(reportFile, 'utf8'));
    } catch {
      return { id, outcome: 'error', reason: 'Missing or invalid Playwright report', tests: [] };
    }
    await cp(reportFile, join(output, `${id}.json`));
    const tests = flatten(report);
    const expectedTitles = baselineTitles ?? tests.map((test) => test.title);
    const outcome = classifyMutation(
      tests,
      expectedTitles,
      execution.status,
      !!execution.error ||
        !!execution.signal ||
        !!report.errors?.length ||
        tests.length !== expectedCount,
    );
    console.log(`${id}: ${outcome}`);
    return { id, outcome, tests, sourceSHA256: createHash('sha256').update(content).digest('hex') };
  };
  const baseline = await run('baseline', original);
  if (baseline.outcome !== 'survived')
    throw new Error(
      'Healthy baseline failed; no mutation score awarded. See artifacts/mutation/baseline.log',
    );
  const baselineTitles = baseline.tests.map((test) => test.title);
  const results: (Awaited<ReturnType<typeof run>> & {
    file: string;
    original: string;
    replacement: string;
    label: string;
    category: 'inventory' | 'pricing';
  })[] = [];
  for (const mutation of mutations.filter((m) => !selected || m.id === selected)) {
    const result = await run(
      mutation.id,
      original.replace(mutation.from, mutation.to),
      baselineTitles,
    );
    results.push({
      ...result,
      ...mutationDescription(mutation.id),
      file: sourcePath,
      original: mutation.from,
      replacement: mutation.to,
    });
  }
  await writeFile(
    join(workspace, 'playwright.mutation.config.ts'),
    (await readFile(join(root, 'playwright.mutation.config.ts'), 'utf8')).replace(
      'inventory-pricing.spec.ts',
      'assertion-demo.spec.ts',
    ),
  );
  const demoControl = await run('assertion-demo-control', original, undefined, 2);
  if (demoControl.outcome !== 'survived')
    throw new Error('Assertion demonstration healthy control failed');
  const demoMutant = await run(
    'assertion-demo-mutant',
    original.replace('available=available-$1', 'available=available-0*$1'),
    demoControl.tests.map((t) => t.title),
    2,
  );
  if (
    demoMutant.outcome !== 'killed' ||
    demoMutant.tests.find((t) => t.title.includes('weak'))?.status !== 'passed' ||
    demoMutant.tests.find((t) => t.title.includes('strong'))?.status !== 'failed'
  )
    throw new Error('Assertion demonstration did not produce the verified comparison');
  const observations = await Promise.all(
    ['weak', 'strong'].map(
      async (strength) =>
        JSON.parse(
          await readFile(join(workspace, 'artifacts/assertion-demo', `${strength}.json`), 'utf8'),
        ) as {
          strength: string;
          httpStatus: number;
          initialStock: number;
          purchasedQuantity: number;
          expectedStock: number;
          observedStock: number;
        },
    ),
  );
  const demonstration = {
    controlPassed: true,
    sourceMutation: 'inventory-skip-decrement',
    observations,
    tests: demoMutant.tests,
  };
  // Deliberately incomplete teaching variant, kept separate from the complete campaign.
  // Keep the mutant source identical while changing only the enabled assertion variant.
  const demoConfig = (await readFile(join(root, 'playwright.mutation.config.ts'), 'utf8')).replace(
    'inventory-pricing.spec.ts',
    'assertion-demo.spec.ts',
  );
  const recoveryStages = [];
  for (const strength of ['weak', 'strong'] as const) {
    await writeFile(
      join(workspace, 'playwright.mutation.config.ts'),
      demoConfig.replace('workers: 1,', `workers: 1, grep: /${strength} checkout check/,`),
    );
    const control = await run(`recovery-${strength}-control`, original, undefined, 1);
    if (control.outcome !== 'survived')
      throw new Error(`Recovery ${strength} healthy control failed`);
    const mutant = await run(
      `recovery-${strength}-mutant`,
      original.replace('available=available-$1', 'available=available-0*$1'),
      control.tests.map((t) => t.title),
      1,
    );
    if (mutant.outcome !== (strength === 'weak' ? 'survived' : 'killed'))
      throw new Error(
        `Recovery ${strength} produced an unexpected outcome; no showcase evidence accepted`,
      );
    recoveryStages.push({ strength, control, mutant });
  }
  if (recoveryStages[0].mutant.sourceSHA256 !== recoveryStages[1].mutant.sourceSHA256)
    throw new Error('Recovery demonstration must use identical mutated application source');
  const recovery = {
    kind: 'authored-assertion-improvement-demonstration',
    label: mutationDescription('inventory-skip-decrement').label,
    sourceMutation: 'inventory-skip-decrement',
    assertionAdded:
      "expect(observedStock, 'MUTATION_ASSERTION purchased stock is deducted').toBe(6);",
    stages: recoveryStages,
  };
  const count = (outcome: string) => results.filter((r) => r.outcome === outcome).length;
  const summary = {
    generatedAt: new Date().toISOString(),
    sourceSHA256: createHash('sha256').update(original).digest('hex'),
    scope: `${results.length} targeted source mutations in PostgreSQL inventory and pricing; not exhaustive mutation coverage.`,
    execution: 'Local loopback HTTP and PostgreSQL only; no model calls, uploads or hosted CI.',
    baseline,
    demonstration,
    recovery,
    killed: count('killed'),
    survived: count('survived'),
    errors: count('error'),
    total: results.length,
    results,
  };
  await writeFile(join(output, 'report.json'), JSON.stringify(summary, null, 2) + '\n');
  await writeFile(
    join(output, 'report.md'),
    `# Local inventory and pricing mutation report\n\nGenerated: ${summary.generatedAt}\n\nHealthy baseline: ${baseline.tests.length}/${baseline.tests.length} passed.\n\nKilled: ${summary.killed}; survived: ${summary.survived}; execution errors: ${summary.errors}; total: ${summary.total}.\n\n${summary.scope}\n\n| Mutation | Outcome | Failing assertion scenario |\n| --- | --- | --- |\n${results
      .map(
        (r) =>
          `| ${r.label} (${r.id}, ${r.category}) | ${r.outcome} | ${r.tests
            .filter((t) => t.status === 'failed')
            .map((t) => t.title)
            .join('; ')} |`,
      )
      .join(
        '\n',
      )}\n\nSource SHA-256: ${summary.sourceSHA256}\n\nTimeouts, transport errors, unexpected HTTP failures and setup errors earn no kill credit. Reports include expected/observed assertion evidence.\n`,
  );
  const categories = ['inventory', 'pricing'].map((category) => ({
    category,
    tested: results.filter((r) => r.category === category).length,
    detected: results.filter((r) => r.category === category && r.outcome === 'killed').length,
    survived: results.filter((r) => r.category === category && r.outcome === 'survived').length,
    errors: results.filter((r) => r.category === category && r.outcome === 'error').length,
  }));
  await writeFile(
    join(output, 'report.md'),
    (await readFile(join(output, 'report.md'), 'utf8')) +
      '\n## Results by business area\n\n' +
      categories
        .map(
          (c) =>
            `${c.category}: ${c.detected}/${c.tested} detected; ${c.survived} survived; ${c.errors} execution errors.`,
        )
        .join('\n\n') +
      '\n\n## Authored assertion improvement demonstration\n\nSame checkout stock-deduction mutation: the status-only variant survives (1/1), then the added stock assertion detects it (1/1). Both healthy controls pass. This teaching comparison is separate from the full campaign totals.\n\nAdded assertion: `' +
      recovery.assertionAdded +
      '`\n',
  );
  const escape = (value: string) =>
    value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  await writeFile(
    join(output, 'report.html'),
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Inventory and pricing mutation evidence</title><style>body{font:17px system-ui;max-width:1000px;margin:40px auto;padding:0 24px;color:#182638;background:#f6f8fb}article{background:white;padding:20px;margin:16px 0;border:1px solid #ccd5df;border-radius:10px}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#eef2f6;padding:16px;font-size:14px}h1{line-height:1.2}code{overflow-wrap:anywhere}</style><main><h1>Do the tests catch deliberate defects?</h1><p>Healthy control: ${baseline.tests.length} passed. Detected: ${summary.killed}. Survived: ${summary.survived}. Execution errors: ${summary.errors}.</p><p>${escape(summary.scope)} All execution was local. No uploads, model calls, or hosted CI.</p><p>Generated: ${escape(summary.generatedAt)}</p><h2>Results by business area</h2>${categories.map((c) => `<p>${c.category}: ${c.detected}/${c.tested} detected; ${c.survived} survived; ${c.errors} execution errors.</p>`).join('')}<h2>From surviving to detected</h2><p>Authored teaching comparison, separate from the full campaign. Healthy controls pass. The same stock-deduction mutation survives the status-only check, then is detected after the stock assertion is added.</p><pre>${escape(recovery.assertionAdded)}</pre>${results
      .map(
        (r) =>
          `<article><h2>${escape(r.label)}: ${escape(r.outcome)}</h2><p>${escape(r.category)} · <code>${escape(r.id)}</code></p><p><code>${escape(r.original)}</code><br>changed to<br><code>${escape(r.replacement)}</code></p>${r.tests
            .filter((t) => t.status !== 'passed')
            .map(
              (t) =>
                `<h3>${escape(t.title)}</h3><pre>${escape(t.errors.map((e) => stripVTControlCharacters(e.message ?? '')).join('\n'))}</pre>`,
            )
            .join('')}</article>`,
      )
      .join(
        '',
      )}<p>Source SHA-256: <code>${summary.sourceSHA256}</code></p><p>These targeted results do not prove that the application is defect-free.</p></main></html>`,
  );
  console.log(`Report: ${join(output, 'report.md')}`);
  if (summary.survived || summary.errors) process.exitCode = 1;
} finally {
  await rm(workspace, { recursive: true, force: true });
}
