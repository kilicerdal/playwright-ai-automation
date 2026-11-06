import { z } from 'zod';
import { createHash } from 'node:crypto';
const actor = z.enum(['owner', 'other']);
export const stepSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('login'), actor }).strict(),
  z.object({ action: z.literal('logout'), actor }).strict(),
  z
    .object({
      action: z.literal('add'),
      actor,
      product: z.enum(['field-notebook', 'atlas-pack', 'arc-lamp']),
      quantity: z.number().int().min(1).max(20),
    })
    .strict(),
  z.object({ action: z.literal('checkout'), actor, csrf: z.boolean().default(true) }).strict(),
  z
    .object({
      action: z.literal('transition'),
      actor,
      target: z.enum(['cancel', 'refund']),
      csrf: z.boolean().default(true),
    })
    .strict(),
  z
    .object({
      action: z.literal('inspect'),
      actor,
      resource: z.enum(['cart', 'orders', 'order', 'stock']),
    })
    .strict(),
]);
export const journeySchema = z
  .object({
    id: z.string().regex(/^J-[A-Z0-9-]+$/),
    title: z.string().min(8).max(160),
    requirement: z.enum(['LIFE-01', 'OWNER-01', 'AUTH-01', 'ORDER-02', 'STOCK-01', 'SEC-01']),
    origin: z.literal('authored-offline-example'),
    steps: z.array(stepSchema).min(2).max(30),
  })
  .strict();
export type Journey = z.infer<typeof journeySchema>;
export type Step = z.infer<typeof stepSchema>;
export function journeyHash(input: Journey) {
  return createHash('sha256')
    .update(JSON.stringify(journeySchema.parse(input)))
    .digest('hex');
}
