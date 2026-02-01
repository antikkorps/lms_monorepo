import crypto from 'node:crypto';
import { Op } from 'sequelize';
import { sequelize } from '../database/sequelize.js';
import { Invitation, InvitationGroup } from '../database/models/Invitation.js';
import { User } from '../database/models/User.js';
import { Tenant } from '../database/models/Tenant.js';
import { Group, UserGroup } from '../database/models/Group.js';
import { UserRole, UserStatus, InvitationStatus, SupportedLocale } from '../database/models/enums.js';
import { hashPassword, validatePasswordStrength } from '../auth/password.js';
import { AppError } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { emailService } from '../services/email/index.js';

const INVITATION_EXPIRY_DAYS = 7;

// Input types (matching @shared/schemas)
export interface CreateInvitationInput {
  email: string;
  firstName: string;
  lastName: string;
  role?: 'super_admin' | 'tenant_admin' | 'manager' | 'instructor' | 'learner';
  groupIds?: string[];
}

export interface ListInvitationsQuery {
  status?: 'pending' | 'accepted' | 'expired' | 'revoked';
  page: number;
  limit: number;
}

function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function calculateExpiryDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + INVITATION_EXPIRY_DAYS);
  return date;
}

export interface InvitationServiceContext {
  userId: string;
  tenantId: string;
  role: UserRole;
}

export async function createInvitation(
  ctx: InvitationServiceContext,
  input: CreateInvitationInput
): Promise<Invitation> {
  const { userId, tenantId, role } = ctx;
  const { email, firstName, lastName, role: inputRole = 'learner', groupIds = [] } = input;
  const invitedRole = inputRole as UserRole;

  // Validate tenant exists and has available seats
  const tenant = await Tenant.findByPk(tenantId);
  if (!tenant) {
    throw new AppError('Tenant not found', 404, 'TENANT_NOT_FOUND');
  }

  if (tenant.seatsUsed >= tenant.seatsPurchased) {
    throw new AppError('No available seats in this organization', 403, 'NO_SEATS_AVAILABLE');
  }

  // Check if user already exists with this email
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new AppError('A user with this email already exists', 409, 'EMAIL_EXISTS');
  }

  // Check for existing pending invitation
  const existingInvitation = await Invitation.findOne({
    where: {
      tenantId,
      email,
      status: InvitationStatus.PENDING,
    },
  });

  if (existingInvitation) {
    throw new AppError(
      'A pending invitation already exists for this email',
      409,
      'INVITATION_EXISTS'
    );
  }

  // Validate role permissions
  if (role === UserRole.MANAGER) {
    if (invitedRole !== UserRole.LEARNER) {
      throw new AppError('Managers can only invite learners', 403, 'FORBIDDEN', {
        allowedRoles: [UserRole.LEARNER],
      });
    }

    if (groupIds.length === 0) {
      throw new AppError(
        'Managers must specify at least one group for the invitation',
        400,
        'GROUPS_REQUIRED'
      );
    }

    // Validate groups belong to tenant
    const groups = await Group.findAll({
      where: {
        id: { [Op.in]: groupIds },
        tenantId,
      },
    });

    if (groups.length !== groupIds.length) {
      throw new AppError('One or more groups not found or not accessible', 403, 'INVALID_GROUPS');
    }
  }

  if (role === UserRole.TENANT_ADMIN) {
    if (invitedRole === UserRole.SUPER_ADMIN) {
      throw new AppError('Cannot invite SuperAdmin users', 403, 'FORBIDDEN');
    }

    if (groupIds.length > 0) {
      const groups = await Group.findAll({
        where: {
          id: { [Op.in]: groupIds },
          tenantId,
        },
      });

      if (groups.length !== groupIds.length) {
        throw new AppError('One or more groups not found in this tenant', 400, 'INVALID_GROUPS');
      }
    }
  }

  // Create invitation in transaction
  const invitation = await sequelize.transaction(async (t) => {
    const newInvitation = await Invitation.create(
      {
        tenantId,
        email,
        firstName,
        lastName,
        role: invitedRole,
        token: generateInvitationToken(),
        status: InvitationStatus.PENDING,
        invitedById: userId,
        expiresAt: calculateExpiryDate(),
      },
      { transaction: t }
    );

    if (groupIds.length > 0) {
      await InvitationGroup.bulkCreate(
        groupIds.map((groupId) => ({
          invitationId: newInvitation.id,
          groupId,
        })),
        { transaction: t }
      );
    }

    return newInvitation;
  });

  await sendInvitationEmail(invitation, tenant);

  logger.info(
    { invitationId: invitation.id, email, tenantId, invitedById: userId },
    'Invitation created'
  );

  return invitation;
}

export async function listInvitations(
  tenantId: string,
  query: ListInvitationsQuery
): Promise<{ invitations: Invitation[]; total: number }> {
  const { status, page, limit } = query;
  const offset = (page - 1) * limit;

  const where: Record<string, unknown> = { tenantId };
  if (status) {
    where.status = status;
  }

  const { rows: invitations, count: total } = await Invitation.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'invitedBy',
        attributes: ['id', 'firstName', 'lastName'],
      },
      {
        model: Group,
        as: 'groups',
        attributes: ['id', 'name'],
        through: { attributes: [] },
      },
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  return { invitations, total };
}

