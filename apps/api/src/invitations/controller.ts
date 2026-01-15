import type { Context } from 'koa';
import { z } from 'zod';
import {
  createInvitation as createInvitationService,
  listInvitations as listInvitationsService,
  getInvitationByToken,
  acceptInvitation as acceptInvitationService,
  revokeInvitation as revokeInvitationService,
  resendInvitation as resendInvitationService,
} from './service.js';
import { AppError } from '../utils/app-error.js';

// Validation schemas
const roleEnum = z.enum(['super_admin', 'tenant_admin', 'manager', 'instructor', 'learner']);
const invitationStatusEnum = z.enum(['pending', 'accepted', 'expired', 'revoked']);

const createInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  role: roleEnum.default('learner'),
  groupIds: z.array(z.string().uuid()).optional().default([]),
});

const listInvitationsQuerySchema = z.object({
  status: invitationStatusEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

const acceptInvitationSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function createInvitation(ctx: Context): Promise<void> {
  const user = ctx.state.user;
  if (!user?.tenantId) {
    throw new AppError('Tenant context required', 403, 'TENANT_REQUIRED');
  }

  const input = createInvitationSchema.parse(ctx.request.body);

  const invitation = await createInvitationService(
    {
      userId: user.userId,
      tenantId: user.tenantId,
      role: user.role,
    },
    input
  );

  ctx.status = 201;
  ctx.body = {
    success: true,
    data: {
      id: invitation.id,
      email: invitation.email,
      firstName: invitation.firstName,
      lastName: invitation.lastName,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
    },
  };
}

export async function listInvitations(ctx: Context): Promise<void> {
  const user = ctx.state.user;
  if (!user?.tenantId) {
    throw new AppError('Tenant context required', 403, 'TENANT_REQUIRED');
  }

  const query = listInvitationsQuerySchema.parse(ctx.query);
  const { invitations, total } = await listInvitationsService(user.tenantId, query);

  ctx.body = {
    success: true,
    data: invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      firstName: inv.firstName,
      lastName: inv.lastName,
      fullName: inv.fullName,
      role: inv.role,
      status: inv.status,
      invitedBy: inv.invitedBy
        ? {
            id: inv.invitedBy.id,
            fullName: `${inv.invitedBy.firstName} ${inv.invitedBy.lastName}`,
          }
        : null,
      groups: inv.groups?.map((g) => ({ id: g.id, name: g.name })) || [],
      expiresAt: inv.expiresAt,
      acceptedAt: inv.acceptedAt,
      createdAt: inv.createdAt,
    })),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function getInvitation(ctx: Context): Promise<void> {
  const { token } = ctx.params;

  if (!token || token.length !== 64) {
    throw new AppError('Invalid invitation token', 400, 'INVALID_TOKEN');
  }

  const invitation = await getInvitationByToken(token);
  const isExpired = invitation.status === 'pending' && new Date() > invitation.expiresAt;

  ctx.body = {
    success: true,
    data: {
      email: invitation.email,
      firstName: invitation.firstName,
      lastName: invitation.lastName,
      role: invitation.role,
      tenantName: invitation.tenant?.name || 'Unknown',
      expiresAt: invitation.expiresAt,
      isExpired,
      status: isExpired ? 'expired' : invitation.status,
    },
  };
}

export async function acceptInvitation(ctx: Context): Promise<void> {
  const { token } = ctx.params;

  if (!token || token.length !== 64) {
    throw new AppError('Invalid invitation token', 400, 'INVALID_TOKEN');
  }

  const input = acceptInvitationSchema.parse(ctx.request.body);
  const { user } = await acceptInvitationService(token, input.password);

  ctx.status = 201;
  ctx.body = {
    success: true,
    data: {
      message: 'Account created successfully. You can now log in.',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
      },
    },
  };
}

export async function deleteInvitation(ctx: Context): Promise<void> {
  const user = ctx.state.user;
  if (!user?.tenantId) {
    throw new AppError('Tenant context required', 403, 'TENANT_REQUIRED');
  }

  const { id } = ctx.params;
  await revokeInvitationService(user.tenantId, id);

  ctx.body = {
    success: true,
    data: {
      message: 'Invitation revoked successfully',
    },
  };
}

export async function resendInvitation(ctx: Context): Promise<void> {
  const user = ctx.state.user;
  if (!user?.tenantId) {
    throw new AppError('Tenant context required', 403, 'TENANT_REQUIRED');
  }

  const { id } = ctx.params;
  const invitation = await resendInvitationService(user.tenantId, id);

  ctx.body = {
    success: true,
    data: {
      message: 'Invitation resent successfully',
      expiresAt: invitation.expiresAt,
    },
  };
}
