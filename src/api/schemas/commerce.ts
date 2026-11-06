import { z } from 'zod';
export const productSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    category: z.string(),
    price: z.number().int().nonnegative(),
    stock: z.number().int().nonnegative(),
    glyph: z.string(),
    color: z.string(),
  })
  .strict();
export const cartSchema = z
  .object({
    items: z.array(
      z
        .object({
          productId: z.string(),
          quantity: z.number().int().positive(),
          product: productSchema,
        })
        .strict(),
    ),
    total: z.number().int().nonnegative(),
    count: z.number().int().nonnegative(),
  })
  .strict();
export const orderSchema = z
  .object({
    id: z.string().uuid(),
    items: z
      .array(z.object({ productId: z.string(), quantity: z.number().int().positive() }).strict())
      .min(1),
    total: z.number().int().positive(),
    status: z.literal('confirmed'),
  })
  .strict();
