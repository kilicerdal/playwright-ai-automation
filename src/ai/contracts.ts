import { z } from 'zod';
export const requirementSchema = z.object({ id: z.string(), text: z.string() }).strict();
export type Requirement = z.infer<typeof requirementSchema>;
export const planSchema = z
  .object({
    summary: z.string(),
    scenarios: z.array(
      z
        .object({
          id: z.string(),
          requirementId: z.string(),
          title: z.string(),
          kind: z.enum(['positive', 'negative', 'boundary', 'security']),
          priority: z.enum(['P0', 'P1', 'P2']),
          steps: z.array(z.string()),
          expected: z.string(),
        })
        .strict(),
    ),
    risks: z.array(z.string()),
  })
  .strict();
export const draftSchema = z
  .object({
    title: z.string(),
    requirementIds: z.array(z.string()),
    code: z.string(),
    reviewNotes: z.array(z.string()),
  })
  .strict();
export const triageSchema = z
  .object({
    category: z.enum(['application', 'test', 'environment', 'unknown']),
    summary: z.string(),
    evidenceIds: z.array(z.string()),
    hypotheses: z.array(
      z
        .object({
          cause: z.string(),
          confidence: z.enum(['low', 'medium', 'high']),
          nextCheck: z.string(),
        })
        .strict(),
    ),
    suggestedFix: z.string(),
  })
  .strict();
export const locatorSchema = z
  .object({
    candidates: z.array(
      z.object({ expression: z.string(), evidenceId: z.string(), reason: z.string() }).strict(),
    ),
    requiresReview: z.boolean(),
  })
  .strict();
export const impactSchema = z
  .object({
    selectedRequirements: z.array(z.string()),
    rationale: z.string(),
    runFullSuite: z.boolean(),
  })
  .strict();
export const schemas = {
  plan: planSchema,
  draft: draftSchema,
  triage: triageSchema,
  locator: locatorSchema,
  impact: impactSchema,
};
export type Task = keyof typeof schemas;
export type Plan = z.infer<typeof planSchema>;
export type Evidence = { id: string; text: string };
