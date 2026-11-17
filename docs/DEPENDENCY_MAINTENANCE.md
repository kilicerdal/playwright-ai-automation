# Dependency maintenance

## Automated proposals

[Dependabot configuration](../.github/dependabot.yml): The existing configuration checks npm weekly (up to five version PRs) and GitHub Actions monthly. That configuration is retained.

New configurations limit open version-update PRs to three per application ecosystem and two per monthly ecosystem. Security-update handling is separate from these version-update limits. Scheduling a check does not guarantee an update is available or that a hosted update job succeeds; inspect Dependabot logs and PRs on GitHub.

## Review before merging

1. Read upstream release notes, advisories, license changes and breaking changes. Check supported Node/Python versions and changes to install scripts.
2. Keep related manifest/lockfile changes together. Preserve third-party notices. A bot PR is a proposal, not approval to merge or publish a new release.
3. Run the relevant checks below and investigate failures without weakening business assertions. Do not automatically accept generated visual baselines or rewrite historical passing evidence.
4. Merge only after review. If behavior or dependencies changed, record fresh verification before a release. Keep the old release evidence tied to its original commit.

```sh
npm ci
npm run quality
npm run db:local:start
npm run verify
npm run db:local:stop
```

Stop only a database lab you started. Hosted project workflows and live model calls remain disabled; Dependabot proposals do not authorize enabling them. Review the actual local result before merging. Browser package changes need matching browser binaries; visual baselines need human inspection on the target platform.

No automatic merge is configured by these files. Never attach API keys, real customer data, local databases or raw sensitive traces to a PR. Dependency checks do not require paid model calls or production cloud access.
