# Optional AWS evidence summary archive

Status: **prepared, disabled, not deployed**. Formal cfn-lint/cfn-guard and account-aware validation are pending at the user's request. `npm run aws:check` checks only project-specific security invariants and JSON parsing; it is not a CloudFormation schema validator or IAM simulator.

## Scope

The optional stack creates a private S3 bucket, a TLS-enforcing bucket policy, and one OIDC upload role. It does not move browser execution to AWS, create EC2/Lambda/RDS resources, expose a website, or configure a model provider. Normal CI and AI generation remain independent of AWS.

The manual workflow uploads one small **curated numerical summary**: test counts, outcomes, and AI evaluation totals. It excludes prompts, source code, model inputs, test errors, credentials, traces and videos. Full reports stay in GitHub Actions artifacts. `npm run aws:summary` prepares the JSON locally without calling AWS.

## Security and retention

- All public access blocks enabled; ACLs disabled through bucket-owner-enforced ownership.
- Explicit SSE-S3 encryption and a bucket policy denying non-TLS access.
- Versioning enabled. Current objects expire after the configured retention (default seven days); noncurrent versions expire after one day. Expired delete markers and incomplete multipart uploads are cleaned up.
- Upload role permits only `s3:PutObject` under `reports/` in this stack's bucket, with AES256 encryption required. It cannot read or delete evidence.
- OIDC trust requires the exact repository/environment subject and `sts.amazonaws.com` audience. No long-lived AWS key is stored in GitHub.
- The bucket is retained on stack deletion or replacement. Retained resources and versions can continue to incur charges; teardown requires deliberate review and emptying/deletion by an authorized administrator.

## Account setup before any deployment

1. Verify your AWS plan, current credits/eligibility, selected region and S3 pricing. This repository makes no zero-cost promise.
2. Review `infra/aws/report-archive.template.json` and complete local schema, compliance and account-aware validation before deployment.
3. Establish or reuse the account's GitHub OIDC provider. Supply its ARN as `GitHubOidcProviderArn`; it must be in the deployment account. The template does not create a duplicate account-wide provider.
4. Review a CloudFormation change set. Any eventual deployment needs IAM capability acknowledgement and separate authorization; nothing in `npm run verify` deploys it.
5. Create the GitHub environment `aws-reports`, require reviewer approval and restrict deployment branches to `main`. This is essential because an environment OIDC subject itself does not encode the branch.
6. Configure environment variables `AWS_REPORT_REGION`, `AWS_REPORT_ROLE_ARN`, `AWS_REPORT_ACCOUNT_ID`, and `AWS_REPORT_BUCKET` from the reviewed account/stack outputs.
7. Set repository variable `AWS_REPORTS_ENABLED=true` only after the setup and cost review. Dispatch `Optional AWS Evidence Summary` on main and explicitly confirm cost review. The workflow never triggers automatically on a push or pull request.

## Cost and observability

Storage, requests, versions and any applicable data transfer are billable dimensions. Eligibility depends on account plan and credits; newer Free account plans have a time/credit boundary. Budget alerts are useful notifications, not hard spending caps. Review retention and account settings before enabling uploads.

For adoption beyond this small opt-in example, enable S3 access logging, CloudTrail data events and suitable CloudWatch metrics after reviewing their additional storage/request/monitoring costs. They are recommended observability controls but are not silently provisioned by this cost-conscious reference stack. Default bucket storage metrics and GitHub execution logs do not replace object-level auditing.

References: [AWS Free Tier](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier.html), [S3 pricing](https://aws.amazon.com/s3/pricing/), [S3 security practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html), [S3 monitoring](https://docs.aws.amazon.com/AmazonS3/latest/userguide/monitoring-overview.html), [GitHub OIDC trust in AWS](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-idp_oidc.html).
