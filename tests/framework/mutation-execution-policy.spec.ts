import { test, expect } from '@playwright/test';
import { mutationExecutionPolicy } from '../../src/mutations/execution-policy';

test('ordinary local mutation execution is labeled local', () => {
  expect(mutationExecutionPolicy({}).mode).toBe('local');
});
test('hosted execution fails closed without explicit authorization', () => {
  expect(() => mutationExecutionPolicy({ CI: 'true' })).toThrow('explicit offline-CI');
  expect(() => mutationExecutionPolicy({ CI: 'true', ALLOW_OFFLINE_CI_MUTATIONS: '0' })).toThrow();
});
test('authorized offline CI evidence does not claim a desktop run', () => {
  const policy = mutationExecutionPolicy({ CI: 'true', ALLOW_OFFLINE_CI_MUTATIONS: '1' });
  expect(policy.mode).toBe('offline-ci');
  expect(policy.description).toContain('Offline CI runner');
  expect(policy.description).toContain('no live model or AWS operations');
});
