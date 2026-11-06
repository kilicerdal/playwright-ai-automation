import ts from 'typescript';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import type { GeneratedCases, Requirement } from './contracts';
import { inspectDraft } from './guardrails';
/** Independent expectation oracle, not imported by the application. Fresh carts only. */
export function cartOracle(productId: string, quantity: unknown) {
  if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > 20)
    return { status: 422, total: 0 };
  const catalog: Record<string, { price: number; stock: number }> = {
    'atlas-pack': { price: 8900, stock: 8 },
    'orbit-headphones': { price: 14900, stock: 5 },
    'arc-lamp': { price: 6500, stock: 0 },
    'field-notebook': { price: 1800, stock: 20 },
  };
  const product = Object.hasOwn(catalog, productId) ? catalog[productId] : undefined;
  if (!product) return { status: 404, total: 0 };
  if (quantity > product.stock) return { status: 409, total: 0 };
  return { status: 200, total: product.price * quantity };
}
export function validateGeneratedCases(bundle: GeneratedCases, requirements: Requirement[]) {
  const errors: string[] = [];
  const ids = new Set<string>();
  const intents = new Set<string>();
  for (const item of bundle.cases) {
    if (item.requirementId !== 'CART-01' || !requirements.some((r) => r.id === item.requirementId))
      errors.push(`Unsupported case requirement ${item.requirementId}`);
    if (ids.has(item.id)) errors.push(`Duplicate case ID ${item.id}`);
    ids.add(item.id);
    const intent = JSON.stringify([item.productId, item.quantity]);
    if (intents.has(intent)) errors.push(`Duplicate case behavior ${item.id}`);
    intents.add(intent);
    const oracle = cartOracle(item.productId, item.quantity);
    if (item.expectedStatus !== oracle.status)
      errors.push(`Wrong expected status ${item.id}: expected ${oracle.status}`);
    if (item.expectedTotal !== oracle.total)
      errors.push(`Wrong expected total ${item.id}: expected ${oracle.total}`);
  }
  if (!bundle.cases.some((c) => c.expectedStatus === 200)) errors.push('Missing accepted case');
  if (!bundle.cases.some((c) => c.expectedStatus !== 200)) errors.push('Missing rejected case');
  return errors;
}
export function renderCandidate(bundle: GeneratedCases) {
  return (
    "import { test, expect } from '../src/fixtures/commerce';\n\n" +
    bundle.cases
      .map(
        (item) =>
          `test(${JSON.stringify('@' + item.requirementId + ' ' + item.id + ' ' + item.title)}, async ({ commerce }) => {\n  const response = await commerce.request.post('/api/cart', {data: ${JSON.stringify({ productId: item.productId, quantity: item.quantity })}, headers: {'X-CSRF-Token': commerce.csrf}});\n  expect(response.status()).toBe(${item.expectedStatus});\n  const cart = await (await commerce.cart()).json();\n  expect(cart.total).toBe(${item.expectedTotal});\n});\n`,
      )
      .join('\n')
  );
}
/** Typechecks a virtual file; never writes or executes the generated program. */
export function compileCandidate(code: string, root = process.cwd()): string[] {
  const path = resolve(root, 'generated/candidate.ts');
  const options: ts.CompilerOptions = {
    strict: true,
    noEmit: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    esModuleInterop: true,
    skipLibCheck: true,
    types: ['node', '@playwright/test'],
  };
  const host = ts.createCompilerHost(options);
  const originalRead = host.readFile;
  const originalExists = host.fileExists;
  host.readFile = (file) => (file === path ? code : originalRead(file));
  host.fileExists = (file) => file === path || originalExists(file);
  const program = ts.createProgram([path], options, host);
  return ts
    .getPreEmitDiagnostics(program)
    .map((d) => ts.flattenDiagnosticMessageText(d.messageText, ' '));
}
export function assessCandidate(code: string) {
  return [...inspectDraft(code), ...compileCandidate(code)];
}
export function candidateHash(code: string) {
  return createHash('sha256').update(code).digest('hex');
}
export function verifyApproval(
  code: string,
  approval: { status: string; reviewer: string; codeHash: string },
) {
  if (approval.status !== 'approved' || !approval.reviewer.trim())
    return ['Explicit reviewer approval is required'];
  if (approval.codeHash !== candidateHash(code))
    return ['Approval does not match the current draft'];
  return [];
}
