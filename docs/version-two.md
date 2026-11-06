# Version two: evidence-driven test generation

## Expansion

The baseline contained 80 distinct active tests. Version two adds 80 distinct engineering-authored/AI-assisted scenarios:

| Area                           | Added | Examples                                                                                                       |
| ------------------------------ | ----: | -------------------------------------------------------------------------------------------------------------- |
| API boundaries                 |    20 | Strict payload types, shipping lengths/Unicode, idempotency-key boundaries                                     |
| Authentication/security        |    15 | Cross-session token misuse, exact session expiry, rotation, prototype-shaped data                              |
| Concurrency/recovery           |    10 | Concurrent stock boundaries, conflicting checkout keys, immutable order history                                |
| AI quality/evaluation          |    25 | Independent expectation oracle, compiler checks, draft quality, approval integrity, ten seeded pricing defects |
| Browser behavior/accessibility |    10 | Combined filters, native validation, focus transfer, cart lifecycle                                            |

The resulting inventory is **160 distinct active tests**. Four browser/device targets repeat 26 browser scenarios, giving 232 main-suite executions, plus five Studio checks and one visual comparison: 238 executions across the release checks. Counts of generated candidates are separate and never inflate active test counts.

## Six AI workflows

The existing planning, drafting, triage, locator and impact tasks are joined by **structured case generation**. `npm run ai:candidates:live` makes a real model call; `npm run ai:candidates` uses explicitly authored offline examples. Live provider errors never silently fall back to examples.

The model proposes payloads and expected outcomes. A separate oracle checks those outcomes against the fresh-cart contract, including exact money, invalid types and stock rules. A trusted renderer then produces Playwright source with explicit assertions. The source is checked statically and typechecked as a virtual file—no code is executed during those checks.

`artifacts/candidates/manifest.json` records origin, model, response ID when supplied by the live provider, token usage, input hash, code hash, validation results and `pending-human-review`. The dashboard's **Generated test review** section shows the candidates and their provenance.

## Review boundary

No raw model code is automatically executed or copied into active tests. Inspect `artifacts/candidates/cart-generated.spec.ts.txt`, verify each case against its requirement and oracle, then make an explicit reviewed promotion. The approval helper rejects pending review and any code whose hash changed after approval. The repository does not fabricate a human reviewer or promote an offline example as a live-model result.

Candidate validation is scoped to fresh-session cart behavior. It is not a general oracle for all commerce features. Static checks are review aids, not a sandbox or proof of arbitrary-code safety.

## Defect-detection evidence

Ten tests exercise the actual HTTP application with injected faulty pricing dependencies. Each control application must produce exactly 23200 cents for two daypacks and three notebooks; the same assertion must detect its paired faulty implementation. The defect set includes dropped lines, ignored quantities, unit mistakes, double charges, rounding and unrequested tax.

These are engineering-authored oracle tests. They demonstrate that the assertion detects the curated application faults; they do not claim that the pending generated drafts have been executed, or that an exhaustive mutation campaign was performed.

## CI

GitHub Actions runs static checks and dependency auditing, a separate AI/compiler/oracle evaluation job, and two functional/browser shards. Blob reports from all three test jobs are required before merging a complete report. Missing jobs cannot be counted as successful execution. The evidence job produces the candidate review queue, evaluation summary, dashboard and Studio checks. Live generation remains a manually dispatched workflow with credentials supplied through a protected environment.

Optional AWS archiving is manual, disabled and isolated from default CI. See [AWS integration](aws-integration.md).
