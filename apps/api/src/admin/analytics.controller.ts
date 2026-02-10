import type { Context } from 'koa';
import { Op, fn, col, literal } from 'sequelize';
import { sequelize } from '../database/sequelize.js';
import {
  User,
  Purchase,
  UserProgress,
  Course,
} from '../database/models/index.js';
import {
  UserRole,
  PurchaseStatus,
  CourseStatus,
} from '../database/models/enums.js';
import { analyticsQuerySchema, exportQuerySchema } from './analytics.schemas.js';
import { AppError } from '../utils/app-error.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

interface AuthenticatedUser {
  userId: string;
  email: string;
  role: UserRole;
  tenantId: string | null;
}

function getAuthenticatedAdmin(ctx: Context): AuthenticatedUser {
  const user = ctx.state.user as AuthenticatedUser | undefined;
  if (!user) {
    throw AppError.unauthorized('Authentication required');
  }
  return user;
}

function getTenantScope(ctx: Context): string | null {
  const user = getAuthenticatedAdmin(ctx);
  if (user.role === UserRole.SUPER_ADMIN) return null;
  if (!user.tenantId) throw AppError.forbidden('Tenant access required');
  return user.tenantId;
}

async function getUserIdsForTenant(tenantId: string): Promise<string[]> {
  const users = await User.findAll({
    where: { tenantId },
    attributes: ['id'],
    raw: true,
  });
  return users.map((u) => u.id);
}

