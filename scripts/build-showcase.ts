import { readFile, mkdir, writeFile } from 'node:fs/promises';
import type { Requirement } from '../src/ai/contracts';
type TestRow = {
  title: string;
  authorship?: string;
  project: string;
  requirements: string[];
  status: string;
  durationMs: number;
  retries: number;
  error?: string;
};
type Quality = {
  generatedAt: string;
  status: string;
  durationMs: number;
  total: number;
  distinctScenarios?: number;
  passed: number;
  failed: number;
  flaky: number;
  skipped: number;
  tests: TestRow[];
};
type AIRun = {
  task: string;
  mode: string;
  status: string;
  elapsedMs: number;
  data: unknown;
  attempts: {
    inputTokens: number;
    outputTokens: number;
    model: string;
    accepted: boolean;
    errors: string[];
  }[];
};
type AI = {
  mode: string;
  generatedAt: string;
  note: string;
  evidenceSource: string;
  runs: AIRun[];
};
async function optional<T>(path: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}
const quality = await optional<Quality>('artifacts/quality.json');
const ai = await optional<AI>('artifacts/ai-run.json');
const requirements = JSON.parse(
  await readFile('requirements/commerce.json', 'utf8'),
) as Requirement[];
const esc = (value: unknown) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
type Candidate = {
  status: string;
  origin: string;
  candidateCount: number;
  codeHash: string;
  model: string;
  validation: Record<string, boolean>;
  run: AIRun;
};
type Evaluation = {
  guardrails: { executed: number; passed: number };
  seededDefects: { total: number; detected: number; names: string[] };
  note: string;
};
const candidate = await optional<Candidate>('artifacts/candidates/manifest.json');
const evaluation = await optional<Evaluation>('artifacts/ai-evaluation.json');
let candidateCode = '';
try {
  candidateCode = await readFile('artifacts/candidates/cart-generated.spec.ts.txt', 'utf8');
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}
const workflowRuns = [...(ai?.runs ?? []), ...(candidate?.run ? [candidate.run] : [])];
const anyLive = ai?.mode === 'live' || candidate?.origin === 'live-model-generated';
const liveLabel =
  ai?.mode === 'live' && candidate?.origin === 'live-model-generated'
    ? 'LIVE MODEL RUNS'
    : anyLive
      ? 'LIVE + OFFLINE EVIDENCE'
      : 'OFFLINE AI EXAMPLES';
type DatabaseReport = {
  stats: { expected: number; unexpected: number; flaky: number; skipped: number; duration: number };
};
type ReviewedEvaluation = {
  mode: string;
  origin: string;
  controlPassed: number;
  controls: unknown[];
  detected: number;
  totalMutants: number;
  note: string;
};
const database = await optional<DatabaseReport>('artifacts/postgres-results.json');
const reviewed = await optional<ReviewedEvaluation>('artifacts/approved-evaluation.json');
const fixtureEvaluation = await optional<ReviewedEvaluation>(
  'artifacts/v3-fixture-evaluation.json',
);
type JourneyEvidence = {
  generatedAt: string;
  origin: string;
  modelCalls: number;
  detected: number;
  total: number;
  controls: {
    id: string;
    title: string;
    requirement: string;
    hash: string;
    passed: boolean;
    steps: {
      index: number;
      action: string;
      actor: string;
      expected: unknown;
      actual: unknown;
      passed: boolean;
    }[];
  }[];
  mutations: { fault: string; detected: boolean; detectedBy: string[] }[];
};
const journeyEvidence = await optional<JourneyEvidence>('artifacts/v4-journeys.json');
const projects = [...new Set(quality?.tests.map((t) => t.project) ?? [])];
const tokens =
  workflowRuns.reduce(
    (sum, r) => sum + r.attempts.reduce((s, a) => s + a.inputTokens + a.outputTokens, 0),
    0,
  ) ?? 0;
const descriptions: Record<string, string> = {
  plan: 'Requirements → risk-based scenarios',
  draft: 'Validated plan → quarantined Playwright draft',
  triage: 'Failure evidence → grounded investigation',
  locator: 'DOM evidence → reviewed locator proposal',
  impact: 'Change context → advisory regression selection',
  cases: 'Live case generation → independent oracle → compiler → review queue',
};
const statusClass = (status: string) =>
  ['passed', 'expected', 'accepted'].includes(status)
    ? 'good'
    : status === 'failed' || status === 'unexpected'
      ? 'bad'
      : 'warn';
