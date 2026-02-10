import { z } from 'zod';

export const analyticsQuerySchema = z.object({
  period: z.enum(['7d', '30d', '90d', '12m']).default('30d'),
});

export const exportQuerySchema = z.object({
  period: z.enum(['7d', '30d', '90d', '12m']).default('30d'),
  type: z.enum(['overview', 'revenue', 'engagement']).default('overview'),
});
