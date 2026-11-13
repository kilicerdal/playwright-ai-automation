import { readFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { stripVTControlCharacters } from 'node:util';
import { z } from 'zod';
const testResult = z.object({
  title: z.string(),
  status: z.string(),
  errors: z.array(z.object({ message: z.string().optional() })),
});
const observation = z.object({
  strength: z.enum(['weak', 'strong']),
  httpStatus: z.number(),
  initialStock: z.number(),
  purchasedQuantity: z.number(),
  expectedStock: z.number(),
  observedStock: z.number(),
});
const schema = z.object({
  generatedAt: z.string(),
  sourceSHA256: z.string(),
  scope: z.string(),
  killed: z.number(),
  survived: z.number(),
  errors: z.number(),
  total: z.number(),
  baseline: z.object({ tests: z.array(testResult) }),
  recovery: z.object({
    kind: z.literal('authored-assertion-improvement-demonstration'),
    label: z.string(),
    sourceMutation: z.string(),
    assertionAdded: z.string(),
    stages: z
      .array(
        z.object({
          strength: z.enum(['weak', 'strong']),
          control: z.object({
            outcome: z.literal('survived'),
            tests: z.array(testResult),
            sourceSHA256: z.string(),
          }),
          mutant: z.object({
            outcome: z.enum(['survived', 'killed']),
            tests: z.array(testResult),
            sourceSHA256: z.string(),
          }),
        }),
      )
      .length(2),
  }),
  demonstration: z.object({
    controlPassed: z.literal(true),
    sourceMutation: z.string(),
    observations: z.array(observation),
    tests: z.array(testResult),
  }),
  results: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      category: z.enum(['inventory', 'pricing']),
      outcome: z.enum(['killed', 'survived', 'error']),
      original: z.string(),
      replacement: z.string(),
      tests: z.array(testResult),
    }),
  ),
});
const esc = (value: unknown) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
export async function mutationPanel() {
  let evidence: z.infer<typeof schema> | undefined;
  let notice = 'No mutation evidence yet. Run npm run test:mutation, then npm run showcase:build.';
  try {
    evidence = schema.parse(JSON.parse(await readFile('artifacts/mutation/report.json', 'utf8')));
    const before = evidence.recovery.stages[0];
    const after = evidence.recovery.stages[1];
    if (
      before.strength !== 'weak' ||
      after.strength !== 'strong' ||
      before.mutant.outcome !== 'survived' ||
      after.mutant.outcome !== 'killed' ||
      before.mutant.sourceSHA256 !== after.mutant.sourceSHA256 ||
      [...before.control.tests, ...after.control.tests, ...before.mutant.tests].some(
        (t) => t.status !== 'passed',
      ) ||
      !after.mutant.tests.some((t) => t.status === 'failed')
    )
      throw new Error('Invalid recovery evidence');
    const currentHash = createHash('sha256')
      .update(await readFile('src/db/store.ts'))
      .digest('hex');
    if (currentHash !== evidence.sourceSHA256) {
      evidence = undefined;
      notice =
        'The application source changed after this report. Rerun the mutation campaign before showing results.';
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
      notice =
        'Mutation evidence could not be validated. Rerun the campaign before showing results.';
    evidence = undefined;
  }
  let video = false;
  try {
    await access('docs/media/mutation-walkthrough.webm');
    video = true;
  } catch {
    /* Recording is optional until captured locally. */
  }
  const report = evidence;
  return `<section class="panel" id="mutations" hidden>
  <div class="hero"><div><p class="overline">CHALLENGE THE ASSERTIONS</p><h1>Would your test catch it?</h1><p class="muted">A successful response can hide incorrect inventory. Change the application, keep the business expectation, and see which assertions notice.</p><div class="badges"><span class="badge lime">Local execution</span><span class="badge">Real PostgreSQL</span><span class="badge">No paid services</span></div></div><div class="run-card"><p class="overline">EVIDENCE, NOT JUST A SCORE</p><h2>Healthy first. Defect second.</h2><p>Each source mutation runs in a disposable copy. Timeouts and execution errors never earn detection credit.</p></div></div>
  ${
    report
      ? `<div class="metrics" aria-label="Mutation results"><div class="metric"><p class="overline">HEALTHY BASELINE</p><div class="value good">${report.baseline.tests.filter((t) => t.status === 'passed').length}/${report.baseline.tests.length}</div><small>Unmodified application</small></div><div class="metric"><p class="overline">DEFECTS DETECTED</p><div class="value good">${report.killed}/${report.total}</div><small>Targeted source mutations</small></div><div class="metric"><p class="overline">SURVIVED</p><div class="value ${report.survived ? 'warn' : ''}">${report.survived}</div><small>Investigate assertion gaps</small></div><div class="metric"><p class="overline">EXECUTION ERRORS</p><div class="value ${report.errors ? 'bad' : ''}">${report.errors}</div><small>No detection credit</small></div></div>
  <div class="section-title"><h2>Results by business area</h2><span>Full campaign</span></div>
  <div class="grid" aria-label="Results by business area">${['inventory', 'pricing']
    .map((category) => {
      const rows = report.results.filter((r) => r.category === category);
      return `<div class="card" aria-label="${category === 'inventory' ? 'Inventory' : 'Pricing'} results"><p class="overline">${category.toUpperCase()}</p><h2>${rows.filter((r) => r.outcome === 'killed').length}/${rows.length} targeted defects detected</h2><p class="note">${rows.filter((r) => r.outcome === 'survived').length} survived · ${rows.filter((r) => r.outcome === 'error').length} execution errors</p></div>`;
    })
    .join('')}</div>
  <div class="section-title"><h2>From surviving to detected</h2><span>Authored learning example</span></div>
  <p class="note">Keep the same stock-deduction defect. Run the status-only test, add a stock assertion, then rerun. Both versions pass against the healthy application first. This deliberately incomplete starting test is a teaching example, separate from the full campaign above.</p>
  <div class="metrics" id="mutation-recovery" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">
    <div class="card"><p class="overline">1 / BEFORE</p><h3 class="warn">Mutation survives</h3><p>Healthy control: passed.<br>Status-only test: passed.<br>The stock defect remains.</p><pre>expect(response.status()).toBe(201);</pre></div>
    <div class="card"><p class="overline">2 / IMPROVE</p><h3>Add the missing stock assertion</h3><p>Preserve the business rule: stock 8 minus 2 purchased must equal 6.</p><pre>${esc(report.recovery.assertionAdded)}</pre></div>
    <div class="card"><p class="overline">3 / AFTER</p><h3 class="good">Mutation detected</h3><p>Healthy control: passed.<br>Improved test: fails informatively.<br>Expected stock 6; observed stock 8.</p><details><summary>Inspect the actual rerun</summary>${report.recovery.stages
      .filter((s) => s.strength === 'strong')
      .flatMap((s) => s.mutant.tests)
      .flatMap((t) => t.errors)
      .map((e) => `<pre>${esc(stripVTControlCharacters(e.message ?? ''))}</pre>`)
      .join('')}</details></div>
  </div>
  <details><summary>Verify the two separate mutation runs</summary>${report.recovery.stages.map((s) => `<p>${s.strength === 'weak' ? 'Before adding the assertion' : 'After adding the assertion'}: ${esc(s.mutant.outcome)}. Healthy control passed ${s.control.tests.length}/${s.control.tests.length}. Mutated source SHA-256: <code>${esc(s.mutant.sourceSHA256)}</code>.</p>`).join('')}<p>The application source hash is identical in both mutation runs. Only the enabled test assertions change.</p></details>
  <div class="section-title"><h2>Same defect. Different assertions.</h2><span>Recorded local execution</span></div><p class="note">Healthy control passed both checks. The demonstration then removed the stock deduction from checkout. Both variants below made a real checkout request against that source mutation.</p>
  <div class="grid" id="assertion-comparison">${report.demonstration.observations.map((o) => `<div class="card"><p class="overline">${o.strength === 'weak' ? 'STATUS ONLY' : 'STATUS + BUSINESS STATE'}</p><h2>${o.strength === 'weak' ? 'Weak check passes. Defect remains.' : 'Strong check catches the defect.'}</h2><pre>${o.strength === 'weak' ? 'expect(response.status()).toBe(201);' : 'expect(response.status()).toBe(201);\nexpect(stockAfterCheckout).toBe(6);'}</pre><p>HTTP <strong>${o.httpStatus}</strong> · Starting stock ${o.initialStock} · Purchased ${o.purchasedQuantity}</p><p class="${o.strength === 'weak' ? 'warn' : 'good'}">Expected stock <strong>${o.expectedStock}</strong> · Observed stock <strong>${o.observedStock}</strong></p><p class="note">${o.strength === 'weak' ? 'Passing this incomplete check gives false confidence.' : 'The assertion explains the broken business rule instead of waiting for a timeout.'}</p></div>`).join('')}</div>
  <div class="section-title"><h2>Inspect the source mutations</h2><span>${report.total} targeted changes</span></div><p class="note">Snapshot ${esc(report.generatedAt)}. ${esc(report.scope)} These observations do not prove that the application is defect-free.</p>
  <div class="card">${report.results
    .map(
      (r) =>
        `<details data-mutation="${esc(r.id)}"><summary>${esc(r.label)} — ${esc(r.outcome === 'killed' ? 'Detected' : r.outcome === 'survived' ? 'Survived' : 'Execution error')}</summary><p>${esc(r.category)} · Technical ID: <code>${esc(r.id)}</code></p><p>Original expression</p><pre>${esc(r.original)}</pre><p>Deliberate replacement</p><pre>${esc(r.replacement)}</pre>${
          r.tests
            .filter((t) => t.status !== 'passed')
            .map(
              (t) =>
                `<h3>${esc(t.title)}</h3><pre>${esc(stripVTControlCharacters(t.errors.map((e) => e.message ?? '').join('\n')))}</pre>`,
            )
            .join('') || '<p>No assertion failed for this mutation.</p>'
        }</details>`,
    )
    .join(
      '',
    )}</div><p class="note">Application source SHA-256: <code>${esc(report.sourceSHA256)}</code>. Counts are separate from active regression-test totals.</p>`
      : `<div class="callout" role="status">${esc(notice)}</div>`
  }
  <h2>Reproduce the evidence</h2><pre>npm run db:local:start\nnpm run test:mutation\nnpm run showcase:build\nnpm run showcase\n# Open http://127.0.0.1:4174/#mutations</pre>
  ${video ? '<h2>Local walkthrough</h2><p class="note">Silent browser recording of this evidence snapshot. Use the controls to pause and inspect it.</p><video controls preload="metadata" aria-label="Mutation testing walkthrough" style="width:100%;border-radius:10px" src="/mutation-walkthrough.webm"><track kind="captions" src="/mutation-walkthrough.vtt" srclang="en" label="English" default></video>' : ''}
  </section>`;
}
