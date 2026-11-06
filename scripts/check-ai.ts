import 'dotenv/config';
import OpenAI from 'openai';
import { redact } from '../src/ai/guardrails';
if (!process.env.OPENAI_API_KEY) {
  console.error('Set OPENAI_API_KEY in the ignored local .env file.');
  process.exitCode = 1;
} else {
  try {
    const result = await new OpenAI({ timeout: 20000, maxRetries: 0 }).models.list();
    console.log(
      JSON.stringify(
        {
          authenticated: true,
          configuredModel: process.env.AI_MODEL || null,
          models: result.data
            .map((model) => model.id)
            .filter((id) => id.startsWith('gpt-'))
            .sort(),
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(redact(error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
  }
}
