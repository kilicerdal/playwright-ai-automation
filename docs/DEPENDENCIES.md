# Dependency review — November 6, 2026

The current locked dependency tree passed `npm audit --audit-level=moderate` with zero known vulnerabilities during local verification. This is a point-in-time advisory result, not a security guarantee.

Zod is on patched v4.6.7. A targeted override upgrades the minimatch dependency of TypeScript ESLint to ^11.0.5; type checking, linting, formatting and the test suites passed with this tree. Review the override when the upstream range is patched. Playwright is pinned to 1.64.0 and the Docker recipe uses its matching browser image.

Historical public-demo reports and media in this repository predate the current commerce/AI showcase. Current results are documented in [verification.md](verification.md).
