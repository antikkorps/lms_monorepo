import { z } from 'zod';
import { sanitizeText } from '../utils/sanitize.js';

export const createReviewSchema = z.object({
  courseId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(1).max(255).optional().transform((v) => v ? sanitizeText(v) : v),
  comment: z.string().min(1).max(5000).optional().transform((v) => v ? sanitizeText(v) : v),
});

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().min(1).max(255).nullable().optional().transform((v) => v ? sanitizeText(v) : v),
  comment: z.string().min(1).max(5000).nullable().optional().transform((v) => v ? sanitizeText(v) : v),
});

export const listReviewsQuerySchema = z.object({
  courseId: z.string().uuid(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const listPendingReviewsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const moderateReviewSchema = z.object({
  action: z.enum(['approve', 'reject']),
  note: z.string().max(1000).optional().transform((v) => v ? sanitizeText(v) : v),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
export type ListReviewsQuery = z.infer<typeof listReviewsQuerySchema>;
export type ListPendingReviewsQuery = z.infer<typeof listPendingReviewsQuerySchema>;
export type ModerateReviewInput = z.infer<typeof moderateReviewSchema>;
