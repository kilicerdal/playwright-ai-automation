import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const t = JSON.parse(await readFile('infra/aws/report-archive.template.json', 'utf8'));
const bucket = t.Resources.EvidenceBucket;
assert.equal(bucket.DeletionPolicy, 'Retain');
assert.equal(bucket.UpdateReplacePolicy, 'Retain');
for (const key of [
  'BlockPublicAcls',
  'IgnorePublicAcls',
  'BlockPublicPolicy',
  'RestrictPublicBuckets',
])
  assert.equal(bucket.Properties.PublicAccessBlockConfiguration[key], true);
assert.equal(bucket.Properties.OwnershipControls.Rules[0].ObjectOwnership, 'BucketOwnerEnforced');
assert.equal(
  bucket.Properties.BucketEncryption.ServerSideEncryptionConfiguration[0]
    .ServerSideEncryptionByDefault.SSEAlgorithm,
  'AES256',
);
assert.equal(bucket.Properties.VersioningConfiguration.Status, 'Enabled');
const role = t.Resources.GitHubEvidenceUploader.Properties;
assert.deepEqual(role.Policies[0].PolicyDocument.Statement[0].Action, ['s3:PutObject']);
assert.equal(
  role.Policies[0].PolicyDocument.Statement[0].Resource['Fn::Sub'],
  '${EvidenceBucket.Arn}/reports/*',
);
const trust = role.AssumeRolePolicyDocument.Statement[0].Condition.StringEquals;
assert.equal(trust['token.actions.githubusercontent.com:aud'], 'sts.amazonaws.com');
assert.equal(
  trust['token.actions.githubusercontent.com:sub']['Fn::Sub'],
  'repo:${GitHubRepository}:environment:${GitHubEnvironment}',
);
assert.equal(
  t.Resources.EvidenceBucketPolicy.Properties.PolicyDocument.Statement[0].Condition.Bool[
    'aws:SecureTransport'
  ],
  'false',
);
console.log(
  'Project-specific AWS security invariants passed. This is not cfn-lint, cfn-guard, IAM simulation, or account/deployment validation.',
);
