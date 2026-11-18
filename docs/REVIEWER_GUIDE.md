# Reviewer journey

## What this demonstrates

A local Playwright/TypeScript commerce lab demonstrates independent business assertions, PostgreSQL transactions and controlled faults. AI workflow examples are authored offline fixtures. The normal path makes no live model calls or AWS uploads.

## Start

Install Node 22+, npm and PostgreSQL tools (`initdb`, `pg_ctl`, `psql`) on PATH or set `PG_BIN_DIR`. Then:

```sh
npm ci
npx playwright install chromium firefox webkit
npm run doctor
npm run showcase:launch
```

`doctor` only inspects prerequisites; it does not install, start, stop or alter services. It expects the lab ports to be free, so run it before launch. Launcher compatibility checks still decide whether existing services can be reused.

## Run the healthy control, then the defect

1. Open http://127.0.0.1:4174/#showtime.
2. Run `J-CANCEL` in **Healthy control** mode.
3. Run **Simulated fault: missing stock restoration**.
4. Inspect expected stock **20**, observed **18**, then export the safe JSON and replay it:

```sh
npm run showcase:replay -- --journey=J-CANCEL --fault=missing-restock
```

The fault uses a separate disposable schema. Failed startup does not count as defect detection. Ctrl+C stops only launcher-owned resources.

## Challenge the assertions

After stopping the launcher, start the disposable database and reproduce the full evidence:

```sh
npm run db:local:start
npm run verify
npm run db:local:stop
```

Inspect the generated mutation report and **Mutation testing** showcase tab. A status-only assertion misses removed inventory deduction; a stock assertion detects the same source mutation after its healthy control passes. [Mutation methodology](local-mutation-testing.md).

The complete suite covers four browser/device targets; visual baselines are separately platform-specific. [Evidence provenance](EVIDENCE.md) · [Maintenance](MAINTENANCE.md) · [Architecture](architecture.md). These bounded seeds do not establish exhaustive coverage, production identity or accessibility certification.

[How this project complements the portfolio](https://github.com/kilicerdal/eai-engineering/blob/main/docs/PROJECTS.md).
