import { spawnSync } from 'node:child_process';
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createConnection } from 'node:net';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, firefox, webkit } from '@playwright/test';

export interface Check {
  name: string;
  ok: boolean;
  detail: string;
}
export interface Inspection {
  nodeVersion: string;
  binaryVersion: (name: string) => string | undefined;
  browserInstalled: (name: string) => Promise<boolean>;
  portAvailable: (port: number) => Promise<boolean>;
}

export async function inspectPrerequisites(inspection: Inspection): Promise<Check[]> {
  const checks: Check[] = [
    {
      name: 'Node.js',
      ok: Number(inspection.nodeVersion.split('.')[0]) >= 22,
      detail: `Found ${inspection.nodeVersion}; requires 22+`,
    },
  ];
  for (const binary of ['npm', 'initdb', 'pg_ctl', 'psql']) {
    const version = inspection.binaryVersion(binary);
    checks.push({
      name: binary,
      ok: !!version,
      detail:
        version ?? `Missing ${binary}; install prerequisites or set PG_BIN_DIR for PostgreSQL`,
    });
  }
  for (const browser of ['chromium', 'firefox', 'webkit']) {
    const installed = await inspection.browserInstalled(browser);
    checks.push({
      name: browser,
      ok: installed,
      detail: installed
        ? 'Matching browser executable found'
        : `Run npx playwright install ${browser}`,
    });
  }
  for (const port of [4173, 4174, 4175, 55432]) {
    const available = await inspection.portAvailable(port);
    checks.push({
      name: `127.0.0.1:${port}`,
      ok: available,
      detail: available
        ? 'No listener detected'
        : 'Occupied or unverified; inspect the existing service yourself before startup',
    });
  }
  return checks;
}

export function portAvailable(port: number): Promise<boolean> {
  return new Promise((resolveResult) => {
    const socket = createConnection({ host: '127.0.0.1', port });
    const finish = (available: boolean) => {
      socket.destroy();
      resolveResult(available);
    };
    socket.once('connect', () => finish(false));
    socket.once('error', (error: NodeJS.ErrnoException) => finish(error.code === 'ECONNREFUSED'));
    socket.setTimeout(1000, () => finish(false));
  });
}

async function main() {
  const browsers = { chromium, firefox, webkit };
  const checks = await inspectPrerequisites({
    nodeVersion: process.versions.node,
    binaryVersion(name) {
      const executable =
        name !== 'npm' && process.env.PG_BIN_DIR ? join(process.env.PG_BIN_DIR, name) : name;
      const npmScript = name === 'npm' ? process.env.npm_execpath : undefined;
      const result = spawnSync(
        npmScript ? process.execPath : executable,
        npmScript ? [npmScript, '--version'] : ['--version'],
        {
          encoding: 'utf8',
          timeout: 5000,
          shell: false,
        },
      );
      if (result.error || result.status !== 0) return undefined;
      return result.stdout.trim().split('\n')[0];
    },
    async browserInstalled(name) {
      try {
        await access(browsers[name as keyof typeof browsers].executablePath(), constants.X_OK);
        return true;
      } catch {
        return false;
      }
    },
    portAvailable,
  });
  for (const check of checks)
    console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}: ${check.detail}`);
  console.log(
    'Inspection only: no installation, database connection, model call or service lifecycle changes. Port availability can change after this check.',
  );
  process.exitCode = checks.every((check) => check.ok) ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  main().catch(() => {
    console.error('Prerequisite inspection failed; no services were changed.');
    process.exitCode = 1;
  });
