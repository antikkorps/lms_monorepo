import Router from '@koa/router';
import {
  createInvitation,
  listInvitations,
  getInvitation,
  acceptInvitation,
  deleteInvitation,
  resendInvitation,
} from './controller.js';
import { authenticate, requireRole, requireTenant } from '../auth/index.js';
import { authRateLimiter } from '../middlewares/index.js';
import { UserRole } from '../database/models/enums.js';

export const invitationRouter = new Router({ prefix: '/invitations' });

// Protected routes (require authentication + tenant + role)
invitationRouter.post(
  '/',
  authenticate,
  requireTenant,
  requireRole(UserRole.TENANT_ADMIN, UserRole.MANAGER),
  createInvitation
);

invitationRouter.get(
  '/',
  authenticate,
  requireTenant,
  requireRole(UserRole.TENANT_ADMIN, UserRole.MANAGER),
  listInvitations
);

invitationRouter.delete(
  '/:id',
  authenticate,
  requireTenant,
  requireRole(UserRole.TENANT_ADMIN, UserRole.MANAGER),
  deleteInvitation
);

invitationRouter.post(
  '/:id/resend',
  authenticate,
  requireTenant,
  requireRole(UserRole.TENANT_ADMIN, UserRole.MANAGER),
  resendInvitation
);

// Public routes (with rate limiting)
invitationRouter.get('/:token', authRateLimiter, getInvitation);
invitationRouter.post('/:token/accept', authRateLimiter, acceptInvitation);
