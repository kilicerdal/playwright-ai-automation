# Evidence provenance

Documentation review: **2026-11-17**. This date records a documentation/source review, not a rerun of every example.

## Read the labels

- **Current CI** means the workflow outcome for the specific commit shown in Actions. A moving badge is not an immutable release record.
- **Recorded local** means a saved execution under its original environment and date; a screenshot never reruns itself.
- **Historical release** means evidence for an older version. Its count and dependency versions must not be rewritten to resemble current CI.
- **Authored / deterministic** means an intentionally specified scenario or fixture. It is not a newly generated model output.
- **Recorded model experiment** means calls made under the saved protocol; it does not prove live provider availability or general accuracy.

[Current Actions runs](https://github.com/kilicerdal/playwright-ai-automation/actions?query=branch%3Amain) · [Reviewer journey](REVIEWER_GUIDE.md) · [Supported setup](MAINTENANCE.md).

## Recorded evidence inventory

| Item                                          | Label and scope                                                                                                                                                              | Inspect                                                                                                                                                        |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V5 showcase video/screenshots                 | Historical local v5.0.0 recording; authored journey control/fault and evidence export, not current hosted CI                                                                 | [V5 release](https://github.com/kilicerdal/playwright-ai-automation/releases/tag/v5.0.0)                                                                       |
| Mutation walkthrough and recovery screenshots | Recorded local November 17, 2026 mutation release; 322 executions at `e628893da5802213b4188bfcb8ddffa0ae86786b`, 12 targeted mutations; nested runs excluded from test total | [Mutation release](https://github.com/kilicerdal/playwright-ai-automation/releases/tag/mutation-showcase-2026-11-17), [methodology](local-mutation-testing.md) |
| Offline CI                                    | Current per-commit execution with synthetic PostgreSQL; no live AI or AWS                                                                                                    | [Offline workflow](../.github/workflows/offline-ci.yml)                                                                                                        |

Generated mutation JSON records `executionMode` and source hashes. The showcase rejects missing, invalid or source-stale evidence instead of displaying success counts. New tests may change current CI totals without changing the historical 322-execution release. A surviving mutation and infrastructure failure are distinct outcomes. The twelve seeds are not exhaustive defect coverage.

## Immutable documentation snapshot

[Files as reviewed at `e41f8f5b3712`](https://github.com/kilicerdal/playwright-ai-automation/tree/e41f8f5b371224abcd7c9ab28f8dd191402c5416). This identifies the containing source snapshot, not an inferred capture commit. Historical artifacts are preserved unchanged.
