import { z } from 'zod';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const CreatePublicationSchema = z.object({
  name: z
    .string()
    .min(1, 'Publication name is required')
    .max(100, 'Publication name must not exceed 100 characters')
    .trim(),
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .max(60, 'Slug must not exceed 60 characters')
    .regex(slugRegex, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z
    .string()
    .max(2000, 'Description must not exceed 2000 characters')
    .default(''),
  avatar_url: z.string().url('Invalid avatar URL').nullable().default(null),
  custom_domain: z
    .string()
    .max(253, 'Domain must not exceed 253 characters')
    .regex(/^[a-z0-9.-]+$/, 'Invalid domain format')
    .nullable()
    .default(null),
  paid_enabled: z.boolean().default(false),
  paid_price_monthly: z
    .number()
    .int('Price must be an integer (kopecks)')
    .positive('Monthly price must be greater than 0')
    .optional()
    .default(0),
  paid_price_yearly: z
    .number()
    .int('Price must be an integer (kopecks)')
    .positive('Yearly price must be greater than 0')
    .nullable()
    .optional()
    .default(null),
}).superRefine((data, ctx) => {
  if (data.paid_enabled && data.paid_price_monthly <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['paid_price_monthly'],
      message: 'Monthly price must be greater than 0 when paid subscriptions are enabled',
    });
  }
});

export const UpdatePublicationSchema = z.object({
  name: z
    .string()
    .min(1, 'Publication name is required')
    .max(100, 'Publication name must not exceed 100 characters')
    .trim()
    .optional(),
  description: z
    .string()
    .max(2000, 'Description must not exceed 2000 characters')
    .optional(),
  avatar_url: z.string().url('Invalid avatar URL').nullable().optional(),
  custom_domain: z
    .string()
    .max(253, 'Domain must not exceed 253 characters')
    .regex(/^[a-z0-9.-]+$/, 'Invalid domain format')
    .nullable()
    .optional(),
  paid_enabled: z.boolean().optional(),
  paid_price_monthly: z
    .number()
    .int('Price must be an integer (kopecks)')
    .positive('Monthly price must be greater than 0')
    .optional(),
  paid_price_yearly: z
    .number()
    .int('Price must be an integer (kopecks)')
    .positive('Yearly price must be greater than 0')
    .nullable()
    .optional(),
});

export type CreatePublicationInput = z.infer<typeof CreatePublicationSchema>;
export type UpdatePublicationInput = z.infer<typeof UpdatePublicationSchema>;
