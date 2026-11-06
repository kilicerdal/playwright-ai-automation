# V5 verification record

The V5 release was verified locally on macOS on November 6, 2026. `npm run verify:v5` and the separate visual suite passed **301 test executions** across **223 distinct test scenarios**.

| Area                                                         | Executions | Distinct scenarios |
| ------------------------------------------------------------ | ---------: | -----------------: |
| Main API/security, framework and four browser/device targets |        238 |                160 |
| PostgreSQL integration and journey evaluation                |         51 |                 51 |
| Showcase UI, streaming, safe export and request guards       |         11 |                 11 |
| Visual regression                                            |          1 |                  1 |
| Total                                                        |        301 |                223 |

The main suite comprises 77 API/security checks, 57 framework checks and 26 browser scenarios repeated on Chromium, Firefox, WebKit and Pixel 7 Chromium emulation. Authored journey controls and nested mutation observations are not additional active tests. Eight authored multi-step controls detected all nine curated lifecycle faults. The earlier pricing rehearsal detected ten curated pricing faults. These are bounded fault sets, not exhaustive mutation coverage or live-model quality benchmarks.

The V5 checks cover real streamed observations, expected-versus-observed divergence, evidence download, unknown or malformed input, cross-origin requests, a fault that legitimately survives a selected journey, mobile layout, selected axe rules, keyboard presentation controls, and rejection of incomplete execution streams. Selected automated accessibility checks are not certification.

The one-command launcher was smoke-tested with both reused services and cold startup. It started the local lab, commerce app and dashboard, then cleaned up resources it owned. An existing compatible process was left running in the reuse check. The replay CLI reproduced the missing-restock divergence.

Live model APIs, AWS uploads and all five project GitHub workflows remain disabled. No hosted V5 CI run is claimed. Historical V3 hosted success is separate from this local V5 verification. No cloud deployment or payment transaction was performed. Docker execution has not been verified here.

Current ignored evidence lives in artifacts/quality.json, artifacts/postgres-results.json, artifacts/showcase-tests.json, artifacts/visual-results.json, artifacts/v4-journeys.json, and artifacts/v5-replay.json. Launching the dashboard alone does not refresh these reports; their timestamps identify the captured snapshot.

The short demo video is a recording of actual local browser execution with deliberate pauses for reading. Its capture metadata and chapters are stored alongside the ignored recording. It does not claim live model activity. The source recording command checks the actual healthy and faulty outcomes before saving the final asset.

For historical version-two measurements and the deferred live-generation attempt, see [the V2 record](verification-v2.md). The current zero-spend policy supersedes older instructions to activate live APIs or deploy resources.
