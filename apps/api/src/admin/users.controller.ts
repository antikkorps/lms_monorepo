import type { Context } from 'koa';
import { Op } from 'sequelize';
import { User } from '../database/models/User.js';
import { Tenant } from '../database/models/Tenant.js';
import { UserRole } from '../database/models/enums.js';
import { AppError } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';

const VALID_ROLES = Object.values(UserRole);

export async function listUsers(ctx: Context): Promise<void> {
  const page = parseInt(ctx.query.page as string) || 1;
  const limit = Math.min(parseInt(ctx.query.limit as string) || 20, 100);
  const offset = (page - 1) * limit;
  const search = (ctx.query.search as string) || '';
  const roleFilter = ctx.query.role as string;

  const where: Record<string, unknown> = {};

  if (search) {
    where[Op.or as unknown as string] = [
      { email: { [Op.iLike]: `%${search}%` } },
      { firstName: { [Op.iLike]: `%${search}%` } },
      { lastName: { [Op.iLike]: `%${search}%` } },
    ];
  }

  if (roleFilter && VALID_ROLES.includes(roleFilter as UserRole)) {
    where.role = roleFilter;
  }

  const { rows: users, count: total } = await User.findAndCountAll({
    where,
    attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'status', 'tenantId', 'createdAt', 'lastLoginAt'],
    include: [
      {
        model: Tenant,
        as: 'tenant',
        attributes: ['id', 'name'],
        required: false,
      },
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  ctx.body = {
    success: true,
    data: {
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        status: u.status,
        tenantId: u.tenantId,
        tenantName: (u as unknown as { tenant?: { name: string } }).tenant?.name || null,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  };
}

export async function updateUserRole(ctx: Context): Promise<void> {
  const adminId = ctx.state.user!.userId;
  const targetId = ctx.params.id;
  const { role } = ctx.request.body as { role: string };

  if (!role || !VALID_ROLES.includes(role as UserRole)) {
    throw AppError.badRequest(`Invalid role. Allowed: ${VALID_ROLES.join(', ')}`);
  }

  if (targetId === adminId) {
    throw AppError.badRequest('Cannot change your own role');
  }

  const user = await User.findByPk(targetId);
  if (!user) {
    throw AppError.notFound('User not found');
  }

  const previousRole = user.role;
  await user.update({ role: role as UserRole });

  logger.info(
    { adminId, targetId, previousRole, newRole: role },
    'User role updated by super admin'
  );

  ctx.body = {
    success: true,
    data: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      previousRole,
    },
  };
}
