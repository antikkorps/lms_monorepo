import { z } from 'zod';

export const leaderboardQuerySchema = z.object({
  metric: z.enum(['courses_completed', 'avg_quiz_score', 'current_streak', 'total_learning_time']).default('courses_completed'),
  period: z.enum(['weekly', 'monthly', 'all_time']).default('all_time'),
  scope: z.enum(['global', 'tenant', 'course']).default('global'),
  courseId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type LeaderboardQuery = z.infer<typeof leaderboardQuerySchema>;
