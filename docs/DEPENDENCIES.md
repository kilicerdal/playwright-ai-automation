# Dependency review — November 3, 2026

Compatible dependency updates were applied through `npm audit fix`. Zod was upgraded from v3 to v4.6.7 to address [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5). Contract validation and browser tests verify the APIs used by this project.

The remaining audit findings are moderate development-tooling findings inherited from minimatch in the ESLint/TypeScript ESLint dependency tree: [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249). The audit reports 12 affected package entries; these are not 12 independent root vulnerabilities. The proposed automatic force fix downgrades ESLint to v4 and is incompatible with the project's flat configuration. No force downgrade or incompatible minimatch override was applied.

These tools operate on repository files during development and CI. This does not remove the finding or establish that all usage is safe. Revisit compatible upstream fixes and rerun `npm audit` as dependencies change. Audit status is a point-in-time result, not a security guarantee.
