import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { request as requests } from '@playwright/test';
import { generatedCasesSchema, type GeneratedCases, type Requirement } from './contracts';
import {
  assessCandidate,
  candidateHash,
  renderCandidate,
  validateGeneratedCases,
  verifyApproval,
} from './test-generation';
import { PgCommerceStore, localDatabaseURL, dropTestSchema } from '../db/store';
import { createDurableServer } from '../../demo/durable-application';
import type { PriceCart } from '../../demo/application';
export type Review = {
  status: string;
  reviewer: string;
  approvedAt: string;
  codeHash: string;
  bundleHash: string;
};
export type CandidateInput = {
  origin: 'live-model-generated' | 'authored-offline-example';
  model: string;
  responseId?: string;
  bundle: GeneratedCases;
  code: string;
  approval?: Review;
};
export function bundleHash(bundle: GeneratedCases) {
  return createHash('sha256')
    .update(JSON.stringify(generatedCasesSchema.parse(bundle)))
    .digest('hex');
}
export async function loadCandidate(directory = 'artifacts/candidates'): Promise<CandidateInput> {
  const manifest = JSON.parse(await readFile(directory + '/manifest.json', 'utf8'));
  if (!['live-model-generated', 'authored-offline-example'].includes(manifest.origin))
    throw new Error('Unknown candidate origin');
  const bundle = generatedCasesSchema.parse(manifest.run?.data);
  const code = await readFile(directory + '/cart-generated.spec.ts.txt', 'utf8');
  if (candidateHash(code) !== manifest.codeHash)
    throw new Error('Candidate source does not match manifest');
  let approval: Review | undefined;
  try {
    approval = JSON.parse(await readFile(directory + '/approval.json', 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  return {
    origin: manifest.origin,
    model: manifest.model,
    responseId: manifest.run?.attempts?.at(-1)?.responseId,
    bundle,
    code,
    approval,
  };
}
export async function validateReview(input: CandidateInput) {
  if (!input.approval) throw new Error('Human review is required before candidate execution');
  const errors = verifyApproval(input.code, input.approval);
  if (input.approval.bundleHash !== bundleHash(input.bundle))
    errors.push('Approval does not match the structured cases');
  if (input.code !== renderCandidate(input.bundle))
    errors.push('Source is not the canonical rendering of the reviewed cases');
  const requirements: Requirement[] = JSON.parse(
    await readFile('requirements/commerce.json', 'utf8'),
  );
  errors.push(
    ...validateGeneratedCases(input.bundle, requirements),
    ...assessCandidate(input.code),
  );
  if (errors.length) throw new Error(errors.join('; '));
}
const sum: PriceCart = (items) =>
  items.reduce((total, item) => total + item.product.price * item.quantity, 0);
export const pricingFaults: Record<string, PriceCart> = {
  zero: () => 0,
  units: (items) => sum(items) / 100,
  quantity: (items) => items.reduce((total, item) => total + item.product.price, 0),
  droppedLine: (items) => sum(items.slice(1)),
  doubled: (items) => sum(items) * 2,
  surcharge: (items) => sum(items) + 1,
  rounding: (items) => Math.round(sum(items) / 1000) * 1000,
  cheapest: (items) => (items.length ? Math.min(...items.map((i) => i.product.price)) : 0),
  tax: (items) => Math.round(sum(items) * 1.08),
  negative: (items) => -sum(items),
};
async function execute(bundle: GeneratedCases, priceCart?: PriceCart) {
  const connectionString = process.env.TEST_DATABASE_URL ?? localDatabaseURL;
  const url = new URL(connectionString);
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/eai_quality')
    throw new Error('Evaluation requires the disposable loopback eai_quality database');
  const schema = 'eai_test_' + randomUUID().replaceAll('-', '');
  const store = new PgCommerceStore(connectionString, schema, priceCart);
  await store.migrate();
  const server = createDurableServer(store);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const a = server.address();
  if (!a || typeof a === 'string') throw new Error('Missing evaluation address');
  const results = [];
  try {
    for (const item of bundle.cases) {
      const context = await requests.newContext({ baseURL: `http://127.0.0.1:${a.port}` });
      try {
        const login = await context.post('/api/session', {
          data: { username: 'demo', password: 'demo-pass' },
        });
        if (login.status() !== 201) throw new Error('Evaluation setup authentication failed');
        const csrf = (await login.json()).csrf;
        const response = await context.post('/api/cart', {
          headers: { 'X-CSRF-Token': csrf },
          data: { productId: item.productId, quantity: item.quantity },
        });
        const cart = await context.get('/api/cart');
        if (response.status() >= 500 || cart.status() !== 200)
          throw new Error('Infrastructure failure: no defect detection credited');
        const total = (await cart.json()).total;
        results.push({
          id: item.id,
          requirementId: item.requirementId,
          passed: response.status() === item.expectedStatus && total === item.expectedTotal,
          expectedStatus: item.expectedStatus,
          actualStatus: response.status(),
          expectedTotal: item.expectedTotal,
          actualTotal: total,
        });
      } finally {
        await context.dispose();
      }
    }
    return results;
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await store.close();
    await dropTestSchema(connectionString, schema);
  }
}
export async function evaluateApproved(
  input: CandidateInput,
  mode: 'reviewed-candidate' | 'fixture-demonstration' = 'reviewed-candidate',
) {
  await validateReview(input);
  const controls = await execute(input.bundle);
  if (controls.some((result) => !result.passed))
    throw new Error('Candidate control failed; mutation score is invalid');
  const mutants = [];
  for (const [name, priceCart] of Object.entries(pricingFaults)) {
    const results = await execute(input.bundle, priceCart);
    mutants.push({
      name,
      detected: results.some((result) => !result.passed),
      detectedBy: results.filter((result) => !result.passed).map((result) => result.id),
    });
  }
  return {
    generatedAt: new Date().toISOString(),
    mode,
    origin: input.origin,
    model: input.model,
    responseId: input.responseId ?? null,
    backend: 'postgres',
    codeHash: candidateHash(input.code),
    bundleHash: bundleHash(input.bundle),
    reviewer: input.approval!.reviewer,
    controls,
    mutants,
    controlPassed: controls.filter((result) => result.passed).length,
    detected: mutants.filter((result) => result.detected).length,
    totalMutants: mutants.length,
    note: 'Trusted fixed-endpoint case interpreter, not execution of generated JavaScript. Curated pricing faults only; a fixture demonstration is not a live-model result.',
  };
}
