# Compatibility, verification and dependency policy

## Supported setup

Node.js 22 or 24; hosted validation uses Node 22. PostgreSQL 17 on loopback port 55432. Chromium, Firefox and WebKit are installed from the locked Playwright package.

From a fresh checkout at the repository root, after installing those prerequisites:

```sh
npm ci && npx playwright install chromium firefox webkit
```

For PostgreSQL tooling in Playwright on macOS, set `PG_BIN_DIR` to the installed PostgreSQL bin directory if its executables are not on PATH. Python examples use POSIX virtual-environment paths; Windows uses `.venv\Scripts\python.exe`.

## Quick check and complete validation

Quick, bounded check:

```sh
npm run test:smoke
```

Complete deterministic checks:

```sh
npm run db:local:start
npm run verify
npm run db:local:stop
```

[Architecture](../docs/architecture.md) · [Evidence and reproduction](../docs/verification.md). Authored offline AI examples are not live-model benchmarks. Twelve seeded mutations are a bounded campaign, not exhaustive coverage. Visual baselines remain separately reviewed on their target platform.

Commands resolve pinned requirements/lockfiles where supplied. A runtime major or supported Python floor is a deliberate compatibility decision, not an automatic dependency update. Container major/patch tags can receive upstream updates unless an exact version is stated; this is not a bit-for-bit image reproducibility claim.

## Update decisions

Review recorded: **2026-11-17**. This is a policy review date, not a claim that every optional live integration was rerun that day. Current hosted execution appears in Actions; historical counts retain their dates and source identifiers.

| Update                                                                                    | Decision                              | Reason                                                                                                                                              |
| ----------------------------------------------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| [@types/node 26, PR #5](https://github.com/kilicerdal/playwright-ai-automation/pull/5)    | Declined under current runtime policy | Node 26 APIs must not enter a Node 22-compatible codebase through typings. Dependabot keeps this package on the Node 22 type line.                  |
| [Playwright 1.65.1, PR #2](https://github.com/kilicerdal/playwright-ai-automation/pull/2) | Deferred, regression recorded         | Firefox reproducibly crashed during the confirmation-page axe scan. Keep 1.64.1 until a candidate passes the complete suite on supported platforms. |
| [dotenv 18, PR #1](https://github.com/kilicerdal/playwright-ai-automation/pull/1)         | Deferred migration                    | No failure is claimed for this version. Its major-version behavior needs a deliberate migration review and complete validation before adoption.     |

Dependabot checks application/tool dependencies weekly and GitHub Actions monthly. Updates are reviewed in PRs and are not auto-merged. Monthly, review deferred PRs, runtime support, security advisories and the oldest open genuine defects. Record the tested version and run link before changing a compatibility boundary. Remove an ignore rule when its migration is approved; do not keep it silently forever. Security fixes may require raising a runtime floor rather than bypassing tests.

A green CI badge describes that workflow's current result, not a security, accessibility or production-readiness certification. Framework and license badges identify tools/terms, not test results. Do not publish a static passing test-count badge without a dated run.

## Known development-tool advisory

The 2026-11-17 audit found the upstream picomatch advisory [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) in development tooling, with no compatible patched release listed at that review. The offline CI badge is not a vulnerability-scan badge. Recheck npm audit during dependency review; do not force unrelated framework downgrades merely to remove an advisory count.

Archived workflow definitions are excluded from automatic Actions updates because they do not execute. Reactivating one requires reviewing its action versions, permissions and costs first. The active offline workflow remains covered by monthly Actions updates.
