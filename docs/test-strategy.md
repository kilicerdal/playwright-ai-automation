# Test Strategy

## Layers

- UI: focused browser behavior and validation.
- API: service contract and response validation.
- E2E: small number of business-critical workflows.

## Reliability

No hard-coded sleeps. Tests use Playwright auto-waiting and web-first assertions. CI retains traces, screenshots, and video only on failure.

## Test data

Builders provide readable defaults and targeted overrides. Secrets live in environment variables, never source control.

## Tags

`@smoke` marks fast, release-critical coverage.
