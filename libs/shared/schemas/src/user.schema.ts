import { z } from 'zod';

export const roleEnum = z.enum([
  'super_admin',
  'tenant_admin',
  'manager',
  'instructor',
  'learner',
]);

export const userStatusEnum = z.enum(['active', 'inactive', 'suspended', 'pending']);

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  role: roleEnum,
  status: userStatusEnum,
  tenantId: z.string().uuid().nullable(),
  avatarUrl: z.string().url().nullable(),
  lastLoginAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: roleEnum.default('learner'),
  tenantId: z.string().uuid().optional(),
  password: z.string().min(8).optional(),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  status: userStatusEnum.optional(),
});

export const inviteUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: roleEnum.default('learner'),
  groupIds: z.array(z.string().uuid()).optional(),
});

// Type exports
export type Role = z.infer<typeof roleEnum>;
export type UserStatus = z.infer<typeof userStatusEnum>;
export type User = z.infer<typeof userSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type InviteUserInput = z.infer<typeof inviteUserSchema>;
