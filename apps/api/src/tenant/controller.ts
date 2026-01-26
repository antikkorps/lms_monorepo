/**
 * Tenant Controller
 * Provides tenant admin dashboard, member management, and seat management
 */

import type { Context } from 'koa';
import { Op, fn, col } from 'sequelize';
import {
  User,
  Tenant,
  UserProgress,
  Purchase,
  Course,
  Invitation,
} from '../database/models/index.js';
import {
  UserRole,
  UserStatus,
  CourseStatus,
  PurchaseStatus,
  InvitationStatus,
} from '../database/models/enums.js';
import { AppError } from '../utils/app-error.js';

interface AuthenticatedUser {
  userId: string;
  email: string;
  role: UserRole;
  tenantId: string;
}

function getAuthenticatedTenantAdmin(ctx: Context): AuthenticatedUser {
  const user = ctx.state.user as AuthenticatedUser | undefined;
  if (!user) {
    throw AppError.unauthorized('Authentication required');
  }
  if (!user.tenantId) {
    throw AppError.forbidden('Tenant access required');
  }
  if (user.role !== UserRole.TENANT_ADMIN && user.role !== UserRole.SUPER_ADMIN) {
    throw AppError.forbidden('Tenant admin access required');
  }
  return user;
}

// =============================================================================
// Dashboard
// =============================================================================

/**
 * Get tenant dashboard data
 * GET /tenant/dashboard
 */
export async function getTenantDashboard(ctx: Context): Promise<void> {
  const user = getAuthenticatedTenantAdmin(ctx);
  const tenantId = user.tenantId;

  // Get tenant info
  const tenant = await Tenant.findByPk(tenantId);
  if (!tenant) {
    throw AppError.notFound('Tenant not found');
  }

  // Get all members of this tenant
  const members = await User.findAll({
    where: { tenantId },
    attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'status', 'avatarUrl', 'lastLoginAt', 'createdAt'],
    order: [['createdAt', 'DESC']],
  });

  const totalUsers = members.length;
  const activeUsers = members.filter((m) => m.status === UserStatus.ACTIVE).length;

  // Get pending invitations count
  const pendingInvitations = await Invitation.count({
    where: {
      tenantId,
      status: InvitationStatus.PENDING,
    },
  });

  // Calculate average progress and completion rate
  const memberIds = members.map((m) => m.id);

  // Get all purchases for tenant members
  const purchases = await Purchase.findAll({
    where: {
      userId: { [Op.in]: memberIds },
      status: PurchaseStatus.COMPLETED,
    },
    include: [{
      model: Course,
      as: 'course',
      where: { status: CourseStatus.PUBLISHED },
      attributes: ['id', 'lessonsCount'],
    }],
  });

  // Get all progress for tenant members
  const progress = await UserProgress.findAll({
    where: {
      userId: { [Op.in]: memberIds },
      completed: true,
    },
    attributes: ['userId', 'courseId', 'lessonId'],
  });

  // Calculate progress per user per course
  const progressMap = new Map<string, Map<string, Set<string>>>();
  for (const p of progress) {
    const key = p.userId;
    if (!progressMap.has(key)) {
      progressMap.set(key, new Map());
    }
    const userMap = progressMap.get(key)!;
    if (!userMap.has(p.courseId)) {
      userMap.set(p.courseId, new Set());
    }
    userMap.get(p.courseId)!.add(p.lessonId);
  }

  let totalProgressSum = 0;
  let totalEnrollments = 0;
  let completedEnrollments = 0;

  for (const purchase of purchases) {
    if (!purchase.course) continue;
    totalEnrollments++;

    const userProgress = progressMap.get(purchase.userId);
    const courseProgress = userProgress?.get(purchase.courseId);
    const completedLessons = courseProgress?.size || 0;
    const totalLessons = purchase.course.lessonsCount || 1;

    const progressPercent = Math.round((completedLessons / totalLessons) * 100);
    totalProgressSum += progressPercent;

    if (progressPercent >= 100) {
      completedEnrollments++;
    }
  }

  const averageProgress = totalEnrollments > 0 ? Math.round(totalProgressSum / totalEnrollments) : 0;
  const completionRate = totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0;

  // Build stats
  const stats = {
    totalUsers,
    activeUsers,
    seatsUsed: tenant.seatsUsed,
    seatsPurchased: tenant.seatsPurchased,
    averageProgress,
    completionRate,
    pendingInvitations,
  };

  // Recent members (last 5)
  const recentMembers = members.slice(0, 5).map((m) => ({
    id: m.id,
    email: m.email,
    firstName: m.firstName,
    lastName: m.lastName,
    fullName: `${m.firstName} ${m.lastName}`,
    avatarUrl: m.avatarUrl,
    role: m.role,
    status: m.status,
    lastLoginAt: m.lastLoginAt,
    createdAt: m.createdAt,
  }));

  // Activity data (last 30 days) - simplified version
  const activityData = await generateActivityData(memberIds);

  // Role distribution
  const roleDistribution = [
    { role: 'Learners', count: members.filter((m) => m.role === UserRole.LEARNER).length, color: 'hsl(var(--chart-1))' },
    { role: 'Managers', count: members.filter((m) => m.role === UserRole.MANAGER).length, color: 'hsl(var(--chart-2))' },
    { role: 'Instructors', count: members.filter((m) => m.role === UserRole.INSTRUCTOR).length, color: 'hsl(var(--chart-3))' },
    { role: 'Admins', count: members.filter((m) => m.role === UserRole.TENANT_ADMIN).length, color: 'hsl(var(--chart-4))' },
  ];

  ctx.body = {
    data: {
      stats,
      recentMembers,
      activityData,
      roleDistribution,
    },
  };
}