export async function getInvitationByToken(token: string): Promise<Invitation> {
  const invitation = await Invitation.findOne({
    where: { token },
    include: [
      {
        model: Tenant,
        as: 'tenant',
        attributes: ['id', 'name', 'slug'],
      },
    ],
  });

  if (!invitation) {
    throw new AppError('Invitation not found', 404, 'INVITATION_NOT_FOUND');
  }

  return invitation;
}

export async function acceptInvitation(
  token: string,
  password: string
): Promise<{ user: User; invitation: Invitation }> {
  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.valid) {
    throw new AppError('Password does not meet requirements', 400, 'WEAK_PASSWORD', {
      errors: passwordValidation.errors,
    });
  }

  const invitation = await Invitation.findOne({
    where: { token },
    include: [
      { model: Tenant, as: 'tenant' },
      { model: Group, as: 'groups', through: { attributes: [] } },
    ],
  });

  if (!invitation) {
    throw new AppError('Invitation not found', 404, 'INVITATION_NOT_FOUND');
  }

  if (invitation.status !== InvitationStatus.PENDING) {
    throw new AppError(`Invitation has already been ${invitation.status}`, 400, 'INVITATION_INVALID', {
      status: invitation.status,
    });
  }

  if (new Date() > invitation.expiresAt) {
    await invitation.update({ status: InvitationStatus.EXPIRED });
    throw new AppError('Invitation has expired', 400, 'INVITATION_EXPIRED');
  }

  const tenant = invitation.tenant!;
  if (tenant.seatsUsed >= tenant.seatsPurchased) {
    throw new AppError('No available seats in this organization', 403, 'NO_SEATS_AVAILABLE');
  }

  const existingUser = await User.findOne({ where: { email: invitation.email } });
  if (existingUser) {
    throw new AppError('A user with this email already exists', 409, 'EMAIL_EXISTS');
  }

  const result = await sequelize.transaction(async (t) => {
    const passwordHash = await hashPassword(password);

    const user = await User.create(
      {
        email: invitation.email,
        passwordHash,
        firstName: invitation.firstName,
        lastName: invitation.lastName,
        role: invitation.role,
        status: UserStatus.ACTIVE,
        tenantId: invitation.tenantId,
      },
      { transaction: t }
    );

    const groupIds = invitation.groups?.map((g) => g.id) || [];
    if (groupIds.length > 0) {
      await UserGroup.bulkCreate(
        groupIds.map((groupId) => ({
          userId: user.id,
          groupId,
        })),
        { transaction: t }
      );
    }

    await invitation.update(
      {
        status: InvitationStatus.ACCEPTED,
        acceptedById: user.id,
        acceptedAt: new Date(),
      },
      { transaction: t }
    );

    await Tenant.increment('seatsUsed', {
      where: { id: invitation.tenantId },
      transaction: t,
    });

    return { user, invitation };
  });

  logger.info(
    {
      invitationId: invitation.id,
      userId: result.user.id,
      email: invitation.email,
      tenantId: invitation.tenantId,
    },
    'Invitation accepted, user created'
  );

  return result;
}

export async function revokeInvitation(tenantId: string, invitationId: string): Promise<Invitation> {
  const invitation = await Invitation.findOne({
    where: { id: invitationId, tenantId },
  });

  if (!invitation) {
    throw new AppError('Invitation not found', 404, 'INVITATION_NOT_FOUND');
  }

  if (invitation.status !== InvitationStatus.PENDING) {
    throw new AppError(`Cannot revoke invitation with status: ${invitation.status}`, 400, 'INVITATION_INVALID');
  }

  await invitation.update({ status: InvitationStatus.REVOKED });

  logger.info({ invitationId, tenantId }, 'Invitation revoked');

  return invitation;
}

export async function resendInvitation(tenantId: string, invitationId: string): Promise<Invitation> {
  const invitation = await Invitation.findOne({
    where: { id: invitationId, tenantId },
    include: [{ model: Tenant, as: 'tenant' }],
  });

  if (!invitation) {
    throw new AppError('Invitation not found', 404, 'INVITATION_NOT_FOUND');
  }

  if (invitation.status !== InvitationStatus.PENDING) {
    throw new AppError(`Cannot resend invitation with status: ${invitation.status}`, 400, 'INVITATION_INVALID');
  }

  await invitation.update({
    token: generateInvitationToken(),
    expiresAt: calculateExpiryDate(),
  });

  await sendInvitationEmail(invitation, invitation.tenant!);

  logger.info({ invitationId, tenantId }, 'Invitation resent');

  return invitation;
}

async function sendInvitationEmail(
  invitation: Invitation,
  tenant: Tenant,
  inviterName?: string
): Promise<void> {
  const inviteUrl = `${config.frontendUrl}/accept-invitation?token=${invitation.token}`;

  // Get inviter info (name and locale) if not provided
  let inviter = inviterName;
  let locale: SupportedLocale = SupportedLocale.EN;

  const inviterUser = await User.findByPk(invitation.invitedById, {
    attributes: ['firstName', 'lastName', 'locale'],
  });

  if (inviterUser) {
    if (!inviter) {
      inviter = `${inviterUser.firstName} ${inviterUser.lastName}`;
    }
    // Use inviter's locale for the invitation email
    locale = inviterUser.locale || SupportedLocale.EN;
  } else if (!inviter) {
    inviter = tenant.name;
  }

  await emailService.sendInvitationEmail({
    to: invitation.email,
    firstName: invitation.firstName,
    tenantName: tenant.name,
    inviterName: inviter,
    inviteUrl,
    role: invitation.role,
    locale,
  });
}
