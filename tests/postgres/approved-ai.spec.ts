import { test, expect } from './fixtures';
import { mkdir, writeFile } from 'node:fs/promises';
import { generatedCasesSchema, type Requirement } from '../../src/ai/contracts';
import { OfflineProvider } from '../../src/ai/offline';
import { renderCandidate, candidateHash } from '../../src/ai/test-generation';
import {
  bundleHash,
  validateReview,
  evaluateApproved,
  type CandidateInput,
} from '../../src/ai/approved-evaluation';
const requirements: Requirement[] = [{ id: 'CART-01', text: 'Fresh-session cart contract' }];
async function fixture(): Promise<CandidateInput> {
  const bundle = generatedCasesSchema.parse(
    (await new OfflineProvider(requirements).generate('cases')).data,
  );
  const code = renderCandidate(bundle);
  return { origin: 'authored-offline-example', model: 'authored-test-fixture', bundle, code };
}
test('@AI-V3 review gate rejects pending candidates before any database execution', async () => {
  await expect(validateReview(await fixture())).rejects.toThrow('Human review is required');
});
test('@AI-V3 source changes invalidate a review even with unchanged case data', async () => {
  const input = await fixture();
  input.approval = {
    status: 'approved',
    reviewer: 'TEST_FIXTURE_ONLY',
    approvedAt: '2026-01-01T00:00:00.000Z',
    codeHash: candidateHash(input.code),
    bundleHash: bundleHash(input.bundle),
  };
  input.code += '\n// changed after review';
  await expect(validateReview(input)).rejects.toThrow('current draft');
});
test('@AI-V3 structured data changes invalidate a review even with unchanged source', async () => {
  const input = await fixture();
  input.approval = {
    status: 'approved',
    reviewer: 'TEST_FIXTURE_ONLY',
    approvedAt: '2026-01-01T00:00:00.000Z',
    codeHash: candidateHash(input.code),
    bundleHash: bundleHash(input.bundle),
  };
  input.bundle.cases[0].quantity = 2;
  await expect(validateReview(input)).rejects.toThrow('structured cases');
});
test('@AI-V3 fixture-only approved-case rehearsal detects actual PostgreSQL pricing faults', async ({
  playwright,
}, info) => {
  void playwright;
  const input = await fixture();
  input.approval = {
    status: 'approved',
    reviewer: 'TEST_FIXTURE_ONLY_NOT_A_HUMAN_REVIEW',
    approvedAt: '2026-01-01T00:00:00.000Z',
    codeHash: candidateHash(input.code),
    bundleHash: bundleHash(input.bundle),
  };
  const result = await evaluateApproved(input, 'fixture-demonstration');
  expect(result.origin).toBe('authored-offline-example');
  expect(result.mode).toBe('fixture-demonstration');
  expect(result.controlPassed).toBe(10);
  expect(result.detected).toBe(10);
  expect(result.mutants.every((m) => m.detectedBy.length > 0)).toBe(true);
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/v3-fixture-evaluation.json', JSON.stringify(result, null, 2) + '\n');
  await info.attach('fixture-evaluation', {
    body: JSON.stringify(result, null, 2),
    contentType: 'application/json',
  });
});
