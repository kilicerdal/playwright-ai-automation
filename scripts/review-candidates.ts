import { writeFile } from 'node:fs/promises';
import { loadCandidate, bundleHash, validateReview } from '../src/ai/approved-evaluation';
import { candidateHash } from '../src/ai/test-generation';
const directory =
  process.argv.find((arg) => arg.startsWith('--directory='))?.slice(12) ?? 'artifacts/candidates';
const input = await loadCandidate(directory);
const hash = candidateHash(input.code);
console.log(
  JSON.stringify(
    {
      origin: input.origin,
      model: input.model,
      codeHash: hash,
      bundleHash: bundleHash(input.bundle),
      cases: input.bundle.cases.map(({ id, title, expectedStatus, expectedTotal }) => ({
        id,
        title,
        expectedStatus,
        expectedTotal,
      })),
      status: input.approval?.status ?? 'pending-human-review',
    },
    null,
    2,
  ),
);
if (process.argv.includes('--approve')) {
  const reviewer = process.argv.find((arg) => arg.startsWith('--reviewer='))?.slice(11);
  const supplied = process.argv.find((arg) => arg.startsWith('--hash='))?.slice(7);
  if (!reviewer || supplied !== hash)
    throw new Error(
      'Approval requires an explicit --reviewer and matching --hash after source review',
    );
  const approval = {
    status: 'approved',
    reviewer,
    approvedAt: new Date().toISOString(),
    codeHash: hash,
    bundleHash: bundleHash(input.bundle),
  };
  await validateReview({ ...input, approval });
  await writeFile(directory + '/approval.json', JSON.stringify(approval, null, 2) + '\n');
  console.log('Saved hash-bound human-attested approval. No tests executed.');
}
