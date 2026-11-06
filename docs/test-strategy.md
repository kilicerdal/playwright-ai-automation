# Test strategy

## Risk priorities

P0 covers sign-in, session boundaries, cart totals, order creation and idempotency. P1 covers invalid input, stock boundaries, CSRF, session rotation, ownership checks, network failures and lost responses. P2 includes browser/device usability, keyboard navigation, automated accessibility and visual comparison.

| Layer         | Scope                                                                                                     | Isolation                                       |
| ------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| API/security  | Contracts, exact totals, invalid quantities, stock, shipping, idempotency/concurrency, CSRF and ownership | Per-test request context/session                |
| AI framework  | Provider contract, refusal, repair bounds, retrieval, redaction, hallucinated IDs, bypass attempts        | In-process authored examples and mocked SDK     |
| UI/E2E        | Search, cart persistence/removal, sign-in/out, complete checkout and invalid checkout                     | Fresh context and API session                   |
| Resilience    | HTTP 503 and lost-response retries with one persisted order                                               | Test-scoped network interception                |
| Accessibility | Sign-in, collection, confirmation, keyboard-only sign-in                                                  | axe WCAG-tagged rules plus explicit interaction |
| Visual        | Full collection page                                                                                      | Platform-specific reviewed screenshot           |
| Showcase      | Navigation, search, AI Studio, input/origin checks, desktop/mobile accessibility                          | Separate local server and report configuration  |

Axe scans cover selected automated rules and states; they do not certify conformance. Pixel 7 is browser emulation, not a physical-device test. WebKit is the Playwright engine, not a claim of every installed Safari version. Network interception is controlled fault injection, not a chaos test of distributed infrastructure.

## Visual baselines

```bash
npm run test:visual:update
# Inspect tests/visual/baselines/<platform>/visual/atlas-collection.png
npm run test:visual
```

Review every baseline before committing. Baselines are separated by platform; a macOS baseline is not valid evidence of Linux visual stability. The default release command excludes visual comparisons until the target platform's baseline has been approved. CI runs semantic browser checks across all engines. To add a visual CI gate, generate and review a Linux baseline in the pinned container, commit it, then add `npm run test:visual` to the workflow.

## Retry and evidence policy

Local retries are zero. CI allows one diagnostic retry and fails on flaky outcomes. Retries do not turn an intermittent failure into a clean release. Failure traces, screenshots and video support investigation; JUnit integrates with external test systems, JSON supports machine analysis, and the HTML report provides action-level review.

The custom reporter stores final per-test outcomes rather than counting attempts as separate cases. Partial runs replace the local quality snapshot; run `npm test` before building the final showcase. Requirement mappings indicate tagged execution, not exhaustive coverage or percent code coverage.
