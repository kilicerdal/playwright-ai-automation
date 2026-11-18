import { test, expect } from '@playwright/test';
import { createServer } from 'node:net';
import { inspectPrerequisites, portAvailable } from '../../scripts/doctor';

const ready = () => ({
  nodeVersion: '22.0.0',
  binaryVersion: () => 'installed',
  browserInstalled: async () => true,
  portAvailable: async () => true,
});

test('doctor accepts the minimum runtime and a fully installed idle environment', async () => {
  expect((await inspectPrerequisites(ready())).every((check) => check.ok)).toBe(true);
});

test('doctor identifies missing tools, browsers, occupied ports and an old runtime', async () => {
  const checks = await inspectPrerequisites({
    ...ready(),
    nodeVersion: '20.0.0',
    binaryVersion: (name) => (name === 'initdb' ? undefined : 'installed'),
    browserInstalled: async (name) => name !== 'webkit',
    portAvailable: async (port) => port !== 55432,
  });
  expect(checks.filter((check) => !check.ok).map((check) => check.name)).toEqual([
    'Node.js',
    'initdb',
    'webkit',
    '127.0.0.1:55432',
  ]);
});

test('doctor detects an actual loopback listener without stopping it', async () => {
  const server = createServer((socket) => socket.end());
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected a TCP address');
  try {
    expect(await portAvailable(address.port)).toBe(false);
    expect(server.listening).toBe(true);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
  expect(await portAvailable(address.port)).toBe(true);
});
