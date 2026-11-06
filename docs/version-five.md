# V5: the guided showcase

## Launch

With Node.js 22+, npm dependencies, PostgreSQL binaries and the existing Playwright browsers installed:

```bash
npm run showcase:launch
```

Open http://127.0.0.1:4174/#showtime. The commerce app is at http://127.0.0.1:4175. The launcher checks both ports, reuses compatible services, checks or starts the disposable local PostgreSQL lab, builds the dashboard, and starts missing application/dashboard processes. It rejects occupied incompatible ports rather than killing their owners. It forces the local lab connection and schema for processes it creates; it does not use a remote DATABASE_URL from .env.

Ctrl+C stops processes started by this launcher. Existing compatible processes and an existing database are left running. A database started by the launcher is stopped on shutdown. `npm run showcase:launch -- --check` checks startup readiness and cleans up owned processes immediately. No package installation, cloud operation, model download, paid API, or hosted workflow is part of launch.

The dashboard builds from existing artifacts and shows their snapshot timestamps. Launch does not invent or rerun test evidence. For fresh release evidence:

```bash
npm run db:local:start
npm run verify:v5
```

## Five-minute presentation

The V5 showcase has five manually paced stages: honest scope/provenance, durable business behavior, a healthy journey, a controlled defect, and reproducible evidence. Previous and Next move the guide; evidence links open the relevant dashboard panel. Presentation mode hides navigation and layout chrome. Escape exits it. This is a layout mode, not a browser fullscreen request.

## Interactive execution

Choose one of the eight committed authored journeys. Run a healthy control, or select missing stock restoration, cross-customer order reading, or duplicate checkout replay. Step entries arrive from actual HTTP observations streamed as newline-delimited JSON. There are no artificial progress timers or fabricated passes.

For a fault demonstration, every healthy control step must pass first. The faulty application then runs in a different disposable PostgreSQL schema. Execution stops at the first divergence. The result distinguishes control-passed, fault-detected, and fault-survived. A selected journey may legitimately miss a selected fault. Server failures invalidate the run and receive no detection credit. The download is enabled only after a final result; a broken stream hides old results and disables export.

Faults are available only through this local demonstration runner, which creates isolated stores. The ordinary commerce application exposes no fault switch and is not mutated by these runs. The server accepts only allowlisted journey IDs and curated fault names. Same-origin JSON is required; the body is bounded. Only one demonstration runs at a time. Arbitrary plans, code, SQL, endpoints, or database URLs cannot be supplied over HTTP.

## Evidence and replay

Download run evidence to obtain a run ID, timestamp, authored provenance, journey hash, model-call count, reference expectations, actual observations, the first divergence, and a replay command. Credentials, session cookies, shipping data, and database connection strings are excluded. Values in the UI are inserted as text.

For example:

```bash
npm run showcase:replay -- --journey=J-CANCEL --fault=missing-restock
```

The CLI writes ignored artifacts/v5-replay.json. A surviving fault exits nonzero. This is an API execution record, not a browser trace or AI root-cause analysis. Browser traces for failed automated UI checks remain available through Playwright's normal retained-failure artifacts.

## Boundaries

V5 keeps the V4 zero-spend policy. Live APIs and all five project hosted workflows remain disabled. All journey plans are authored offline examples. No human approval or live model provenance is fabricated. The showcase is a local portfolio reference, not production identity, payment processing, or an exhaustive assurance of security or accessibility.