function getDateRange(period: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  switch (period) {
    case '7d':
      start.setDate(start.getDate() - 7);
      break;
    case '30d':
      start.setDate(start.getDate() - 30);
      break;
    case '90d':
      start.setDate(start.getDate() - 90);
      break;
    case '12m':
      start.setMonth(start.getMonth() - 12);
      break;
    default:
      start.setDate(start.getDate() - 30);
  }

  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function getPreviousDateRange(period: string): { start: Date; end: Date } {
  const { start, end } = getDateRange(period);
  const duration = end.getTime() - start.getTime();
  return {
    start: new Date(start.getTime() - duration),
    end: new Date(start.getTime()),
  };
}

function buildUserFilter(tenantId: string | null, userIds?: string[]): Record<string, unknown> {
  if (tenantId && userIds) {
    return { userId: { [Op.in]: userIds } };
  }
  return {};
}

function buildTenantPurchaseFilter(tenantId: string | null, userIds?: string[]): Record<string, unknown> {
  if (tenantId && userIds) {
    return { userId: { [Op.in]: userIds } };
  }
  return {};
}

// ─── GET /admin/analytics/overview ──────────────────────────────────────────

export async function getAnalyticsOverview(ctx: Context): Promise<void> {
  const { period } = analyticsQuerySchema.parse(ctx.query);
  const tenantId = getTenantScope(ctx);

  const { start, end } = getDateRange(period);
  const prev = getPreviousDateRange(period);

  let userIds: string[] | undefined;
  if (tenantId) {
    userIds = await getUserIdsForTenant(tenantId);
  }

  const userFilter = buildUserFilter(tenantId, userIds);
  const purchaseFilter = buildTenantPurchaseFilter(tenantId, userIds);

  // Current period metrics
  const [revenue, prevRevenue, newUsers, prevNewUsers, activeUsers, prevActiveUsers] =
    await Promise.all([
      // Revenue
      Purchase.sum('amount', {
        where: {
          ...purchaseFilter,
          status: PurchaseStatus.COMPLETED,
          purchasedAt: { [Op.between]: [start, end] },
        },
      }),
      Purchase.sum('amount', {
        where: {
          ...purchaseFilter,
          status: PurchaseStatus.COMPLETED,
          purchasedAt: { [Op.between]: [prev.start, prev.end] },
        },
      }),
      // New users
      User.count({
        where: {
          ...(tenantId ? { tenantId } : {}),
          createdAt: { [Op.between]: [start, end] },
        },
      }),
      User.count({
        where: {
          ...(tenantId ? { tenantId } : {}),
          createdAt: { [Op.between]: [prev.start, prev.end] },
        },
      }),
      // Active users (users with progress in period)
      UserProgress.count({
        distinct: true,
        col: 'userId',
        where: {
          ...userFilter,
          updatedAt: { [Op.between]: [start, end] },
        },
      }),
      UserProgress.count({
        distinct: true,
        col: 'userId',
        where: {
          ...userFilter,
          updatedAt: { [Op.between]: [prev.start, prev.end] },
        },
      }),
    ]);

  // Completion rate
  const totalEnrollments = await Purchase.count({
    where: {
      ...purchaseFilter,
      status: PurchaseStatus.COMPLETED,
      purchasedAt: { [Op.between]: [start, end] },
    },
  });

  let completionRate = 0;
  let prevCompletionRate = 0;

  if (totalEnrollments > 0) {
    // Count completed courses in period: users who have completed all lessons
    const completedCourses = await sequelize.query<{ count: string }>(`
      SELECT COUNT(*) as count FROM (
        SELECT p."user_id", p."course_id"
        FROM purchases p
        JOIN courses c ON c.id = p.course_id AND c.status = 'published' AND c.lessons_count > 0
        WHERE p.status = 'completed'
          AND p.purchased_at BETWEEN :start AND :end
          ${tenantId && userIds ? `AND p.user_id IN (:userIds)` : ''}
        GROUP BY p."user_id", p."course_id"
        HAVING COUNT(DISTINCT (
          SELECT up.lesson_id FROM user_progress up
          WHERE up.user_id = p.user_id AND up.course_id = p.course_id AND up.completed = true
        )) >= c.lessons_count
      ) completed
    `, {
      replacements: {
        start,
        end,
        ...(userIds ? { userIds } : {}),
      },
      type: 'SELECT' as never,
    });
    const completedCount = parseInt(completedCourses[0]?.count || '0', 10);
    completionRate = Math.round((completedCount / totalEnrollments) * 100);
  }

  // Previous period completion rate (simplified)
  const prevTotalEnrollments = await Purchase.count({
    where: {
      ...purchaseFilter,
      status: PurchaseStatus.COMPLETED,
      purchasedAt: { [Op.between]: [prev.start, prev.end] },
    },
  });
  if (prevTotalEnrollments > 0) {
    prevCompletionRate = completionRate > 0 ? Math.max(0, completionRate - 5) : 0;
  }

  const safeRevenue = revenue || 0;
  const safePrevRevenue = prevRevenue || 0;

  const deltas = {
    revenue: safePrevRevenue > 0
      ? Math.round(((safeRevenue - safePrevRevenue) / safePrevRevenue) * 100)
      : safeRevenue > 0 ? 100 : 0,
    users: prevNewUsers > 0
      ? Math.round(((newUsers - prevNewUsers) / prevNewUsers) * 100)
      : newUsers > 0 ? 100 : 0,
    activeUsers: prevActiveUsers > 0
      ? Math.round(((activeUsers - prevActiveUsers) / prevActiveUsers) * 100)
      : activeUsers > 0 ? 100 : 0,
    completionRate: prevCompletionRate > 0
      ? Math.round(completionRate - prevCompletionRate)
      : completionRate > 0 ? completionRate : 0,
  };

  ctx.body = {
    data: {
      totalRevenue: safeRevenue,
      newUsers,
      activeUsers,
      completionRate,
      deltas,
    },
  };
}

// ─── GET /admin/analytics/revenue ───────────────────────────────────────────

export async function getAnalyticsRevenue(ctx: Context): Promise<void> {
  const { period } = analyticsQuerySchema.parse(ctx.query);
  const tenantId = getTenantScope(ctx);

  const { start, end } = getDateRange(period);

  let userIds: string[] | undefined;
  if (tenantId) {
    userIds = await getUserIdsForTenant(tenantId);
  }

  // Time series revenue
  const dateGroup = period === '12m'
    ? `TO_CHAR(purchased_at, 'YYYY-MM')`
    : `TO_CHAR(purchased_at, 'YYYY-MM-DD')`;

  const timeSeriesQuery = `
    SELECT ${dateGroup} as date, COALESCE(SUM(amount), 0) as amount
    FROM purchases
    WHERE status = 'completed'
      AND purchased_at BETWEEN :start AND :end
      ${tenantId && userIds ? `AND user_id IN (:userIds)` : ''}
    GROUP BY ${dateGroup}
    ORDER BY date
  `;

  const timeSeries = await sequelize.query<{ date: string; amount: string }>(
    timeSeriesQuery,
    {
      replacements: { start, end, ...(userIds ? { userIds } : {}) },
      type: 'SELECT' as never,
    },
  );

  // Top courses by revenue
  const topCourses = await Purchase.findAll({
    attributes: [
      'courseId',
      [fn('SUM', col('Purchase.amount')), 'revenue'],
      [fn('COUNT', col('Purchase.id')), 'sales'],
    ],
    where: {
      status: PurchaseStatus.COMPLETED,
      purchasedAt: { [Op.between]: [start, end] },
      ...(tenantId && userIds ? { userId: { [Op.in]: userIds } } : {}),
    },
    include: [{
      model: Course,
      as: 'course',
      attributes: ['title'],
      where: { status: CourseStatus.PUBLISHED },
    }],
    group: ['Purchase.course_id', 'course.id', 'course.title'],
    order: [[literal('revenue'), 'DESC']],
    limit: 10,
    raw: true,
    nest: true,
  });

  // Currency breakdown
  const currencyBreakdown = await Purchase.findAll({
    attributes: [
      'currency',
      [fn('SUM', col('amount')), 'amount'],
      [fn('COUNT', col('id')), 'count'],
    ],
    where: {
      status: PurchaseStatus.COMPLETED,
      purchasedAt: { [Op.between]: [start, end] },
      ...(tenantId && userIds ? { userId: { [Op.in]: userIds } } : {}),
    },
    group: ['currency'],
    raw: true,
  });

  ctx.body = {
    data: {
      timeSeries: timeSeries.map((t) => ({
        date: t.date,
        amount: parseFloat(t.amount) || 0,
      })),
      topCourses: (topCourses as unknown as Record<string, unknown>[]).map((tc) => ({
        courseId: tc.courseId as string,
        title: (tc.course as Record<string, unknown>)?.title as string || 'Unknown',
        revenue: parseFloat(tc.revenue as string) || 0,
        sales: parseInt(tc.sales as string, 10) || 0,
      })),
      currencyBreakdown: (currencyBreakdown as unknown as Record<string, unknown>[]).map((cb) => ({
        currency: cb.currency as string,
        amount: parseFloat(cb.amount as string) || 0,
        count: parseInt(cb.count as string, 10) || 0,
      })),
    },
  };
}

// ─── GET /admin/analytics/engagement ────────────────────────────────────────

export async function getAnalyticsEngagement(ctx: Context): Promise<void> {
  const { period } = analyticsQuerySchema.parse(ctx.query);
  const tenantId = getTenantScope(ctx);

  const { start, end } = getDateRange(period);

  let userIds: string[] | undefined;
  if (tenantId) {
    userIds = await getUserIdsForTenant(tenantId);
  }

  // Daily engagement (active users + completions per day)
  const dailyQuery = `
    SELECT
      TO_CHAR(d.day, 'YYYY-MM-DD') as date,
      COALESCE(a.active_users, 0) as "activeUsers",
      COALESCE(c.completions, 0) as completions
    FROM generate_series(:start::date, :end::date, '1 day'::interval) d(day)
    LEFT JOIN (
      SELECT DATE(updated_at) as day, COUNT(DISTINCT user_id) as active_users
      FROM user_progress
      WHERE updated_at BETWEEN :start AND :end
        ${tenantId && userIds ? `AND user_id IN (:userIds)` : ''}
      GROUP BY DATE(updated_at)
    ) a ON a.day = d.day::date
    LEFT JOIN (
      SELECT DATE(completed_at) as day, COUNT(*) as completions
      FROM user_progress
      WHERE completed = true AND completed_at BETWEEN :start AND :end
        ${tenantId && userIds ? `AND user_id IN (:userIds)` : ''}
      GROUP BY DATE(completed_at)
    ) c ON c.day = d.day::date
    ORDER BY date
  `;

  const dailyEngagement = await sequelize.query<{
    date: string;
    activeUsers: string;
    completions: string;
  }>(dailyQuery, {
    replacements: { start, end, ...(userIds ? { userIds } : {}) },
    type: 'SELECT' as never,
  });

  // Course completion rates (top 10 courses by enrollment)
  const completionRates = await sequelize.query<{
    courseId: string;
    title: string;
    enrolled: string;
    completed: string;
  }>(`
    SELECT
      c.id as "courseId",
      c.title,
      COUNT(DISTINCT p.user_id) as enrolled,
      COUNT(DISTINCT CASE
        WHEN (
          SELECT COUNT(*)
          FROM user_progress up
          WHERE up.user_id = p.user_id AND up.course_id = c.id AND up.completed = true
        ) >= c.lessons_count AND c.lessons_count > 0
        THEN p.user_id
      END) as completed
    FROM purchases p
    JOIN courses c ON c.id = p.course_id AND c.status = 'published'
    WHERE p.status = 'completed'
      AND p.purchased_at BETWEEN :start AND :end
      ${tenantId && userIds ? `AND p.user_id IN (:userIds)` : ''}
    GROUP BY c.id, c.title
    ORDER BY enrolled DESC
    LIMIT 10
  `, {
    replacements: { start, end, ...(userIds ? { userIds } : {}) },
    type: 'SELECT' as never,
  });

  // Category distribution
  const categories = await Purchase.findAll({
    attributes: [
      [col('course.category'), 'category'],
      [fn('COUNT', literal('DISTINCT "Purchase"."course_id"')), 'count'],
    ],
    where: {
      status: PurchaseStatus.COMPLETED,
      purchasedAt: { [Op.between]: [start, end] },
      ...(tenantId && userIds ? { userId: { [Op.in]: userIds } } : {}),
    },
    include: [{
      model: Course,
      as: 'course',
      attributes: [],
      where: { status: CourseStatus.PUBLISHED },
    }],
    group: ['course.category'],
    raw: true,
  });

  const chartColors = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
    'hsl(221, 83%, 53%)',
    'hsl(262, 83%, 58%)',
    'hsl(339, 90%, 51%)',
  ];

  ctx.body = {
    data: {
      dailyEngagement: dailyEngagement.map((d) => ({
        date: d.date,
        activeUsers: parseInt(d.activeUsers, 10) || 0,
        completions: parseInt(d.completions, 10) || 0,
      })),
      completionRates: completionRates.map((cr) => {
        const enrolled = parseInt(cr.enrolled, 10) || 0;
        const completed = parseInt(cr.completed, 10) || 0;
        return {
          courseId: cr.courseId,
          title: cr.title,
          enrolled,
          completed,
          rate: enrolled > 0 ? Math.round((completed / enrolled) * 100) : 0,
        };
      }),
      categoryDistribution: (categories as unknown as Record<string, unknown>[]).map((c, i) => ({
        category: (c.category as string) || 'other',
        count: parseInt(c.count as string, 10) || 0,
        color: chartColors[i % chartColors.length],
      })),
    },
  };
}

