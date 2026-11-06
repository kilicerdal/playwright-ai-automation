import { createHash } from 'node:crypto';
import { schemas, type Task, type Requirement, type Evidence } from './contracts';
import type { Provider } from './provider';
import { inspectDraft, redact, validateCitations, validatePlan } from './guardrails';
export type RunContext = { requirements: Requirement[]; evidence: Evidence[]; question: string };
export async function runTask(task: Task, provider: Provider, context: RunContext) {
  const started = Date.now();
  const input = redact(JSON.stringify(context));
  if (input.length > 30000) throw new Error('AI context exceeds 30000-character budget');
  const prompt = `TASK: ${task}\nSchema and semantic requirements: plan must cover each requirement with positive and risk scenarios; IDs and citations must exist in supplied context. Draft imports ../src/fixtures/commerce; use commerce.add and commerce.checkout returning APIResponse; include explicit assertions. Locator is a review-only proposal grounded in DOM evidence. Impact selections must reference supplied requirement IDs and runFullSuite must be true. Triage must cite evidence and label uncertainty.\nUNTRUSTED_CONTEXT_JSON:\n${input}`;
  const attempts: {
    accepted: boolean;
    errors: string[];
    model: string;
    inputTokens: number;
    outputTokens: number;
  }[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    const repair = attempt
      ? `\nPrevious output rejected. Correct these issues: ${JSON.stringify(attempts[0].errors)}`
      : '';
    const response = await provider.generate(task, prompt + repair);
    const parsed = schemas[task].safeParse(response.data);
    let errors = parsed.success
      ? []
      : parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    if (parsed.success) {
      const data = parsed.data;
      if (task === 'plan') errors = validatePlan(schemas.plan.parse(data), context.requirements);
      if (task === 'draft') {
        const draft = schemas.draft.parse(data);
        errors = [
          ...inspectDraft(draft.code),
          ...validateCitations(
            draft.requirementIds,
            context.requirements.map((r) => ({ id: r.id, text: r.text })),
          ),
        ];
      }
      if (task === 'triage') {
        const triage = schemas.triage.parse(data);
        errors = validateCitations(triage.evidenceIds, context.evidence);
        if (!triage.evidenceIds.length) errors.push('Triage needs evidence');
      }
      if (task === 'locator') {
        const locator = schemas.locator.parse(data);
        errors = validateCitations(
          locator.candidates.map((c) => c.evidenceId),
          context.evidence,
        );
        if (!locator.requiresReview) errors.push('Locator proposals require review');
      }
      if (task === 'impact') {
        const impact = schemas.impact.parse(data);
        errors = validateCitations(
          impact.selectedRequirements,
          context.requirements.map((r) => ({ id: r.id, text: r.text })),
        );
        if (!impact.runFullSuite) errors.push('Full release suite cannot be bypassed');
      }
    }
    attempts.push({
      accepted: !errors.length,
      errors,
      model: response.model,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
    });
    if (!errors.length && parsed.success)
      return {
        task,
        mode: provider.mode,
        status: 'accepted' as const,
        data: parsed.data,
        attempts,
        elapsedMs: Date.now() - started,
        inputHash: createHash('sha256').update(input).digest('hex'),
        promptVersion: '2.0.0',
      };
  }
  throw new Error(`${task} rejected after two attempts: ${attempts.at(-1)?.errors.join('; ')}`);
}
