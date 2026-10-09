# Playwright AI Automation

A production-style learning project for modern SDET practices using **Playwright + TypeScript**. It demonstrates UI, API, and end-to-end automation plus CI quality gates and disciplined AI-assisted engineering with Claude Code / GitHub Copilot.

> AI tools help develop and review the framework; they are not required to execute tests.

## What it demonstrates

- Playwright UI and API automation
- TypeScript with strict checking
- Page Objects and custom fixtures
- API clients and Zod contract validation
- Deterministic test-data builders
- Smoke tagging, parallel execution, retries in CI
- Failure traces, screenshots, video, HTML and JUnit reports
- GitHub Actions quality gates
- Docker execution
- Claude Code project instructions

## Quick start

```bash
npm install
npx playwright install
cp .env.example .env
npm test
```

Run focused suites:

```bash
npm run test:ui
npm run test:api
npm run test:e2e
npm run test:smoke
```

Quality checks:

```bash
npm run quality
```

Open the latest HTML report:

```bash
npm run report
```

## Structure

```text
src/pages          UI interaction models
src/fixtures       Playwright custom fixtures
src/api            API clients, models and schemas
src/data/builders  Deterministic test data
tests/ui           UI-focused tests
tests/api          API-focused tests
tests/e2e          Business workflow tests
docs               Architecture, strategy and AI workflow
.github/workflows  CI pipelines
CLAUDE.md           Claude Code project guidance
```

## Learning roadmap

After the framework runs locally, study it in this order: test specs → locators/assertions → async/await → TypeScript types → Page Objects → fixtures → API clients → schema validation → configuration → CI → Docker → Claude Code/Copilot workflow.

## Important note

The public demo systems used here are for learning. A real enterprise framework would point to approved non-production environments and use organization-specific secrets, test-data controls, and service contracts.
