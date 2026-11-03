# Playwright AI Automation

[![Playwright Tests](https://github.com/kilicerdal/playwright-ai-automation/actions/workflows/playwright.yml/badge.svg)](https://github.com/kilicerdal/playwright-ai-automation/actions/workflows/playwright.yml)

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

## Review the code

Start with these examples to see how the framework is organized:

| Example                                         | What to inspect                                         |
| ----------------------------------------------- | ------------------------------------------------------- |
| [Login tests](tests/ui/login.spec.ts)           | UI assertions and reusable page interactions            |
| [API tests](tests/api/posts.spec.ts)            | API requests and response validation                    |
| [Cart workflow](tests/e2e/cart.spec.ts)         | End-to-end business flow                                |
| [Custom fixtures](src/fixtures/test.ts)         | Shared test setup and dependencies                      |
| [CI workflow](.github/workflows/playwright.yml) | Quality checks, browser execution, and report artifacts |

More detail: [architecture](docs/architecture.md), [test strategy](docs/test-strategy.md), and [AI workflow](docs/ai-workflow.md).

## Quick start

Use Node.js 22, matching CI, and npm. The default targets are the public SauceDemo UI and JSONPlaceholder API, so internet access is required.

```bash
git clone https://github.com/kilicerdal/playwright-ai-automation.git
cd playwright-ai-automation
```

```bash
npm ci
npx playwright install chromium firefox
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

## CI and failure investigation

The [Playwright workflow](.github/workflows/playwright.yml) runs on pushes and pull requests to `main`, and can also be started manually. It runs type checking, linting, formatting checks, and the test suite in Chromium and Firefox.

When a test fails, inspect the HTML report and retained traces, screenshots, and videos. CI uploads `playwright-report` and structured JSON/JUnit results as workflow artifacts. A status badge reports the workflow result; it is not a coverage percentage.

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
