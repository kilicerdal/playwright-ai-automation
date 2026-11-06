import { spawnSync } from 'node:child_process';
import { mkdir, writeFile, access } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { Client } from 'pg';
import { localDatabaseURL } from '../src/db/store';
const root = resolve('artifacts/postgres-local');
const data = join(root, 'data');
const binary = (name: string) =>
  process.env.PG_BIN_DIR ? join(process.env.PG_BIN_DIR, name) : name;
function run(name: string, args: string[]) {
  const result = spawnSync(binary(name), args, { stdio: 'inherit' });
  if (result.status !== 0)
    throw new Error(`${name} failed; no other PostgreSQL service was modified`);
}
const mode = process.argv[2] ?? 'start';
await mkdir(root, { recursive: true });
if (mode === 'stop') {
  run('pg_ctl', ['-D', data, '-m', 'fast', 'stop']);
} else if (mode === 'start') {
  let initialized = true;
  try {
    await access(join(data, 'PG_VERSION'));
  } catch {
    initialized = false;
  }
  if (!initialized) {
    const passwordFile = join(root, 'lab-password');
    await writeFile(passwordFile, 'eai_demo\n', { mode: 0o600 });
    run('initdb', [
      '-D',
      data,
      '-U',
      'eai_demo',
      '--pwfile',
      passwordFile,
      '--auth-host=scram-sha-256',
      '--auth-local=scram-sha-256',
    ]);
  }
  const status = spawnSync(binary('pg_ctl'), ['-D', data, 'status'], { stdio: 'ignore' });
  if (status.status !== 0)
    run('pg_ctl', [
      '-D',
      data,
      '-l',
      join(root, 'server.log'),
      '-o',
      '-h 127.0.0.1 -p 55432 -c max_connections=50 -c shared_buffers=32MB',
      '-w',
      'start',
    ]);
  const client = new Client({
    connectionString: localDatabaseURL.replace('/eai_quality', '/postgres'),
  });
  await client.connect();
  try {
    const exists = await client.query("SELECT 1 FROM pg_database WHERE datname='eai_quality'");
    if (!exists.rowCount) await client.query('CREATE DATABASE eai_quality');
  } finally {
    await client.end();
  }
  console.log(
    'Isolated local PostgreSQL lab ready on 127.0.0.1:55432. Demo credentials only; no existing service was reconfigured.',
  );
} else throw new Error('Use start or stop');
