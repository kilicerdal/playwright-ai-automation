import 'dotenv/config';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { requirementSchema, type Task } from '../src/ai/contracts';
import { OfflineProvider } from '../src/ai/offline';
import { OpenAIProvider } from '../src/ai/provider';
import { runTask } from '../src/ai/pipeline';
const port = Number(process.env.SHOWCASE_PORT ?? 4174);
const origin = `http://127.0.0.1:${port}`;
const schema = z
  .object({
    task: z.enum(['plan', 'draft', 'triage', 'locator', 'impact']),
    mode: z.enum(['offline', 'live']),
    question: z.string().trim().min(1).max(6000),
  })
  .strict();
const requirements = z
  .array(requirementSchema)
  .parse(JSON.parse(await readFile('requirements/commerce.json', 'utf8')));
let busy = false;
let liveCalls = 0;
const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Frame-Options', 'DENY');
  const json = (status: number, data: unknown) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };
  if (req.headers.host !== `127.0.0.1:${port}`)
    return json(403, { error: 'Use the loopback address printed by the server' });
  if (req.url === '/api/ai/status' && req.method === 'GET')
    return json(200, {
      liveAvailable: Boolean(process.env.OPENAI_API_KEY && process.env.AI_MODEL),
      model: process.env.AI_MODEL || null,
      liveCalls,
      limit: 10,
    });
  if (req.url === '/api/ai/run' && req.method === 'POST') {
    if (
      req.headers.origin !== origin ||
      !req.headers['content-type']?.startsWith('application/json')
    )
      return json(403, { error: 'Same-origin JSON requests required' });
    if (busy) return json(429, { error: 'An AI task is already running' });
    let acquired = false;
    try {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 10000) return json(413, { error: 'Request too large' });
      }
      const parsed = schema.safeParse(JSON.parse(body));
      if (!parsed.success)
        return json(422, { error: 'Choose a task, mode, and question of 1–6000 characters' });
      if (parsed.data.mode === 'live' && (!process.env.OPENAI_API_KEY || !process.env.AI_MODEL))
        return json(503, {
          error: 'Live mode needs OPENAI_API_KEY and AI_MODEL in .env, then restart this server',
        });
      if (parsed.data.mode === 'live' && liveCalls >= 10)
        return json(429, {
          error:
            'Live task limit reached for this server session (10). Restart intentionally to reset.',
        });
      if (busy) return json(429, { error: 'An AI task is already running' });
      busy = true;
      acquired = true;
      if (parsed.data.mode === 'live') liveCalls++;
      const provider =
        parsed.data.mode === 'live'
          ? new OpenAIProvider(process.env.AI_MODEL!)
          : new OfflineProvider(requirements);
      const context = {
        requirements,
        question: parsed.data.question,
        evidence: [
          { id: 'E1', text: 'Synthetic demo incident: expected checkout 201; observed 503.' },
          { id: 'E2', text: 'Synthetic response: Service unavailable.' },
          { id: 'DOM1', text: '<button type="submit">Place demo order →</button>' },
        ],
      };
      const result = await runTask(parsed.data.task as Task, provider, context);
      json(200, {
        ...result,
        notice:
          provider.mode === 'offline'
            ? 'Authored examples; this mode does not interpret your question or call a model.'
            : 'Live model output; review before use. Draft code is never executed.',
      });
    } catch {
      json(502, {
        error:
          'Task failed validation or provider access. No output was accepted. Check model access and rerun CLI for diagnostics.',
      });
    } finally {
      if (acquired) busy = false;
    }
    return;
  }
  if (req.url?.split('?')[0] !== '/' || req.method !== 'GET')
    return json(404, { error: 'Not found' });
  try {
    const html = await readFile('showcase/index.html');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } catch {
    res.writeHead(503);
    res.end('Build the report first: npm run showcase:build');
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Quality Intelligence showcase: ${origin}`));
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => server.close(() => process.exit(0)));
