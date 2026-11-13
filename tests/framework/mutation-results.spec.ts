import { test, expect } from '@playwright/test';
import { classifyMutation, type MutationTestResult } from '../../scripts/mutation-results';
const passed: MutationTestResult = { title: 'business rule', status: 'passed', errors: [] };
const assertion: MutationTestResult = {
  ...passed,
  status: 'failed',
  errors: [
    {
      message:
        'Error: MUTATION_ASSERTION stock after checkout\n\nexpect(received).toBe(expected)\nExpected: 6\nReceived: 8',
    },
  ],
};
test('mutation classifier distinguishes survivors and business assertion kills', () => {
  expect(classifyMutation([passed], [passed.title], 0, false)).toBe('survived');
  expect(classifyMutation([assertion], [passed.title], 1, false)).toBe('killed');
});
for (const [name, result] of Object.entries({
  timeout: { ...assertion, status: 'timedOut' },
  skipped: { ...passed, status: 'skipped' },
  database: {
    ...assertion,
    errors: [
      {
        message:
          'Error: connection refused\nsource: expect(stock, "MUTATION_ASSERTION stock").toBe(6)',
      },
    ],
  },
  teardown: { ...assertion, errors: [...assertion.errors, { message: 'Error: cleanup failed' }] },
  unlabelled: { ...assertion, errors: [{ message: 'Error: expect(received).toBe(expected)' }] },
}))
  test(`mutation classifier gives no kill credit for ${name}`, () => {
    expect(classifyMutation([result], [passed.title], 1, false)).toBe('error');
  });
test('mutation classifier rejects missing, duplicate or substituted scenarios and crashes', () => {
  expect(classifyMutation([], [passed.title], 0, false)).toBe('error');
  expect(classifyMutation([passed, passed], [passed.title], 0, false)).toBe('error');
  expect(classifyMutation([{ ...passed, title: 'other' }], [passed.title], 0, false)).toBe('error');
  expect(classifyMutation([assertion], [passed.title], null, true)).toBe('error');
  expect(classifyMutation([assertion], [passed.title], 0, false)).toBe('error');
});
