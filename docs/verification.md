# Local verification — November 6, 2026

| Check                                       | Observed result                              |
| ------------------------------------------- | -------------------------------------------- |
| TypeScript, ESLint, Prettier                | Passed                                       |
| Commerce API and security                   | 32 passed                                    |
| AI framework/provider/guardrail regression  | 26 passed                                    |
| Chromium browser journeys and accessibility | 16 passed                                    |
| Firefox browser journeys and accessibility  | 16 passed                                    |
| WebKit browser journeys and accessibility   | 16 passed                                    |
| Pixel 7 Chromium emulation                  | 16 passed                                    |
| Dashboard and interactive AI Studio         | 5 passed                                     |
| macOS visual baseline comparison            | 1 passed after visual inspection             |
| Dependency advisory audit                   | 0 known vulnerabilities at verification time |

The main suite has **122 executions** across six projects, with zero failures, skipped cases or flaky outcomes. Dashboard checks and the visual comparison are separate: **128 passing executions across these runs**, not 128 unique business scenarios. The full main run took approximately 17 seconds on this machine; timing is not a performance guarantee.

Evidence is available in `artifacts/quality.json`, `artifacts/showcase-tests.json`, `artifacts/visual-results.json`, `test-results/results.json` and the HTML report. Screenshots in `docs/images/` were captured from the running implementation, not design mockups.

The five AI demo artifacts passed the validation pipeline using explicitly authored offline examples. The live OpenAI adapter was contract-tested using a mocked SDK. No real model completion, hosted GitHub Actions build, Docker execution, Linux visual baseline or production deployment is claimed by this local record. Those environments require their own verification.

Earlier public-demo specs and clients are retained for reference. The active configuration explicitly excludes the three old specs (`login.spec.ts`, `cart.spec.ts`, `posts.spec.ts`) in the original checkout and selects the new commerce suites. The copied `.legacy.ts` files are also outside the `.spec.ts` selection.