async function generateActivityData(memberIds: string[]): Promise<Array<{ date: string; activeUsers: number; completions: number }>> {
  const data: Array<{ date: string; activeUsers: number; completions: number }> = [];
  const today = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const startOfDay = new Date(dateStr);
    const endOfDay = new Date(dateStr);
    endOfDay.setHours(23, 59, 59, 999);

    // Count unique users with activity on this day
    const activeUsersResult = await UserProgress.findAll({
      where: {
        userId: { [Op.in]: memberIds },
        updatedAt: { [Op.between]: [startOfDay, endOfDay] },
      },
      attributes: [[fn('DISTINCT', col('user_id')), 'userId']],
      raw: true,
    });

    // Count completions on this day
    const completionsCount = await UserProgress.count({
      where: {
        userId: { [Op.in]: memberIds },
        completed: true,
        completedAt: { [Op.between]: [startOfDay, endOfDay] },
      },
    });

    data.push({
      date: dateStr,
      activeUsers: activeUsersResult.length,
      completions: completionsCount,
    });
  }

  return data;
}

// =============================================================================
// Members Management
// =============================================================================

/**
 * Get tenant members
 * GET /tenant/members
 */
export async function getTenantMembers(ctx: Context): Promise<void> {
  const user = getAuthenticatedTenantAdmin(ctx);
  const tenantId = user.tenantId;

  // Query params
  const page = Math.max(1, parseInt(ctx.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(ctx.query.limit as string) || 10));
  const search = (ctx.query.search as string) || '';
  const role = ctx.query.role as string;
  const status = ctx.query.status as string;

  // Build where clause
  const where: Record<string, unknown> = { tenantId };

  if (search) {
    where[Op.or as unknown as string] = [
      { email: { [Op.iLike]: `%${search}%` } },
      { firstName: { [Op.iLike]: `%${search}%` } },
      { lastName: { [Op.iLike]: `%${search}%` } },
    ];
  }

  if (role && role !== 'all') {
    where.role = role;
  }

  if (status && status !== 'all') {
    where.status = status;
  }

  const { count, rows } = await User.findAndCountAll({
    where,
    attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'status', 'avatarUrl', 'lastLoginAt', 'createdAt'],
    order: [['createdAt', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });

  const members = rows.map((m) => ({
    id: m.id,
    email: m.email,
    firstName: m.firstName,
    lastName: m.lastName,
    fullName: `${m.firstName} ${m.lastName}`,
    avatarUrl: m.avatarUrl,
    role: m.role,
    status: m.status,
    lastLoginAt: m.lastLoginAt,
    createdAt: m.createdAt,
  }));

  ctx.body = {
    data: {
      members,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    },
  };
}

/**
 * Update member role
 * PATCH /tenant/members/:id/role
 */
export async function updateMemberRole(ctx: Context): Promise<void> {
  const admin = getAuthenticatedTenantAdmin(ctx);
  const tenantId = admin.tenantId;
  const memberId = ctx.params.id;
  const { role } = ctx.request.body as { role: UserRole };

  // Validate role
  const allowedRoles = [UserRole.LEARNER, UserRole.INSTRUCTOR, UserRole.MANAGER, UserRole.TENANT_ADMIN];
  if (!allowedRoles.includes(role)) {
    throw AppError.badRequest('Invalid role');
  }

  // Find member
  const member = await User.findOne({
    where: { id: memberId, tenantId },
  });

  if (!member) {
    throw AppError.notFound('Member not found');
  }

  // Cannot change own role
  if (member.id === admin.userId) {
    throw AppError.badRequest('Cannot change your own role');
  }

  await member.update({ role });

  ctx.body = {
    data: {
      id: member.id,
      role: member.role,
    },
  };
}

/**
 * Suspend member
 * PATCH /tenant/members/:id/suspend
 */
export async function suspendMember(ctx: Context): Promise<void> {
  const admin = getAuthenticatedTenantAdmin(ctx);
  const tenantId = admin.tenantId;
  const memberId = ctx.params.id;

  const member = await User.findOne({
    where: { id: memberId, tenantId },
  });

  if (!member) {
    throw AppError.notFound('Member not found');
  }

  if (member.id === admin.userId) {
    throw AppError.badRequest('Cannot suspend yourself');
  }

  await member.update({ status: UserStatus.SUSPENDED });

  ctx.body = {
    data: {
      id: member.id,
      status: member.status,
    },
  };
}

/**
 * Reactivate member
 * PATCH /tenant/members/:id/reactivate
 */
export async function reactivateMember(ctx: Context): Promise<void> {
  const admin = getAuthenticatedTenantAdmin(ctx);
  const tenantId = admin.tenantId;
  const memberId = ctx.params.id;

  const member = await User.findOne({
    where: { id: memberId, tenantId },
  });

  if (!member) {
    throw AppError.notFound('Member not found');
  }

  await member.update({ status: UserStatus.ACTIVE });

  ctx.body = {
    data: {
      id: member.id,
      status: member.status,
    },
  };
}

/**
 * Remove member
 * DELETE /tenant/members/:id
 */
export async function removeMember(ctx: Context): Promise<void> {
  const admin = getAuthenticatedTenantAdmin(ctx);
  const tenantId = admin.tenantId;
  const memberId = ctx.params.id;

  const member = await User.findOne({
    where: { id: memberId, tenantId },
  });

  if (!member) {
    throw AppError.notFound('Member not found');
  }

  if (member.id === admin.userId) {
    throw AppError.badRequest('Cannot remove yourself');
  }

  // Soft delete
  await member.destroy();

  // Update tenant seats used
  const tenant = await Tenant.findByPk(tenantId);
  if (tenant && tenant.seatsUsed > 0) {
    await tenant.update({ seatsUsed: tenant.seatsUsed - 1 });
  }

  ctx.status = 204;
}

// =============================================================================
// Seats Management
// =============================================================================

/**
 * Get seat overview
 * GET /tenant/seats
 */
export async function getSeatOverview(ctx: Context): Promise<void> {
  const user = getAuthenticatedTenantAdmin(ctx);
  const tenantId = user.tenantId;

  const tenant = await Tenant.findByPk(tenantId);
  if (!tenant) {
    throw AppError.notFound('Tenant not found');
  }

  const pendingInvitations = await Invitation.count({
    where: {
      tenantId,
      status: InvitationStatus.PENDING,
    },
  });

  const seatsAvailable = tenant.seatsPurchased - tenant.seatsUsed;
  const usagePercentage = tenant.seatsPurchased > 0
    ? Math.round((tenant.seatsUsed / tenant.seatsPurchased) * 100)
    : 0;

  ctx.body = {
    data: {
      seatsPurchased: tenant.seatsPurchased,
      seatsUsed: tenant.seatsUsed,
      seatsAvailable,
      pendingInvitations,
      usagePercentage,
    },
  };
}

/**
 * Get seat allocations by role
 * GET /tenant/seats/allocations
 */
export async function getSeatAllocations(ctx: Context): Promise<void> {
  const user = getAuthenticatedTenantAdmin(ctx);
  const tenantId = user.tenantId;

  const members = await User.findAll({
    where: { tenantId },
    attributes: ['role'],
  });

  const total = members.length;
  const countByRole: Record<string, number> = {};

  for (const member of members) {
    countByRole[member.role] = (countByRole[member.role] || 0) + 1;
  }

  const allocations = Object.entries(countByRole).map(([role, count]) => ({
    role,
    count,
    percentage: total > 0 ? Math.round((count / total) * 100 * 10) / 10 : 0,
  }));

  ctx.body = {
    data: allocations,
  };
}

/**
 * Get seat usage history
 * GET /tenant/seats/history
 */
export async function getSeatUsageHistory(ctx: Context): Promise<void> {
  const user = getAuthenticatedTenantAdmin(ctx);
  const tenantId = user.tenantId;

  const tenant = await Tenant.findByPk(tenantId);
  if (!tenant) {
    throw AppError.notFound('Tenant not found');
  }

  // Generate history for last 12 months
  // In production, this would come from a history table
  const history: Array<{ date: string; used: number; purchased: number }> = [];
  const now = new Date();

  for (let i = 11; i >= 0; i--) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - i);
    const dateStr = date.toISOString().slice(0, 7); // YYYY-MM

    // Count users created before this month
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    const usedCount = await User.count({
      where: {
        tenantId,
        createdAt: { [Op.lte]: endOfMonth },
      },
    });

    history.push({
      date: dateStr,
      used: usedCount,
      purchased: tenant.seatsPurchased,
    });
  }

  ctx.body = {
    data: history,
  };
}

