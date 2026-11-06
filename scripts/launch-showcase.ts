import { spawn, type ChildProcess } from 'node:child_process';
import { Client } from 'pg';
import { localDatabaseURL } from '../src/db/store';
const children: ChildProcess[] = [];
let databaseStarted = false;
let stopping = false;
let foreground: ChildProcess | undefined;
let serviceFailed = false;
function task(file: string, args: string[] = [], background = false) {
  // Fixed local scripts, no shell or user-supplied executable.
  const child = spawn(process.execPath, ['--import', 'tsx', file, ...args], {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: localDatabaseURL,
      DATABASE_SCHEMA: 'eai_showcase',
      SHOWCASE_PORT: '4174',
      DURABLE_PORT: '4175',
    },
  });
  if (background) {
    children.push(child);
    child.once('error', () => {
      serviceFailed = true;
    });
    return Promise.resolve();
  }
  foreground = child;
  child.once('exit', () => {
    if (foreground === child) foreground = undefined;
  });
  return new Promise<void>((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`${file} exited with ${code}`)),
    );
  });
}
async function stop() {
  if (stopping) return;
  stopping = true;
  if (foreground && foreground.exitCode === null) foreground.kill('SIGTERM');
  for (const child of children.reverse()) {
    if (child.exitCode !== null) continue;
    child.kill('SIGTERM');
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        child.kill('SIGKILL');
        resolve();
      }, 5000);
      child.once('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }
  if (databaseStarted) await task('scripts/db-local.ts', ['stop']);
}
async function probe(
  port: number,
  path: string,
  accepts: (body: Record<string, unknown>) => boolean,
) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      signal: AbortSignal.timeout(1500),
    });
    const body = await response.json();
    if (!response.ok || !accepts(body))
      throw new Error(
        `Port ${port} is occupied by an incompatible service. Stop it yourself before launching V5.`,
      );
    return true;
  } catch (error) {
    if ((error as { cause?: { code?: string } }).cause?.code === 'ECONNREFUSED') return false;
    throw error;
  }
}
async function ready(
  port: number,
  path: string,
  accepts: (body: Record<string, unknown>) => boolean,
) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (serviceFailed || children.some((child) => child.exitCode !== null))
      throw new Error('A local service exited during startup');
    if (await probe(port, path, accepts)) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Local service on port ${port} did not become ready`);
}
async function main() {
  // Check ports before changing anything. Existing compatible processes are reused, never killed.
  const appOK = (body: Record<string, unknown>) =>
    body.service === 'atlas-commerce' && body.backend === 'postgres';
  const dashboardOK = (body: Record<string, unknown>) =>
    body.service === 'eai-showcase' && body.version === '5.0.0' && body.policy === 'local-only';
  const appExists = await probe(4175, '/api/health', appOK);
  const dashboardExists = await probe(4174, '/api/showcase/health', dashboardOK);
  const client = new Client({ connectionString: localDatabaseURL, connectionTimeoutMillis: 1500 });
  try {
    await client.connect();
    await client.query('SELECT 1');
  } catch (error) {
    if ((error as { code?: string }).code !== 'ECONNREFUSED')
      throw new Error(
        'The local lab database is not compatible or not accessible. No existing database was changed.',
      );
    databaseStarted = true;
    await task('scripts/db-local.ts', ['start']);
  } finally {
    await client.end();
  }
  await task('scripts/build-showcase.ts');
  if (!appExists) await task('demo/durable-server.ts', [], true);
  if (!dashboardExists) await task('scripts/serve-showcase.ts', [], true);
  await ready(4175, '/api/health', appOK);
  await ready(4174, '/api/showcase/health', dashboardOK);
  console.log(
    '\nV5 ready — http://127.0.0.1:4174/#showtime\nCommerce app — http://127.0.0.1:4175\nLocal execution only. No paid services. Ctrl+C stops only services started by this launcher.',
  );
  if (process.argv.includes('--check')) {
    await stop();
    return;
  }
  for (const child of children)
    child.once('exit', () => {
      if (!stopping)
        void stop().finally(() => {
          process.exitCode = 1;
        });
    });
  if (children.length) await new Promise<void>(() => {});
  else console.log('All services were already running; nothing is owned by this launcher.');
  await stop();
}
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.once(signal, () => {
    void stop().finally(() => process.exit(0));
  });
main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : 'Local startup failed');
  await stop();
  process.exitCode = 1;
});