const html = `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>eAI / Quality Intelligence</title><style>
:root{color-scheme:dark;--bg:#0c111b;--card:#121b29;--line:#293344;--muted:#a4b1c6;--lime:#d7ff84;--blue:#a3c3ff;font-family:Inter,Arial,sans-serif;color:#edf2fb;background:var(--bg)}*{box-sizing:border-box}body{margin:0}a{color:inherit;text-decoration:none}button,input,select,textarea{font:inherit}select,textarea{background:#0c1420;color:#edf2fb;border:1px solid #465367;border-radius:6px;padding:12px}textarea{display:block;width:100%;resize:vertical;margin:12px 0}.studio-run{border:0;border-radius:6px;padding:14px 18px;color:#152117;background:var(--lime);font-weight:700}.studio-run:disabled{opacity:.6}.toolbar select{min-width:0;flex:1}button{cursor:pointer}.shell{display:grid;grid-template-columns:224px minmax(0,1fr);min-height:100vh}aside{padding:32px 24px;border-right:1px solid var(--line);background:#0e1521}.logo{font-weight:800;font-size:30px;letter-spacing:-2px}.logo span{color:var(--lime)}.subtitle,.overline{font-size:10px;letter-spacing:2px;font-weight:700;color:var(--muted)}.subtitle{margin:10px 0 48px}nav{display:grid;gap:10px}nav button{color:var(--muted);background:transparent;border:0;text-align:left;padding:13px 14px;border-radius:8px;font-size:13px}nav button.active{background:#26332a;color:var(--lime)}.aside-bottom{margin-top:70px;line-height:1.8;font-size:12px;color:var(--muted)}.status-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--lime);margin-right:6px}main{min-width:0;padding:30px 42px;max-width:1550px;width:100%}.topbar{display:flex;justify-content:space-between;border-bottom:1px solid var(--line);padding-bottom:24px;font-size:12px;color:var(--muted)}.topbar strong{color:white}.hero{display:grid;grid-template-columns:1.6fr 1fr;gap:30px;padding:38px 0 28px}.hero h1{font-size:clamp(32px,3.5vw,54px);line-height:1.06;letter-spacing:-2px;margin:16px 0}.hero h1 span{color:var(--lime)}p{line-height:1.6}.muted{color:var(--muted)}.hero p{font-size:14px;max-width:650px}.badges{display:flex;gap:8px;flex-wrap:wrap}.badge{font-size:10px;padding:7px 10px;border:1px solid #3c4b5f;border-radius:5px;color:#d0dcee}.badge.lime{color:var(--lime);border-color:#4c6637;background:#1b2c20}.run-card{border:1px solid #43573d;background:linear-gradient(140deg,#1c2c25,#131e2a);border-radius:12px;padding:24px;align-self:center}.run-card h2{font-size:24px;font-weight:500;letter-spacing:-.5px}.run-card p{font-size:12px;margin:8px 0}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px}.metric,.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:21px}.metric .value{font-size:36px;letter-spacing:-1px;margin:14px 0 9px}.metric small{color:var(--muted);font-size:11px}.good{color:var(--lime)}.bad{color:#ffaaa7}.warn{color:#ffe1a0}.grid{display:grid;grid-template-columns:1.35fr 1fr;gap:20px}.card h2{font-size:17px;font-weight:500;margin:0 0 22px}.stage{display:grid;grid-template-columns:30px 1fr auto;gap:12px;padding:15px 0;border-bottom:1px solid var(--line);align-items:center}.stage:last-child{border:0}.stage-index{display:grid;place-items:center;width:28px;height:28px;background:#263329;border:1px solid #455b34;color:var(--lime);font-size:11px;border-radius:6px}.stage h3{font-size:13px;margin:0 0 6px;font-weight:600}.stage p{font-size:11px;color:var(--muted);margin:0}.stage small{font-size:10px;color:var(--lime)}.browser{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:20px 0;font-size:12px}.bar{height:5px;background:#283345;border-radius:4px;overflow:hidden;flex:1;max-width:100px}.bar span{display:block;height:100%;background:var(--blue)}.browser small{color:var(--muted)}.callout{border:1px solid #3a4e43;background:#182a24;padding:14px 17px;border-radius:8px;margin-top:22px;font-size:12px;line-height:1.7;color:#cfdfcf}.section-title{display:flex;align-items:center;justify-content:space-between;margin:28px 0 14px}.section-title h2{font-size:17px;font-weight:500}.section-title span{font-size:11px;color:var(--muted)}table{border-collapse:collapse;width:100%;font-size:12px}th{color:var(--muted);font-size:10px;letter-spacing:1px;text-transform:uppercase;text-align:left;font-weight:500}th,td{padding:14px 12px;border-bottom:1px solid var(--line);vertical-align:top}td:first-child{max-width:470px}code{overflow-wrap:anywhere}.metric{min-width:0;overflow-wrap:anywhere}code,pre{font-family:'SFMono-Regular',Consolas,monospace;font-size:12px}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#0a1019;padding:20px;border:1px solid var(--line);border-radius:8px;line-height:1.7;color:#c5d4ec}details{border-top:1px solid var(--line);padding:18px 0}summary{cursor:pointer;font-size:13px}details p{overflow-wrap:anywhere;font-size:12px;color:var(--muted)}.toolbar{display:flex;gap:12px;margin-bottom:18px}.toolbar input{width:100%;padding:12px;color:white;background:#0c1420;border:1px solid #465367;border-radius:6px}.panel[hidden]{display:none}.architecture{display:flex;gap:10px;flex-wrap:wrap;align-items:center;padding:24px 0}.architecture span{border:1px solid #45536b;background:#1a2639;border-radius:7px;padding:14px;font-size:12px}.architecture b{color:var(--lime)}.footer{display:flex;justify-content:space-between;margin-top:32px;padding:20px 0;border-top:1px solid var(--line);font-size:10px;color:var(--muted);gap:14px}.empty{color:var(--muted);font-size:13px}[tabindex]:focus-visible,button:focus-visible,input:focus-visible,a:focus-visible,summary:focus-visible{outline:3px solid var(--lime);outline-offset:4px}.card{min-width:0}.table-wrap{overflow:auto}.note{overflow-wrap:anywhere;font-size:12px;line-height:1.8;color:var(--muted)}@media(max-width:1050px){.shell{grid-template-columns:1fr}aside{padding:20px 24px;border-right:0;border-bottom:1px solid var(--line)}.subtitle,.aside-bottom{display:none}nav{display:flex;flex-wrap:wrap;margin-top:15px;gap:4px}main{padding:24px}.hero{grid-template-columns:1fr}.run-card{display:none}.grid{grid-template-columns:1fr}.metrics{grid-template-columns:repeat(2,1fr)}.topbar{gap:15px;line-height:1.8}.hero h1{letter-spacing:-1px}.stage{grid-template-columns:28px 1fr}.stage small{grid-column:2}.footer{flex-direction:column}.metric{padding:17px}.metric .value{font-size:29px}}
</style><link rel="stylesheet" href="/showtime.css"><script src="/showtime.js" defer></script></head><body><div class="shell"><aside><a class="logo" href="#overview">eAI<span> /</span></a><p class="subtitle">QUALITY INTELLIGENCE</p><nav aria-label="Report sections"><button data-tab="showtime">▶ &nbsp; V5 showcase</button><button data-tab="overview" class="active" aria-current="page">◈ &nbsp; Command center</button><button data-tab="ai">✧ &nbsp; AI engineering lab</button><button data-tab="generation">✧ &nbsp; Generated test review</button><button data-tab="tests">▤ &nbsp; Test explorer</button><button data-tab="traceability">⌘ &nbsp; Traceability</button><button data-tab="journeys">↗ &nbsp; V4 journey intelligence</button><button data-tab="durable">▦ &nbsp; V3 database evidence</button><button data-tab="architecture">◇ &nbsp; Framework design</button></nav><div class="aside-bottom"><span class="status-dot"></span>LOCAL SHOWCASE<br>Playwright + TypeScript<br>Created by Erdal Kilic<br><br>AI proposes.<br>Evidence decides.</div></aside><main><div class="topbar"><span><strong>QUALITY ENGINEERING</strong> &nbsp; / &nbsp; Commerce release</span><span>Report snapshot · ${esc(quality?.generatedAt ?? 'No suite run yet')}</span></div>
<section class="panel" id="overview"><div class="hero"><div><p class="overline">THE AI-NATIVE QUALITY WORKBENCH</p><h1>Confidence, engineered.<br><span>Intelligence, verified.</span></h1><p class="muted">From requirements to risk. From failures to evidence. A complete quality engineering workflow with AI at the center and deterministic checks at every boundary.</p><div class="badges"><span class="badge lime">${esc(liveLabel)}</span><span class="badge">6 AI workflows</span><span class="badge">Isolated commerce sandbox</span></div></div><div class="run-card"><p class="overline">LATEST EXECUTION</p><h2 class="${statusClass(quality?.status ?? 'unknown')}">${esc(quality ? quality.status.toUpperCase() : 'AWAITING FIRST RUN')}</h2><p>${quality ? `${quality.passed} passed · ${quality.failed} failed · ${quality.flaky} flaky · ${quality.skipped} skipped` : 'Run npm test to collect verified results.'}</p><p class="muted">${quality ? `${(quality.durationMs / 1000).toFixed(1)} seconds · ${projects.length} executed projects` : 'No synthetic pass rates or coverage claims.'}</p></div></div>
<div class="metrics"><div class="metric"><p class="overline">EXECUTED CASES</p><div class="value">${quality?.total ?? '—'}</div><small>${quality?.distinctScenarios ?? '—'} distinct scenarios in this main run</small></div><div class="metric"><p class="overline">PASSED / TOTAL</p><div class="value good">${quality ? `${quality.passed} / ${quality.total}` : '—'}</div><small>Unexpected: ${quality?.failed ?? '—'} · flaky: ${quality?.flaky ?? '—'}</small></div><div class="metric"><p class="overline">AI TASKS ACCEPTED</p><div class="value">${workflowRuns.length || '—'}<span class="muted"> / 6</span></div><small>Structural + semantic validation gates</small></div><div class="metric"><p class="overline">MODEL TOKEN USAGE</p><div class="value">${tokens.toLocaleString()}</div><small>${anyLive ? 'Reported input + output tokens' : 'Offline examples do not call a model'}</small></div></div>
<div class="grid"><div class="card"><h2>Intelligence pipeline <span class="muted">/ 01 → 06</span></h2>${Object.entries(
  descriptions,
)
  .map(
    ([task, description], i) =>
      `<div class="stage"><span class="stage-index">0${i + 1}</span><div><h3>${esc(task[0].toUpperCase() + task.slice(1))}</h3><p>${esc(description)}</p></div><small>${workflowRuns.some((r) => r.task === task) ? 'VALIDATED' : 'NOT RUN'}</small></div>`,
  )
  .join('')}</div><div class="card"><h2>Execution environments</h2>${
  projects
    .map((project) => {
      const rows = quality!.tests.filter((t) => t.project === project);
      const passed = rows.filter((t) => t.status === 'expected').length;
      return `<div class="browser"><span>${esc(project)}</span><div class="bar"><span style="width:${(100 * passed) / rows.length}%"></span></div><small>${passed}/${rows.length}</small></div>`;
    })
    .join('') || '<p class="empty">Awaiting a full suite run.</p>'
}<div class="callout">Release gate: type safety, lint, formatting, API contracts, AI guardrails, browser journeys, accessibility scans, and retry-aware reporting.</div><p class="note">Automated accessibility scans are selected checks. These counts do not measure total product coverage or certify compliance.</p></div></div>
<div class="section-title"><h2>Evidence over claims.</h2><span>Every result has a source</span></div><div class="card"><p class="note">Suite results: <code>artifacts/quality.json</code> · AI provenance: <code>artifacts/ai-run.json</code> · Detailed actions and failure traces: <code>playwright-report/</code></p><p class="note">${esc(ai?.note ?? 'Run npm run ai:demo to explore the authored examples, Live API access is disabled by policy.')}</p></div></section>
<section class="panel" id="ai" hidden><div class="hero"><div><p class="overline">GROUND. GENERATE. VERIFY.</p><h1>The AI engineering lab.</h1><p class="muted">Six AI workflow contracts, demonstrated with authored offline examples. Plans cite requirements. Investigations cite evidence. Draft code stays quarantined until a person reviews it.</p></div></div><div class="callout">Mode: ${esc(ai?.mode ?? 'not run')} · Evidence: ${esc(ai?.evidenceSource ?? 'none')}<br>${esc(ai?.note ?? 'No AI artifact yet.')}</div>${ai?.runs.map((run) => `<details><summary>${esc(run.task.toUpperCase())} · ${esc(run.status)} · ${run.attempts.length} attempt(s) · ${run.elapsedMs}ms</summary><p>Model: ${esc(run.attempts.at(-1)?.model)} · Prompt version 2.0.0 · No generated code was executed.</p><pre>${esc(JSON.stringify(run.data, null, 2))}</pre><p>Validation attempts</p><pre>${esc(JSON.stringify(run.attempts, null, 2))}</pre></details>`).join('') ?? ''}<div class="card" style="margin-top:24px"><h2>Interactive AI Studio</h2><p class="note" id="studio-status">Checking local provider availability…</p><form id="studio-form"><div class="toolbar"><select id="studio-task" aria-label="AI task"><option value="plan">Risk-based plan</option><option value="draft">Draft Playwright spec</option><option value="triage">Failure investigation</option><option value="locator">Locator proposal</option><option value="impact">Change-impact analysis</option><option value="cases">Generate API test cases</option></select><select id="studio-mode" aria-label="AI mode"><option value="offline">Offline authored example</option><option value="live" disabled>Live model</option></select></div><label class="note" for="studio-question">Engineering question (authored examples do not interpret this text)</label><textarea id="studio-question" rows="4" required maxlength="6000">Analyze checkout idempotency, authorization boundaries, and failed-response recovery. Cite supplied requirement and evidence IDs.</textarea><button class="studio-run" type="submit">Run validated AI task →</button></form><p id="studio-feedback" role="status" aria-live="polite"></p><pre id="studio-result" hidden></pre><p class="note">The Studio uses the included requirements and explicitly synthetic incident evidence. It never uploads your filesystem or executes generated code. Live API calls are disabled by the zero-spend policy.</p></div><h2>Zero-spend mode</h2><pre>npm run ai:demo
npm run ai:candidates
npm run journeys:evaluate</pre><p class="note">Live mode fails if credentials, model access, schema validation, or semantic gates fail. It never silently swaps in example output. Input redaction is defense in depth; review artifacts before submitting private data.</p></section>
<section class="panel" id="generation" hidden><div class="hero"><div><p class="overline">GENERATE → CHALLENGE → COMPILE → REVIEW</p><h1>Test generation, with evidence.</h1><p class="muted">Inspect generated expectations against an independent oracle, view the compiled draft, and verify its provenance before promotion.</p></div></div><div class="metrics"><div class="metric"><p class="overline">CANDIDATES</p><div class="value">${candidate?.candidateCount ?? '—'}</div><small>${esc(candidate?.origin ?? 'Not generated')}</small></div><div class="metric"><p class="overline">REVIEW STATE</p><div class="value warn" style="font-size:20px">${esc(candidate?.status ?? 'Not generated')}</div><small>Candidate drafts are not active test counts</small></div><div class="metric"><p class="overline">AI REGRESSION CHECKS</p><div class="value good">${evaluation ? evaluation.guardrails.passed + '/' + evaluation.guardrails.executed : '—'}</div><small>Deterministic validation and regression cases</small></div><div class="metric"><p class="overline">SEEDED DEFECTS DETECTED</p><div class="value good">${evaluation ? evaluation.seededDefects.detected + '/' + evaluation.seededDefects.total : '—'}</div><small>Curated pricing faults, not exhaustive mutation coverage</small></div></div><div class="card"><h2>Provenance and validation</h2><p class="note">Model: ${esc(candidate?.model ?? 'Not generated')}<br>SHA-256: <code>${esc(candidate?.codeHash ?? '—')}</code></p><pre>${esc(JSON.stringify(candidate?.validation ?? {}, null, 2))}</pre><p class="note">${esc(evaluation?.note ?? 'Run the version-two verification command to produce evaluation evidence.')}</p></div><details><summary>Inspect the quarantined Playwright draft</summary><pre>${esc(candidateCode || 'No draft exists yet.')}</pre></details><details><summary>Seeded defect set</summary><ul>${evaluation?.seededDefects.names.map((name) => '<li class="note">' + esc(name) + '</li>').join('') ?? ''}</ul></details><h2>Explore authored candidates locally</h2><pre>npm run ai:candidates
# Live generation is disabled by project policy.</pre><p class="note">The model generates structured cases. A trusted renderer writes the Playwright code, preserving assertions. No raw model code is automatically executed. Human review is required before manually promoting candidates into an active test folder.</p></section><section class="panel" id="tests" hidden><div class="section-title"><h2>Test explorer</h2><span>${quality?.total ?? 0} results</span></div><div class="toolbar"><input id="filter" aria-label="Filter test results" placeholder="Search test, requirement, project, or status…"></div><div class="card table-wrap"><table><thead><tr><th>Scenario</th><th>Project</th><th>Authorship</th><th>Outcome</th><th>Time</th><th>Retries</th></tr></thead><tbody>${quality?.tests.map((t) => `<tr data-test-row><td>${esc(t.title)}${t.error ? `<details><summary>Failure evidence</summary><pre>${esc(t.error)}</pre></details>` : ''}</td><td>${esc(t.project)}</td><td>${esc(t.authorship ?? 'engineering-authored (AI-assisted)')}</td><td class="${statusClass(t.status)}">${esc(t.status)}</td><td>${t.durationMs}ms</td><td>${t.retries}</td></tr>`).join('') ?? ''}</tbody></table></div><p id="empty-filter" hidden>No matching tests.</p></section>
<section class="panel" id="traceability" hidden><div class="hero"><div><p class="overline">REQUIREMENT → SCENARIO → EVIDENCE</p><h1>Make the scope visible.</h1><p class="muted">Execution mapping from requirement tags. A linked test is evidence of an exercised scenario, not a claim of exhaustive coverage.</p></div></div>${requirements
  .map((r) => {
    const rows = quality?.tests.filter((t) => t.requirements.includes(r.id)) ?? [];
    return `<details><summary>${esc(r.id)} · ${rows.length} linked executions · ${rows.filter((t) => t.status === 'expected').length} expected outcomes</summary><p>${esc(r.text)}</p><ul>${rows.map((t) => `<li class="note">${esc(t.project)} — ${esc(t.title)} — ${esc(t.status)}</li>`).join('')}</ul></details>`;
  })
  .join('')}</section>
<section class="panel" id="showtime" hidden><div class="showtime-heading"><div><p class="overline">V5 / THE FIVE-MINUTE SHOWCASE</p><h1>Make quality visible.</h1><p class="muted">Run a real journey. Reveal a controlled defect. Leave reproducible evidence.</p></div><button id="presentation-toggle" class="showtime-button" aria-pressed="false">Presentation mode</button></div><div class="callout">Local execution only · Authored offline journeys · No live AI model · No real payments</div><div class="showtime-grid"><div class="card"><p class="tour-progress" id="tour-progress" role="status"></p><h2 id="tour-title" tabindex="-1"></h2><p id="tour-body"></p><p class="note" id="tour-proof"></p><div class="tour-controls"><button class="showtime-button" id="tour-previous">Previous</button><button class="showtime-button" id="tour-next">Next</button><button class="showtime-button" id="tour-action">Explore evidence</button></div></div><div class="card"><h2>Interactive journey runner</h2><p class="note">Each run uses disposable PostgreSQL schemas. A selected fault is applied only to a separate demonstration instance after the healthy control passes.</p><form id="journey-run-form" class="showtime-form"><label for="journey-choice">Authored journey</label><select id="journey-choice" required></select><label for="journey-fault">Execution mode</label><select id="journey-fault"><option value="">Healthy control</option><option value="missing-restock">Simulated fault: missing stock restoration</option><option value="read-ownership">Simulated fault: cross-customer order read</option><option value="duplicate-replay">Simulated fault: duplicate checkout replay</option></select><button class="showtime-button primary" id="journey-run-button" disabled>Run journey locally</button></form><p class="note" id="journey-run-status" role="status">Loading included journeys…</p><p id="journey-run-error" role="alert" hidden></p><ol class="journey-steps" id="journey-live-steps" aria-label="Live journey steps" tabindex="0"></ol></div></div><div id="journey-result" class="card" hidden><h2 id="journey-result-title"></h2><p class="note" id="journey-result-summary"></p><p class="note" id="journey-run-identity"></p><div id="journey-divergence" hidden><h3>First divergence</h3><pre id="journey-difference"></pre></div><h3>Reproduce this run</h3><pre id="journey-replay"></pre><button class="showtime-button" id="journey-export" disabled>Download run evidence</button><p class="note">Safe JSON contains step observations and a replay command, not credentials, cookies, shipping data, or database connection strings. The execution record is not a browser trace.</p></div><p class="note">Launch everything locally with <code>npm run showcase:launch</code>. Escape exits presentation mode. Use Previous and Next to pace the walkthrough yourself.</p></section>
<section class="panel" id="journeys" hidden><div class="hero"><div><p class="overline">V4 / LOCAL JOURNEY INTELLIGENCE</p><h1>Follow the journey. Prove every step.</h1><p class="muted">Multi-step commerce journeys checked by an independent reference model against real PostgreSQL applications. Authored offline examples; no live model generation.</p></div></div><div class="metrics"><div class="metric"><p class="overline">JOURNEY CONTROLS</p><div class="value good">${journeyEvidence?.controls.filter((c) => c.passed).length ?? '—'}</div><small>Validated plans, fixed HTTP operations</small></div><div class="metric"><p class="overline">LIFECYCLE FAULTS</p><div class="value good">${journeyEvidence ? journeyEvidence.detected + '/' + journeyEvidence.total : '—'}</div><small>Curated faults; not exhaustive coverage</small></div><div class="metric"><p class="overline">MODEL CALLS</p><div class="value">${journeyEvidence?.modelCalls ?? '—'}</div><small>Live APIs blocked by project policy</small></div><div class="metric"><p class="overline">EXECUTION POLICY</p><div class="value">Local only</div><small>AWS and hosted workflows disabled</small></div></div><div class="card"><h2>Requirement → plan → model expectation → observation</h2><p class="note">${journeyEvidence ? 'Evidence captured ' + esc(journeyEvidence.generatedAt) : 'Run npm run journeys:evaluate to generate evidence.'} Each journey has a content hash. The interpreter never executes generated JavaScript or arbitrary URLs. A server error invalidates evaluation; it does not earn defect-detection credit.</p>${(journeyEvidence?.controls ?? []).map((c) => `<details><summary>${esc(c.id)} · ${esc(c.title)} · ${c.passed ? 'PASSED' : 'FAILED'}</summary><p>Requirement ${esc(c.requirement)} · Authored offline example · SHA-256 ${esc(c.hash)}</p><div class="table-wrap" tabindex="0"><table><caption>Step evidence for ${esc(c.id)}</caption><thead><tr><th scope="col">Step</th><th scope="col">Actor / action</th><th scope="col">Reference expectation</th><th scope="col">Observed</th></tr></thead><tbody>${c.steps.map((step) => `<tr><td>${step.index}</td><td>${esc(step.actor)} / ${esc(step.action)}</td><td><code>${esc(JSON.stringify(step.expected))}</code></td><td><code>${esc(JSON.stringify(step.actual))}</code> · ${step.passed ? 'passed' : 'failed'}</td></tr>`).join('')}</tbody></table></div></details>`).join('')}</div><div class="card"><h2>Which journeys detect each fault?</h2><div class="table-wrap" tabindex="0"><table><caption>Actual injected PostgreSQL fault results</caption><thead><tr><th scope="col">Fault</th><th scope="col">Result</th><th scope="col">Detected by</th></tr></thead><tbody>${(journeyEvidence?.mutations ?? []).map((m) => `<tr><td>${esc(m.fault)}</td><td>${m.detected ? 'Detected' : 'Survived'}</td><td>${esc(m.detectedBy.join(', '))}</td></tr>`).join('')}</tbody></table></div></div><h2>Reproduce locally</h2><pre>npm run db:local:start
npm run verify:v4
npm run journeys:evaluate</pre><p class="note">No credentials, cloud deployment, model download or paid API access required. Existing live artifacts remain historical evidence, not results of this V4 run.</p></section>
<section class="panel" id="durable" hidden><div class="hero"><div><p class="overline">DURABILITY. OWNERSHIP. DEFECT DETECTION.</p><h1>Quality that survives a restart.</h1><p class="muted">Real PostgreSQL transactions, competing buyers, immutable order prices, cancellation/refund restocking and independently reviewed model-proposed cases.</p></div></div><div class="metrics"><div class="metric"><p class="overline">POSTGRESQL TESTS</p><div class="value good">${database ? database.stats.expected : '—'}</div><small>Failed: ${database?.stats.unexpected ?? '—'} · flaky: ${database?.stats.flaky ?? '—'}</small></div><div class="metric"><p class="overline">LIVE REVIEWED CASES</p><div class="value">${reviewed?.origin === 'live-model-generated' ? reviewed.controlPassed : 'Pending'}</div><small>Disabled by the zero-spend policy</small></div><div class="metric"><p class="overline">FIXTURE CONTROL REHEARSAL</p><div class="value">${fixtureEvaluation?.controlPassed ?? '—'}</div><small>Authored examples, not a live-model result</small></div><div class="metric"><p class="overline">FIXTURE FAULTS DETECTED</p><div class="value good">${fixtureEvaluation ? fixtureEvaluation.detected + '/' + fixtureEvaluation.totalMutants : '—'}</div><small>Executed against actual PostgreSQL applications</small></div></div><div class="grid"><div class="card"><h2>Transaction guarantees exercised</h2><p class="note">Row-locked shared inventory. Exactly-once checkout replay. Cross-customer ownership. Cart, order and stock rollback after late failure. Database-enforced constraints. Customer history across logout and application restart. Terminal cancellation/refund transitions that restore stock once.</p></div><div class="card"><h2>Generation trust boundary</h2><p class="note">Source and structured-case hashes bind approval to the exact artifact. The trusted interpreter issues fixed cart API operations. Generated JavaScript is never loaded or evaluated. Controls must pass before any seeded-fault detection is credited. Infrastructure errors invalidate evaluation.</p></div></div><h2>Reproduce V3</h2><pre>npm run db:local:start
npm run verify:v3
npm run demo:postgres
# http://127.0.0.1:4175</pre><p class="note">The database demo uses synthetic demo/buyer2 accounts and simulated refunds. PostgreSQL integration tests generate and clean up isolated eai_test_* schemas. The default V2 suite remains a separate fast memory-backed suite. Database results and fixture observations are not added to the main-suite counts.</p></section><section class="panel" id="architecture" hidden><div class="hero"><div><p class="overline">DESIGNED TO BE EXPLAINED</p><h1>A framework with boundaries.</h1><p class="muted">Separate business intent, browser interactions, API transport, test data, model proposals, and release evidence.</p></div></div><div class="architecture"><span>Requirements</span><b>→</b><span>Retrieval + AI tasks</span><b>→</b><span>Schema + semantic gates</span><b>→</b><span>Human review</span></div><div class="architecture"><span>Specs + fixtures</span><b>→</b><span>Pages + API clients</span><b>→</b><span>Isolated local app</span><b>→</b><span>Reports + evidence</span></div><div class="grid"><div class="card"><h2>What makes the test system reliable</h2><p class="note">Fresh session and cart per test. Integer money. No external demo dependency. API-based setup. Idempotent checkout. Web-first assertions. Real network-failure tests. Four browser/device targets. Flaky retries fail CI.</p></div><div class="card"><h2>What keeps AI accountable</h2><p class="note">Live/offline provenance. Requirement and evidence IDs. Bounded context and repair. Provider timeout. Token accounting. Secret redaction. No auto-healing or auto-execution. Impact selection cannot bypass the release suite.</p></div></div><h2>Reproduce the showcase</h2><pre>npm ci
npx playwright install --with-deps chromium firefox webkit
npm run verify
npm run showcase
# http://127.0.0.1:4174</pre><p class="note">This is a local portfolio reference implementation. The in-memory demo is not a production commerce service. Production adoption needs durable storage, real identity, organization controls, and environment-specific load and security testing.</p></section>
<div class="footer"><span>ERDAL KILIC / QUALITY ENGINEERING SHOWCASE</span><span>Playwright · TypeScript · OpenAI · Contract testing · Accessibility · CI</span></div></main></div><script>
const buttons = document.querySelectorAll('[data-tab]');
fetch('/api/ai/status').then(r=>r.json()).then(s=>{document.getElementById('studio-status').textContent=s.liveAvailable?'Live provider configured · '+s.model+' · permissions and credits are checked when a task runs.':'Zero-spend mode: authored offline examples ready. Live API access is disabled.'}).catch(()=>{document.getElementById('studio-status').textContent='Start npm run showcase to use the interactive Studio.'});
document.getElementById('studio-form').addEventListener('submit',async e=>{e.preventDefault();const button=e.target.querySelector('button');const feedback=document.getElementById('studio-feedback');const output=document.getElementById('studio-result');button.disabled=true;feedback.textContent='Running schema and semantic validation…';output.hidden=true;try{const response=await fetch('/api/ai/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({task:document.getElementById('studio-task').value,mode:document.getElementById('studio-mode').value,question:document.getElementById('studio-question').value})});const result=await response.json();if(!response.ok)throw new Error(result.error);feedback.textContent=result.notice;output.textContent=JSON.stringify(result,null,2);output.hidden=false}catch(error){feedback.textContent=error.message}finally{button.disabled=false}});

function select(id){if(!document.getElementById(id)?.classList.contains('panel'))id='overview';document.querySelectorAll('.panel').forEach(p=>p.hidden=p.id!==id);buttons.forEach(b=>{b.classList.toggle('active',b.dataset.tab===id);if(b.dataset.tab===id)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});}
buttons.forEach(b=>b.addEventListener('click',()=>{location.hash=b.dataset.tab}));window.addEventListener('hashchange',()=>select(location.hash.slice(1)));select(location.hash.slice(1)||'overview');
document.getElementById('filter').addEventListener('input',e=>{let visible=0;document.querySelectorAll('[data-test-row]').forEach(row=>{row.hidden=!row.textContent.toLowerCase().includes(e.target.value.toLowerCase());if(!row.hidden)visible++});document.getElementById('empty-filter').hidden=visible!==0});
</script></body></html>`;
await mkdir('showcase', { recursive: true });
await writeFile('showcase/index.html', html);
console.log('Built showcase/index.html from actual local artifacts.');
