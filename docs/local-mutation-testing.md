# Local inventory and pricing mutation testing

This campaign changes actual expressions in `src/db/store.ts`, one at a time, in a disposable working copy. The original application is never modified. Seven Playwright API/database scenarios run against real PostgreSQL with a fresh generated schema for each test. No browser installation or new dependency is required.

## Run

Use the existing Node 22+ installation and installed project dependencies. Start the disposable local PostgreSQL lab first:

```sh
# Set PG_BIN_DIR to your PostgreSQL bin directory if it is not on PATH.
npm run db:local:start
npm run test:mutation
# Replay one mutation, always after the healthy control:
npm run test:mutation -- --mutant=inventory-skip-restock
```

Open `artifacts/mutation/report.html` for an offline evidence viewer, or read `report.md` / `report.json`. The HTML report embeds no external assets or scripts and shows the actual assertion messages beside each source change. Per-run Playwright JSON and logs contain assertion names, expected values and observed values. Reports are ignored by Git. Temporary source copies are removed in a finally block; an interrupted/killed process may leave an ignored `artifacts/mutation/work-*` directory. Tests use disposable `eai_test_*` schemas and clean them up on ordinary completion.

The command refuses CI execution unless `ALLOW_OFFLINE_CI_MUTATIONS=1` explicitly authorizes the dedicated offline runner. It forces the project's loopback demo database, uses loopback HTTP servers, and does not load `.env` files, call models, upload to external services, or deploy. The authorized workflow can retain generated evidence as GitHub Actions artifacts; no model or AWS operations occur. It neither starts nor stops a database automatically; stop a lab you started with `npm run db:local:stop`.

## What is checked

- Pricing: multiple products and quantities, integer-cent totals in cart/order/database, persisted unit-price snapshots, and fractional-dollar prices that expose accidental dollar rounding.
- Inventory: accepting the exact stock boundary, rejecting cumulative overselling without changing the cart, decrementing every purchased product line, idempotent checkout replay without a second deduction, and restoring stock exactly once across repeated cancellations and simulated refunds.
- Twelve targeted source mutations: ignored quantities, addition instead of multiplication, rounded dollar prices, omitted cart lines, one-cent surcharge, inflated stored unit price, strict stock boundary, ignored existing cart quantity, missing/incorrect decrements, and missing/incorrect restocks.

This supplements the older dependency-injected pricing faults and journey fault demonstrations. It is a deliberately bounded source mutation campaign, not an exhaustive Stryker-style operator sweep or a general test-coverage percentage.

## Honest outcomes

A healthy seven-test control must pass before any mutations run. A mutant is **killed** only by a labeled business assertion failure; infrastructure errors, unexpected HTTP responses, timeouts, skipped tests, missing reports, and setup failures receive **error**, never kill credit. A mutant with all seven tests passing **survives**. Surviving mutations and errors make the command exit nonzero and must be investigated; expectations must not be weakened to improve a score. Mutation anchors must occur exactly once, so source changes fail closed instead of silently applying no mutation.

The report includes a SHA-256 of the unmodified source and the exact replacements. A complete 12/12 result means these twelve deliberate defects were detected. It does not prove that the application is defect-free, cover every stock race, or benchmark live AI quality.

The outcome classifier has dedicated checks for survivors, assertion kills, timeouts, skipped or missing/duplicate/substituted scenarios, database failures, teardown failures, unlabelled assertions and process crashes. Every mutant must execute the same scenario titles as the healthy baseline. Old summary reports are removed before a new attempt so a failed rerun cannot leave a stale success appearing current.

## Showcase and assertion demonstration

Every campaign also runs two teaching checks against a healthy control, then against a source copy with stock deduction removed. The weak check asserts only HTTP 201; it passes despite the stock defect. The strong check asserts HTTP 201 and persisted stock 6; it fails when the observed stock is 8. This comparison is recorded separately from the twelve-mutation total. The weak check is intentionally incomplete and is never presented as a release gate.

Build the report with `npm run showcase:build` and serve it using `npm run showcase`. Open `http://127.0.0.1:4174/#mutations`. The snapshot shows baseline, detections, survivors and execution errors, plus expandable source changes and failure evidence. It validates the report structure and application source hash before displaying results. It does not run mutations from the browser.

The README screenshot and `docs/media/mutation-walkthrough.webm` are a silent recording of actual local evidence. English captions are included in `mutation-walkthrough.vtt`. These are historical media snapshots, not a claim about later source changes. With the local showcase running, `npm run showcase:record-mutation` captures a new walkthrough and screenshot; rebuild afterward to expose the video player. No new dependencies or paid services are required.

## Follow a survivor through an assertion improvement

The campaign additionally runs the intentionally incomplete status-only variant by itself: healthy control first, then the stock-deduction source mutation. All enabled assertions pass, so this mutation is classified as **survived**. Next it runs the stronger variant by itself: healthy control first, then exactly the same mutated source. The new persisted-stock assertion fails with expected 6 / received 8, so the mutation is classified as **killed**. The source SHA-256 must match across both mutated runs; an unexpected outcome stops evidence generation.

This is an authored teaching example of strengthening an assertion. It is not a claim that an unknown defect was discovered, and it does not weaken the complete inventory/pricing campaign. Its before/after outcomes are separate from the full twelve-mutation totals. JSON evidence preserves both controls, both mutant reports, the added assertion and matching mutant hashes. The showcase exposes the actual rerun failure and those hashes.

Readable business names are shared by the showcase and standalone reports. Technical mutation IDs remain available in expanded details and for CLI replay. Inventory and pricing totals are computed from the actual categorized results, with separate detected, survived and execution-error counts.
