# Project working instructions

Preserve deterministic execution and honest AI provenance. Keep generated drafts outside testDir and never auto-execute or auto-apply model changes. Use accessible locators, web-first assertions, strict TypeScript and isolated fixtures. Specs own assertions; clients and pages own interactions. Do not weaken business expectations to make failures pass.

Before completing changes, run `npm run quality` and the relevant suites. Run `npm run verify` for a release. Visual baselines require human inspection on the target platform. Never claim live model, hosted CI, container or accessibility certification without that specific evidence. Do not commit secrets or generated session/report artifacts. Live API usage requires explicit configured credentials; normal tests use authored examples and mocked provider contracts.