/**
 * Get available seat plans
 * GET /tenant/seats/plans
 */
export async function getSeatPlans(ctx: Context): Promise<void> {
  const user = getAuthenticatedTenantAdmin(ctx);
  const tenantId = user.tenantId;

  const tenant = await Tenant.findByPk(tenantId);
  if (!tenant) {
    throw AppError.notFound('Tenant not found');
  }

  // In production, these would come from a database or Stripe
  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      seats: 25,
      pricePerSeat: 12,
      features: ['Basic analytics', 'Email support', '5 courses'],
      isCurrent: tenant.seatsPurchased <= 25,
    },
    {
      id: 'professional',
      name: 'Professional',
      seats: 50,
      pricePerSeat: 10,
      features: ['Advanced analytics', 'Priority support', 'Unlimited courses', 'Custom branding'],
      isCurrent: tenant.seatsPurchased > 25 && tenant.seatsPurchased <= 50,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      seats: 100,
      pricePerSeat: 8,
      features: [
        'Full analytics suite',
        'Dedicated support',
        'Unlimited courses',
        'Custom branding',
        'SSO/SAML',
        'API access',
      ],
      isCurrent: tenant.seatsPurchased > 50,
      isRecommended: true,
    },
  ];

  ctx.body = {
    data: plans,
  };
}

