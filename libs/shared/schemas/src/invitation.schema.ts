import { z } from 'zod';
import { roleEnum } from './user.schema.js';

export const invitationStatusEnum = z.enum(['pending', 'accepted', 'expired', 'revoked']);

// Create invitation request (reuses the structure from inviteUserSchema)
export const createInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  role: roleEnum.default('learner'),
  groupIds: z.array(z.string().uuid()).optional().default([]),
});

// List invitations query params
export const listInvitationsQuerySchema = z.object({
  status: invitationStatusEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Accept invitation request
export const acceptInvitationSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// Invitation response schema
export const invitationResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  role: roleEnum,
  status: invitationStatusEnum,
  tenantId: z.string().uuid(),
  tenantName: z.string().optional(),
  groupIds: z.array(z.string().uuid()),
  invitedBy: z
    .object({
      id: z.string().uuid(),
      fullName: z.string(),
    })
    .optional(),
  expiresAt: z.coerce.date(),
  acceptedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
});

// Public invitation info (limited data for accept page)
export const publicInvitationSchema = z.object({
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  role: roleEnum,
  tenantName: z.string(),
  expiresAt: z.coerce.date(),
  isExpired: z.boolean(),
  status: invitationStatusEnum,
});

// Type exports
export type InvitationStatus = z.infer<typeof invitationStatusEnum>;
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type ListInvitationsQuery = z.infer<typeof listInvitationsQuerySchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
export type InvitationResponse = z.infer<typeof invitationResponseSchema>;
export type PublicInvitation = z.infer<typeof publicInvitationSchema>;
