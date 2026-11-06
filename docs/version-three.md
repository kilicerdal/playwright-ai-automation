# Version three

V3 extends the deterministic showcase with real PostgreSQL storage and an explicit reviewed-case evaluation path.

## Run locally

Install dependencies and Playwright browsers as described in the README. Install PostgreSQL 17 locally, then run:

```bash
npm run db:local:start
npm run verify:v3
npm run demo:postgres
# In another terminal:
npm run showcase
```

The durable app uses http://127.0.0.1:4175 and the evidence dashboard uses http://127.0.0.1:4174. Synthetic customers `demo` and `buyer2` use password `demo-pass`. The isolated local database uses public lab credentials, binds to loopback port 55432, and stores its data under ignored artifacts/postgres-local. Stop it with `npm run db:local:stop`. Docker Compose is also provided in infra/local/compose.yml; container execution has not been verified locally.

## Guarantees covered by integration tests

Forty tests exercise migration integrity, restart persistence, shared inventory races across application instances, atomic checkout rollback, customer-scoped idempotency, owner isolation, CSRF, cancellation/refund restocking exactly once, database outage errors, OpenAPI response validation, and browser order journeys. Carts do not reserve stock. Refunds are simulated state transitions without payment processing.

The frozen contract hash is a conservative review gate for any contract change, rather than a semantic compatibility analyzer. Failure reproduction bundles contain safe inventory/count state, migration identity, and a replay command; they exclude credentials, cookies, and shipping data.

## AI review and evaluation

Generated source remains quarantined and is never executed. Inspect the candidate bundle, provenance, code, and validation results with `npm run ai:review`. Only after human review, record approval using the CLI's `--approve`, `--reviewer`, and `--hash` options. Approval binds both source and case bundle hashes. The trusted evaluator interprets validated case data through fixed HTTP operations against isolated PostgreSQL schemas.

`npm run ai:evaluate-approved` requires that approval. It first verifies controls, then measures ten injected pricing faults. Setup errors and server failures invalidate the run instead of counting as detections. The automated rehearsal uses an explicitly labeled authored fixture and a fixture-only review marker; it is neither live AI evidence nor a human approval. This is a local human-attestation mechanism, not an identity-verification system.

## CI and remaining boundaries

GitHub Actions includes a PostgreSQL service job and evidence artifacts. A separate manual workflow evaluates reviewed candidates from a successful live-generation run at the same commit. Hosted V3 workflows require a subsequent push/run before their results can be claimed.

Live generation remains pending API credits at the user's request. Optional AWS archiving stays disabled; formal CloudFormation validation remains pending. No AWS resources or payment integrations were deployed.