/**
 * Request additional seats
 * POST /tenant/seats/request
 */
export async function requestSeats(ctx: Context): Promise<void> {
  const user = getAuthenticatedTenantAdmin(ctx);
  const tenantId = user.tenantId;
  const { additionalSeats } = ctx.request.body as { additionalSeats: number };

  if (!additionalSeats || additionalSeats < 1) {
    throw AppError.badRequest('Invalid seat count');
  }

  const tenant = await Tenant.findByPk(tenantId);
  if (!tenant) {
    throw AppError.notFound('Tenant not found');
  }

  // In production, this would create a Stripe checkout session or invoice
  // For now, we'll just increase the seats
  await tenant.update({
    seatsPurchased: tenant.seatsPurchased + additionalSeats,
  });

  ctx.body = {
    data: {
      seatsPurchased: tenant.seatsPurchased,
      message: `Successfully added ${additionalSeats} seats`,
    },
  };
}

/**
 * Upgrade plan
 * POST /tenant/seats/upgrade
 */
export async function upgradePlan(ctx: Context): Promise<void> {
  const user = getAuthenticatedTenantAdmin(ctx);
  const tenantId = user.tenantId;
  const { planId } = ctx.request.body as { planId: string };

  const tenant = await Tenant.findByPk(tenantId);
  if (!tenant) {
    throw AppError.notFound('Tenant not found');
  }

  // Plan seat counts (in production, from database)
  const planSeats: Record<string, number> = {
    starter: 25,
    professional: 50,
    enterprise: 100,
  };

  const newSeats = planSeats[planId];
  if (!newSeats) {
    throw AppError.badRequest('Invalid plan');
  }

  if (newSeats < tenant.seatsUsed) {
    throw AppError.badRequest('Cannot downgrade: current usage exceeds new plan capacity');
  }

  // In production, this would initiate Stripe subscription change
  await tenant.update({
    seatsPurchased: newSeats,
  });

  ctx.body = {
    data: {
      seatsPurchased: tenant.seatsPurchased,
      planId,
      message: `Successfully upgraded to ${planId} plan`,
    },
  };
}
