# Setup and maintenance

## Local services

- Commerce: `npm run demo:app` → http://127.0.0.1:4173
- Report/Studio: `npm run showcase` → http://127.0.0.1:4174
- Use the printed 127.0.0.1 address. Studio Host/Origin checks intentionally reject other hostnames.
- Stop either foreground process with Ctrl-C. Playwright starts/stops its test servers automatically.
- Existing local servers may be reused outside CI; stop stale servers after changing service code.

## First run

Use Node 22+, `npm ci`, then install the three browser engines. Run `npm run verify`. Open the showcase only after its build step completes. Offline runs need no external credentials.

## AI setup

Copy `.env.example` to `.env`, set the API key and exact accessible model ID, and restart the Studio. The key stays server-side. `npm run ai:live` produces the five-task artifact; Studio runs one selected task in memory. Its result is displayed without overwriting the saved dashboard snapshot. Use the CLI and rebuild to persist a new five-task report.

The Studio limits live tasks to ten per process and one active task at a time. Each task permits one repair; the SDK has no automatic retries. These are call limits, not hard currency budgets. Configure provider-project spend controls separately.

## Diagnosing failures

- **Port occupied:** stop the old demo/Studio process; check port 4173/4174. `SHOWCASE_PORT` can change the Studio's port.
- **Missing browser:** rerun `npx playwright install chromium firefox webkit`.
- **Corrupt cached browser:** reinstall that engine using `npx playwright install --force firefox` (or the affected engine).
- **Sandbox socket errors:** run the commands in a normal local terminal with permission to start loopback servers.
- **Model error:** verify credentials, project model access and output limits. Refusal/incomplete output is rejected, not marked successful.
- **AI schema/semantic error:** inspect CLI output and adjust the prompt/requirement context. Never bypass the gate to get a green demo.
- **Stale counts:** focused suites replace the snapshot; run `npm test`, then `npm run showcase:build`.
- **Screenshot mismatch:** inspect expected/actual/diff images. Update only after confirming the intended design on the same platform.

## Container recipe

```bash
docker build -t eai-quality .
docker run --rm --ipc=host eai-quality
```

The Docker image is pinned to the Playwright package's browser version. Keep both aligned when upgrading. The container runs the full verification command. Do not copy `.env` into the image; `.dockerignore` excludes it. The recipe requires execution on a Docker-enabled host before claiming a verified container build.

## Dependency and evidence care

Use `npm audit --audit-level=moderate`; review dependency updates and rerun verification. The minimatch override applies only to typescript-estree's vulnerable dependency range and should be reviewed when upstream updates it. Do not commit private reports, session cookies, API keys or provider input. Generated artifacts are ignored by default; review contents before sharing. CI retains artifacts for 14 days; configure organization policies as needed.

## macOS Firefox application-data isolation

The pinned Firefox build can fail at startup on macOS when the real Firefox application-data directory is protected. On macOS only, the configuration gives the test browser a separate `CFFIXED_USER_HOME` under ignored `artifacts/firefox-app-home`. This does not change the system HOME or privacy permissions. The workaround was verified locally. Review it when upgrading beyond the affected build. See [Playwright issue 42768](https://github.com/microsoft/playwright/issues/42768).
