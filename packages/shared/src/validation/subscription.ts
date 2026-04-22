import { z } from 'zod';

export const CreateSubscriptionSchema = z.object({
  publication_id: z
    .string()
    .uuid('publication_id must be a valid UUID'),
  type: z.literal('free'),
});

export const CreatePaidSubscriptionSchema = z.object({
  publication_id: z
    .string()
    .uuid('publication_id must be a valid UUID'),
  type: z.literal('paid'),
  /** Billing period selected by the subscriber */
  billing_period: z.enum(['monthly', 'yearly']),
  /** Payment token from the processor (e.g. CloudPayments cryptogram) */
  payment_token: z
    .string()
    .min(1, 'Payment token is required'),
});

export type CreateSubscriptionInput = z.infer<typeof CreateSubscriptionSchema>;
export type CreatePaidSubscriptionInput = z.infer<typeof CreatePaidSubscriptionSchema>;
