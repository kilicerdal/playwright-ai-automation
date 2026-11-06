import { readdir } from 'node:fs/promises';
const files = (await readdir('all-blob-reports')).filter((file) => file.endsWith('.zip'));
if (files.length !== 3)
  throw new Error(
    `Expected 3 blob reports (AI + 2 functional shards); received ${files.length}. Missing jobs cannot be reported as passing.`,
  );
console.log('Received AI evaluation and both functional shard reports.');
