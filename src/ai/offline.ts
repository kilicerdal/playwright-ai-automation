import type { Provider, ModelResult } from './provider';
import type { Requirement, Task } from './contracts';
/** Authored deterministic examples: NOT recorded model responses or live AI. */
export class OfflineProvider implements Provider {
  readonly mode = 'offline' as const;
  constructor(private readonly requirements: Requirement[]) {}
  async generate(task: Task): Promise<ModelResult> {
    const examples: Record<Task, unknown> = {
      cases: {
        cases: [
          ['single-pack', 'Add one daypack', 'atlas-pack', 1, 200, 8900],
          ['max-stock', 'Add all eight daypacks', 'atlas-pack', 8, 200, 71200],
          ['over-stock', 'Reject ninth daypack', 'atlas-pack', 9, 409, 0],
          ['zero', 'Reject zero quantity', 'atlas-pack', 0, 422, 0],
          ['negative', 'Reject negative quantity', 'atlas-pack', -1, 422, 0],
          ['fraction', 'Reject fractional quantity', 'atlas-pack', 1.5, 422, 0],
          ['string', 'Reject numeric string', 'atlas-pack', '1', 422, 0],
          ['null', 'Reject null quantity', 'atlas-pack', null, 422, 0],
          ['unknown', 'Reject unknown product', 'unknown', 1, 404, 0],
          ['sold-out', 'Reject sold-out lamp', 'arc-lamp', 1, 409, 0],
        ].map(([id, title, productId, quantity, expectedStatus, expectedTotal]) => ({
          id,
          title,
          requirementId: 'CART-01',
          productId,
          quantity,
          expectedStatus,
          expectedTotal,
        })),
      },
      plan: {
        summary: 'Risk-based commerce test plan (authored offline example)',
        scenarios: this.requirements.flatMap((r, i) => {
          const cases: Record<string, [string, string[], string, string, string[], string]> = {
            'AUTH-01': [
              'Valid sign-in and session access',
              ['POST /api/session with demo/demo-pass', 'GET /api/cart with issued cookie'],
              'Login returns 201; cart returns 200',
              'Invalid password never grants access',
              ['POST /api/session with a wrong password', 'GET /api/cart without a valid cookie'],
              'Login and protected cart return 401',
            ],
            'CAT-01': [
              'Case-insensitive catalog filtering',
              ['GET /api/products?q=NOTE&category=Workspace'],
              '200 with only field-notebook; price is integer 1800',
              'Unmatched catalog query',
              ['GET /api/products?q=nonexistent'],
              '200 with an empty array',
            ],
            'CART-01': [
              'Add multiple quantities with exact subtotal',
              ['Authenticate', 'Add 2 atlas-pack and 3 field-notebook', 'GET /api/cart'],
              'count=5 and total=23200 cents',
              'Reject fractional quantity without mutation',
              ['Authenticate', 'POST /api/cart with atlas-pack quantity 1.5', 'Read cart'],
              '422 and unchanged empty cart',
            ],
            'ORDER-01': [
              'Checkout commits order and clears bag',
              [
                'Authenticate and add 2 atlas-pack',
                'POST /api/orders with valid shipping and a new key',
                'Read cart and orders',
              ],
              '201 confirmed order for 17800 cents; cart is empty; exactly one order',
              'Empty cart cannot create an order',
              [
                'Authenticate without adding products',
                'POST /api/orders with valid shipping and key',
              ],
              '422 and no persisted orders',
            ],
            'ORDER-02': [
              'Same-key checkout returns original order',
              [
                'Add atlas-pack',
                'Checkout with key showcase-key-001',
                'Repeat identical shipping and key',
              ],
              'First response 201; retry 200 with identical order ID; one order',
              'Reject key reuse with changed payload',
              [
                'Create an order with a fresh key',
                'Repeat that key with a different shipping name',
              ],
              '409; original order is unchanged',
            ],
            'SEC-01': [
              'Session-bound token permits mutation',
              ['Authenticate and read csrf', 'POST /api/cart with cookie and X-CSRF-Token'],
              '200 with exactly the requested item',
              'Cross-session order access is denied',
              ['Session A creates an order', 'Session B requests the same order ID'],
              '404; session B cart and orders remain independent',
            ],
            'UX-01': [
              'Keyboard sign-in and responsive collection',
              [
                'At 390px width focus Username',
                'Type demo, Tab, type demo-pass, Enter',
                'Inspect collection and document width',
              ],
              'Collection visible; no horizontal overflow; controls have accessible names',
              'Sold-out action cannot modify cart',
              ['Sign in', 'Inspect Arc Desk Lamp action and cart count'],
              'Sold out button disabled; cart remains empty',
            ],
          };
          const c = cases[r.id] ?? [
            r.id,
            ['Review requirement'],
            r.text,
            r.id + ' risk',
            ['Review invalid input'],
            r.text,
          ];
          return [
            {
              id: `P-${i}`,
              requirementId: r.id,
              title: c[0],
              kind: 'positive',
              priority: 'P0',
              steps: c[1],
              expected: c[2],
            },
            {
              id: `N-${i}`,
              requirementId: r.id,
              title: c[3],
              kind: 'negative',
              priority: 'P1',
              steps: c[4],
              expected: c[5],
            },
          ];
        }),
        risks: [
          'Examples require human refinement into precise cases; no payment provider or production infrastructure is exercised.',
        ],
      },
      draft: {
        title: 'Idempotent checkout',
        requirementIds: ['ORDER-01', 'ORDER-02'],
        code: "import { test, expect } from '../src/fixtures/commerce';\n\ntest('checkout retry preserves one order', async ({ commerce }) => {\n  await commerce.add('atlas-pack', 1);\n  const first = await commerce.checkout('showcase-key-001');\n  expect(first.status()).toBe(201);\n  const retry = await commerce.checkout('showcase-key-001');\n  expect(retry.status()).toBe(200);\n  expect((await retry.json()).id).toBe((await first.json()).id);\n});\n",
        reviewNotes: [
          'Draft is quarantined; review imports, assertions, data isolation and business intent before promotion.',
        ],
      },
      triage: {
        category: 'unknown',
        summary: 'Observed checkout response differs from expected success; cause is unconfirmed.',
        evidenceIds: ['E1', 'E2'],
        hypotheses: [
          {
            cause: 'Upstream dependency was unavailable',
            confidence: 'medium',
            nextCheck: 'Inspect the service health and correlation ID before retrying.',
          },
        ],
        suggestedFix:
          'Investigate the 503 response; do not change expected 201 or silently retry the assertion.',
      },
      locator: {
        candidates: [
          {
            expression: "page.getByRole('button', { name: 'Place demo order →', exact: true })",
            evidenceId: 'DOM1',
            reason: 'Exact accessible name from supplied DOM evidence',
          },
        ],
        requiresReview: true,
      },
      impact: {
        selectedRequirements: ['ORDER-01', 'ORDER-02', 'SEC-01'],
        rationale:
          'Checkout changes can affect idempotency and authorization. Advisory selection does not replace the full release gate.',
        runFullSuite: true,
      },
    };
    return {
      data: examples[task],
      inputTokens: 0,
      outputTokens: 0,
      model: 'authored-offline-example',
    };
  }
}
