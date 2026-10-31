import { z } from 'zod';

/** GBP amount, rounded to pence. */
export const amountSchema = z.coerce
  .number()
  .positive()
  .max(1_000_000)
  .transform((v) => Math.round(v * 100) / 100);

export const idSchema = z.coerce.number().int().positive();
