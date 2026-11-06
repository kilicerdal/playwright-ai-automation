# V4: local journey intelligence

## What changed

Eight committed, authored multi-step plans exercise cancellation, refund, cross-customer ownership, checkout replay, logout, CSRF, session cart isolation, and unavailable stock. A strict Zod schema accepts only known actors, products, and operations. It rejects code, URLs, extra fields, unknown actors, and oversized plans. An independent pure reference model derives expected statuses, totals, counts, lifecycle state, stock, and order identity without importing application code. The trusted interpreter maps these plans to fixed loopback HTTP routes.

Each run uses its own random PostgreSQL schema, with migrations, synthetic users, and cleanup. Traces contain safe step outcomes and content hashes; they omit credentials, cookies, tokens, connection strings, and shipping data. The run stops at the first divergence. Server errors invalidate the evaluation and never count as a detected fault.

## Defect evidence

All controls must pass before mutation evaluation proceeds. Nine test-only injected faults alter actual isolated application/store behavior: cross-customer order reads, cross-customer transitions, missing stock restoration, double stock restoration, duplicate checkout on replay, retained checkout carts, cart leakage, history leakage, and reopening finalized orders. These are curated faults, not a claim of exhaustive mutation coverage. No query parameter or production endpoint enables a fault.

Evidence is written to ignored artifacts/v4-journeys.json. The dashboard's V4 journey intelligence panel shows requirement → journey hash → expected versus observed steps, plus the fault-to-detecting-journey matrix. Test executions and nested mutation observations are reported separately.

## Reproduce locally

```bash
npm ci
# Install Playwright browsers if not already present.
npm run db:local:start
npm run verify:v4
# Optional standalone evaluation without rerunning every suite:
npm run journeys:evaluate
npm run showcase:build
npm run showcase
```

Open http://127.0.0.1:4174/#journeys. PostgreSQL binaries and Playwright browsers are local prerequisites. This release requires no new packages beyond V3.

## Zero-spend boundary

Live generation CLI entry points reject --live. The default OpenAI provider fails before constructing a network client; injected SDK test doubles remain available for local contract tests. The Studio rejects live requests with 403 regardless of saved credentials. The credential-check command makes no network request. Existing ignored .env contents are preserved.

All hosted workflow entry jobs are disabled and automatic push/PR triggers are removed. AWS upload and live AI workflows are disabled even if old secrets or repository variables exist. Re-enabling them requires deliberate source changes and fresh user authorization. No hosted V4 CI result is claimed. The archived workflow definitions retain browser installation timeouts for possible future reuse.

This is a project execution policy, not an operating-system network sandbox or a guarantee about unrelated software or account activity. No AWS deployment, paid model call, model download, hosted workflow, or billing change is part of V4.

## AI provenance

V4 plans are authored offline examples. They are neither live model output nor approved generated code. No human approval is fabricated. The V3 hash-bound review queue remains available for historical candidate review, while live APIs stay blocked. Future generated journeys would need a separate explicit provenance and approval path before execution; V4 does not silently accept or promote them.
