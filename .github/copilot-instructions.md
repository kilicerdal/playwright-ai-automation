# Copilot project instructions

## Project context

- Read `AGENTS.md` and the current policy in `README.md` before making changes. Older version documents may describe historical deployment or live API capabilities.
- This is a local Playwright and strict TypeScript quality engineering showcase with PostgreSQL commerce, inventory/pricing mutation tests, and guarded AI workflow examples. Use Node.js 22+ and the existing npm scripts.
- Inspect the relevant implementation, fixtures, and tests before proposing an edit. State assumptions and keep changes focused on the requested behavior.

## Local execution and zero spending

- Keep hosted GitHub Actions disabled at the repository level and preserve the disabled project workflows. Do not enable triggers or cloud agents that execute on hosted infrastructure.
- Keep all execution local with a $0 spending limit. Do not deploy infrastructure, upload artifacts to AWS, call live model APIs, buy credits, upgrade plans, or enable paid services.
- Use authored offline AI examples and mocked provider contracts. Do not run `ai:live`, `ai:candidates:live`, or other live-provider paths. Stop at included Copilot usage limits; do not purchase additional usage.
- Use the existing loopback PostgreSQL lab and isolated test schemas. Do not connect tests to production or shared databases. Stop only local services started for the task.
- These instructions guide Copilot; they do not enforce billing or repository settings. Do not claim those settings were verified without checking them.

## Code and test conventions

- Specs own assertions; page objects and API clients own interactions. Reuse existing fixtures and clients, and keep tests independent and deterministic.
- Use accessible locators and Playwright web-first assertions. Avoid fixed sleeps, brittle selectors, and retries that conceal defects.
- Assert independent business expectations, including totals, original order prices, inventory changes, ownership, and idempotency where relevant. Do not weaken assertions or change expected values merely to make a failing test pass.
- PostgreSQL tests belong in `tests/postgres` and use its isolated fixtures. Put additional inventory/pricing regression scenarios in separate specs when they are outside the curated mutation campaign: its runner expects seven scenarios in `inventory-pricing.spec.ts`.
- Keep generated AI drafts outside Playwright test directories. Never automatically execute generated drafts or apply model-proposed application changes. Review every proposed edit and inspect visual baseline changes on the target platform.
- Do not commit secrets, local database files, generated sessions, or test/report artifacts. Preserve honest AI provenance and distinguish authored examples, controlled faults, and observed execution results.

## Local validation

- Run `npm run quality` before completing changes, plus the suites relevant to changed behavior. For instructions-only changes, quality checks and diff review are sufficient; no application behavior changes are expected.
- For PostgreSQL behavior, run `npm run db:local:start`, then `npm run test:postgres`. PostgreSQL binaries must be on PATH or supplied through `PG_BIN_DIR`. Use `npm run db:local:stop` afterward if the task started the lab.
- For mutation-runner changes, also run `npm run test:mutation` against the local lab. Distinguish detected mutations, survivors, and execution errors; infrastructure failures are not defect detections.
- Run `npm run verify` for a release after starting the local database. Visual checks use `npm run test:visual`; do not regenerate baselines without human inspection.
- Report exactly what ran, what passed or failed, and what remains unverified. Do not claim live-model, hosted-CI, container, or accessibility certification evidence from local tests.

## Review and Git workflow

- Show the changed files, purpose, and validation results for review. Keep edits local until the user explicitly authorizes a push; do not interpret approval of an earlier push as approval for a new change.
- Do not commit, push, merge, publish releases, or enable hosted execution unless the user requests that action. Prefer a `codex/` branch when a new branch is needed, and preserve unrelated user changes.
