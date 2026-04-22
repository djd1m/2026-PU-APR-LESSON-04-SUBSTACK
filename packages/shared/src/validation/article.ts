import { z } from 'zod';
import { MAX_ARTICLE_SIZE_BYTES } from '../constants.js';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const CreateArticleSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(300, 'Title must not exceed 300 characters')
    .trim(),
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .max(200, 'Slug must not exceed 200 characters')
    .regex(slugRegex, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  content_markdown: z
    .string()
    .max(MAX_ARTICLE_SIZE_BYTES, `Article content must not exceed ${MAX_ARTICLE_SIZE_BYTES} bytes`)
    .default(''),
  cover_image_url: z.string().url('Invalid cover image URL').nullable().default(null),
  visibility: z.enum(['free', 'paid']).default('free'),
  status: z.enum(['draft', 'scheduled', 'published']).default('draft'),
  scheduled_at: z.coerce.date().nullable().default(null),
  seo_title: z
    .string()
    .max(70, 'SEO title must not exceed 70 characters')
    .nullable()
    .default(null),
  seo_description: z
    .string()
    .max(160, 'SEO description must not exceed 160 characters')
    .nullable()
    .default(null),
}).superRefine((data, ctx) => {
  if (data.status === 'scheduled' && data.scheduled_at === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['scheduled_at'],
      message: 'scheduled_at is required when status is "scheduled"',
    });
  }
  if (
    data.status === 'scheduled' &&
    data.scheduled_at !== null &&
    data.scheduled_at <= new Date()
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['scheduled_at'],
      message: 'scheduled_at must be a future date',
    });
  }
});

export const UpdateArticleSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(300, 'Title must not exceed 300 characters')
    .trim()
    .optional(),
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .max(200, 'Slug must not exceed 200 characters')
    .regex(slugRegex, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
  content_markdown: z
    .string()
    .max(MAX_ARTICLE_SIZE_BYTES, `Article content must not exceed ${MAX_ARTICLE_SIZE_BYTES} bytes`)
    .optional(),
  cover_image_url: z.string().url('Invalid cover image URL').nullable().optional(),
  visibility: z.enum(['free', 'paid']).optional(),
  status: z.enum(['draft', 'scheduled', 'published']).optional(),
  scheduled_at: z.coerce.date().nullable().optional(),
  seo_title: z
    .string()
    .max(70, 'SEO title must not exceed 70 characters')
    .nullable()
    .optional(),
  seo_description: z
    .string()
    .max(160, 'SEO description must not exceed 160 characters')
    .nullable()
    .optional(),
});

export type CreateArticleInput = z.infer<typeof CreateArticleSchema>;
export type UpdateArticleInput = z.infer<typeof UpdateArticleSchema>;
