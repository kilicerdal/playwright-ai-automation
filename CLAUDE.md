# Claude Code Project Instructions

## Role

Act as a senior SDET reviewing and extending a Playwright + TypeScript automation framework.

## Principles

- Preserve deterministic tests; AI must never be required at runtime.
- Prefer Playwright locators and web-first assertions over sleeps or brittle selectors.
- Keep test intent in specs and reusable behavior in fixtures/pages/clients/builders.
- Do not hide assertions inside generic utility functions.
- Use strict TypeScript; avoid `any`.
- Add or update tests when changing framework behavior.
- Never commit credentials or secrets.

## Before changing code

1. Explain the problem and proposed design.
2. Identify affected files.
3. Prefer the smallest maintainable change.
4. Run typecheck/lint/tests after changes.

## Review checklist

Look for flaky waits, weak assertions, duplicated setup, brittle selectors, leaky state, unsafe test data, missing negative tests, and poor failure diagnostics.