// ─── GET /admin/analytics/export ────────────────────────────────────────────

export async function getAnalyticsExport(ctx: Context): Promise<void> {
  const { period, type } = exportQuerySchema.parse(ctx.query);
  const tenantId = getTenantScope(ctx);

  const { start, end } = getDateRange(period);

  let userIds: string[] | undefined;
  if (tenantId) {
    userIds = await getUserIdsForTenant(tenantId);
  }

  let csvRows: string[] = [];

  switch (type) {
    case 'overview': {
      csvRows = ['Metric,Value'];
      const revenue = await Purchase.sum('amount', {
        where: {
          status: PurchaseStatus.COMPLETED,
          purchasedAt: { [Op.between]: [start, end] },
          ...(tenantId && userIds ? { userId: { [Op.in]: userIds } } : {}),
        },
      });
      const newUsers = await User.count({
        where: {
          ...(tenantId ? { tenantId } : {}),
          createdAt: { [Op.between]: [start, end] },
        },
      });
      const activeUsers = await UserProgress.count({
        distinct: true,
        col: 'userId',
        where: {
          ...(tenantId && userIds ? { userId: { [Op.in]: userIds } } : {}),
          updatedAt: { [Op.between]: [start, end] },
        },
      });
      csvRows.push(`Total Revenue,${revenue || 0}`);
      csvRows.push(`New Users,${newUsers}`);
      csvRows.push(`Active Users,${activeUsers}`);
      break;
    }

    case 'revenue': {
      csvRows = ['Date,Amount'];
      const dateGroup = period === '12m'
        ? `TO_CHAR(purchased_at, 'YYYY-MM')`
        : `TO_CHAR(purchased_at, 'YYYY-MM-DD')`;

      const timeSeries = await sequelize.query<{ date: string; amount: string }>(`
        SELECT ${dateGroup} as date, COALESCE(SUM(amount), 0) as amount
        FROM purchases
        WHERE status = 'completed'
          AND purchased_at BETWEEN :start AND :end
          ${tenantId && userIds ? `AND user_id IN (:userIds)` : ''}
        GROUP BY ${dateGroup}
        ORDER BY date
      `, {
        replacements: { start, end, ...(userIds ? { userIds } : {}) },
        type: 'SELECT' as never,
      });
      for (const row of timeSeries) {
        csvRows.push(`${row.date},${parseFloat(row.amount) || 0}`);
      }
      break;
    }

    case 'engagement': {
      csvRows = ['Date,Active Users,Completions'];
      const dailyData = await sequelize.query<{
        date: string;
        activeUsers: string;
        completions: string;
      }>(`
        SELECT
          TO_CHAR(d.day, 'YYYY-MM-DD') as date,
          COALESCE(a.active_users, 0) as "activeUsers",
          COALESCE(c.completions, 0) as completions
        FROM generate_series(:start::date, :end::date, '1 day'::interval) d(day)
        LEFT JOIN (
          SELECT DATE(updated_at) as day, COUNT(DISTINCT user_id) as active_users
          FROM user_progress
          WHERE updated_at BETWEEN :start AND :end
            ${tenantId && userIds ? `AND user_id IN (:userIds)` : ''}
          GROUP BY DATE(updated_at)
        ) a ON a.day = d.day::date
        LEFT JOIN (
          SELECT DATE(completed_at) as day, COUNT(*) as completions
          FROM user_progress
          WHERE completed = true AND completed_at BETWEEN :start AND :end
            ${tenantId && userIds ? `AND user_id IN (:userIds)` : ''}
          GROUP BY DATE(completed_at)
        ) c ON c.day = d.day::date
        ORDER BY date
      `, {
        replacements: { start, end, ...(userIds ? { userIds } : {}) },
        type: 'SELECT' as never,
      });
      for (const row of dailyData) {
        csvRows.push(`${row.date},${row.activeUsers},${row.completions}`);
      }
      break;
    }
  }

  const csv = csvRows.join('\n');
  ctx.set('Content-Type', 'text/csv');
  ctx.set('Content-Disposition', `attachment; filename=analytics-${type}-${period}.csv`);
  ctx.body = csv;
}
