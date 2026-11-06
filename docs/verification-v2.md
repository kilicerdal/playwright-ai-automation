# Local verification — version two, November 6, 2026

The expanded main suite passed **232 executions** representing **154 distinct scenarios** across API/security/concurrency, AI framework and four browser/device projects. Five separate Studio scenarios and one visual scenario bring the active inventory to **160 distinct tests** and **238 executions** across release checks. Generated candidates are never included in these totals.

| Area                                               | Main executions |
| -------------------------------------------------- | --------------: |
| API/security/concurrency                           |              77 |
| AI guardrails, compiler, oracle and seeded defects |              51 |
| Chromium                                           |              26 |
| Firefox                                            |              26 |
| WebKit                                             |              26 |
| Pixel 7 Chromium emulation                         |              26 |

Ten curated pricing defects were detected by independent authored assertions against injected faulty HTTP applications. This is not an exhaustive mutation score or evidence that pending model drafts have run.

Current machine-readable evidence is in `artifacts/quality.json`, `artifacts/ai-evaluation.json`, `artifacts/showcase-tests.json` and `artifacts/visual-results.json`. These are generated, ignored artifacts. The live generation record will identify its model, API response ID, usage, validation and review status when a successful call is made. Offline examples must not be described as live results.

AWS project-invariant checks passed; formal CloudFormation schema/compliance validation was left pending at the user's request. No AWS resources were deployed. Version-two sharding is configured but hosted execution must be verified separately. Docker execution and a Linux visual baseline have not been verified here.

## Live generation status

API-key authentication and model-list access were verified, and GPT-6 Luna was configured locally. The first real generation request returned HTTP 429 because the API account had no credits remaining. No live-generated candidate result or live execution is claimed. The user explicitly deferred further live generation and billing setup. The key remains in the ignored local `.env`; it is not part of this release.

The three-report CI merge flow was rehearsed locally: 51 AI checks plus functional shards of 91 and 90 executions merged into a complete passing 232-execution report. Hosted version-two CI results must be assessed separately.
