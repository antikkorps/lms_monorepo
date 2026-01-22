import { z } from 'zod';

export const createDiscussionSchema = z.object({
  lessonId: z.string().uuid(),
  content: z.string().min(1).max(10000),
});

export const listDiscussionsQuerySchema = z.object({
  lessonId: z.string().uuid(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const createReplySchema = z.object({
  content: z.string().min(1).max(10000),
});

export const reportSchema = z.object({
  reason: z.enum(['spam', 'inappropriate', 'harassment', 'off_topic', 'other']),
  description: z.string().max(1000).optional(),
});

export const deleteDiscussionSchema = z.object({
  reason: z.string().max(500).optional(),
});

export type CreateDiscussionInput = z.infer<typeof createDiscussionSchema>;
export type ListDiscussionsQuery = z.infer<typeof listDiscussionsQuerySchema>;
export type CreateReplyInput = z.infer<typeof createReplySchema>;
export type ReportInput = z.infer<typeof reportSchema>;
export type DeleteDiscussionInput = z.infer<typeof deleteDiscussionSchema>;
