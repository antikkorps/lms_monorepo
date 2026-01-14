import { z } from 'zod';

export const tenantStatusEnum = z.enum(['active', 'trial', 'suspended', 'cancelled']);

export const isolationStrategyEnum = z.enum(['SHARED', 'ISOLATED']);

export const subscriptionStatusEnum = z.enum([
  'active',
  'past_due',
  'cancelled',
  'trialing',
]);

export const tenantSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  status: tenantStatusEnum,
  isolationStrategy: isolationStrategyEnum,
  connectionString: z.string().nullable(),
  seatsPurchased: z.number().int().nonnegative(),
  seatsUsed: z.number().int().nonnegative(),
  subscriptionStatus: subscriptionStatusEnum,
  stripeCustomerId: z.string().nullable(),
  stripeSubscriptionId: z.string().nullable(),
  logoUrl: z.string().url().nullable(),
  domain: z.string().nullable(),
  settings: z.record(z.unknown()).default({}),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createTenantSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  seatsPurchased: z.number().int().positive().default(1),
  logoUrl: z.string().url().optional(),
  domain: z.string().optional(),
});

export const updateTenantSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  logoUrl: z.string().url().nullable().optional(),
  domain: z.string().nullable().optional(),
  settings: z.record(z.unknown()).optional(),
});

export const groupSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createGroupSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
});

export const updateGroupSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
});

// Type exports
export type TenantStatus = z.infer<typeof tenantStatusEnum>;
export type IsolationStrategy = z.infer<typeof isolationStrategyEnum>;
export type SubscriptionStatus = z.infer<typeof subscriptionStatusEnum>;
export type Tenant = z.infer<typeof tenantSchema>;
export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
export type Group = z.infer<typeof groupSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
