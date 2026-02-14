import { z } from 'zod';

export const analyticsQuerySchema = z.object({
  period: z.enum(['7d', '30d', '90d', '12m']).default('30d'),
});

export const exportQuerySchema = z.object({
  period: z.enum(['7d', '30d', '90d', '12m']).default('30d'),
  type: z.enum(['overview', 'revenue', 'engagement']).default('overview'),
  format: z.enum(['csv', 'pdf']).default('csv'),
});

export const courseAnalyticsParamsSchema = z.object({
  courseId: z.string().uuid(),
});

export const courseAnalyticsQuerySchema = z.object({
  period: z.enum(['7d', '30d', '90d', '12m']).default('30d'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
