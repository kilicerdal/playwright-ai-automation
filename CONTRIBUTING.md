# Contributing

Use Node.js 22+ and a focused branch. Install the locked dependencies with `npm ci`. Follow [the README](README.md) and [mutation guide](docs/local-mutation-testing.md) for the disposable loopback PostgreSQL lab.

```sh
npm run quality
npm run db:local:start
npm run verify
npm run db:local:stop
```

Stop only a lab you started. Install the matching Playwright browsers when needed. Keep tests deterministic, TypeScript strict, fixtures isolated, locators accessible, and assertions web-first. Specs own assertions; clients and pages own interactions. Add meaningful regression coverage for a behavior change and do not weaken business expectations to hide failures.

Model examples are authored offline fixtures unless separately documented. Keep drafts outside testDir; do not auto-execute or apply model changes. Current live-model execution and hosted project workflows are disabled. An update PR does not authorize enabling cloud resources, paid APIs, uploads or deployments.

Preserve historical verification records, source hashes and honest AI provenance. Do not commit credentials, generated session artifacts, local databases or raw sensitive reports. Visual baselines require human inspection on the target platform.

In a PR, explain the problem, resulting behavior, checks run and remaining limits. Documentation-only work needs link/command checks, not a claim of fresh suite execution. [Dependency maintenance](docs/DEPENDENCY_MAINTENANCE.md) · [Security reporting](SECURITY.md).

Original project code is MIT licensed; preserve dependency and third-party attribution.
