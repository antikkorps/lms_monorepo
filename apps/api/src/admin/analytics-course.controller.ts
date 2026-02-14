import type { Context } from 'koa';
import { Op } from 'sequelize';
import { sequelize } from '../database/sequelize.js';
import {
  Purchase,
  Course,
  TenantCourseLicense,
} from '../database/models/index.js';
import {
  UserRole,
  PurchaseStatus,
} from '../database/models/enums.js';
import { courseAnalyticsParamsSchema, courseAnalyticsQuerySchema } from './analytics.schemas.js';
import { AppError } from '../utils/app-error.js';

interface AuthenticatedUser {
  userId: string;
  email: string;
  role: UserRole;
  tenantId: string | null;
}

function getAuthenticatedAdmin(ctx: Context): AuthenticatedUser {
  const user = ctx.state.user as AuthenticatedUser | undefined;
  if (!user) throw AppError.unauthorized('Authentication required');
  return user;
}

function getTenantScope(ctx: Context): string | null {
  const user = getAuthenticatedAdmin(ctx);
  if (user.role === UserRole.SUPER_ADMIN) return null;
  if (!user.tenantId) throw AppError.forbidden('Tenant access required');
  return user.tenantId;
}

function getDateRange(period: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  switch (period) {
    case '7d': start.setDate(start.getDate() - 7); break;
    case '30d': start.setDate(start.getDate() - 30); break;
    case '90d': start.setDate(start.getDate() - 90); break;
    case '12m': start.setMonth(start.getMonth() - 12); break;
    default: start.setDate(start.getDate() - 30);
  }
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

export async function getCourseAnalytics(ctx: Context): Promise<void> {
  const { courseId } = courseAnalyticsParamsSchema.parse(ctx.params);
  const { period, page, pageSize } = courseAnalyticsQuerySchema.parse(ctx.query);
  const tenantId = getTenantScope(ctx);

  const { start, end } = getDateRange(period);

  // Verify course exists
  const course = await Course.findByPk(courseId, { attributes: ['id', 'title', 'lessonsCount'] });
  if (!course) throw AppError.notFound('Course not found');

  const tenantFilter = tenantId ? `AND tcl.tenant_id = :tenantId` : '';
  const replacements: Record<string, unknown> = {
    courseId, start, end,
    ...(tenantId ? { tenantId } : {}),
  };

  // Run queries in parallel
  const [
    revenueData,
    enrollmentTimeSeries,
    funnelData,
    quizData,
    watchTimeData,
    reviewData,
    learnersData,
    learnersCount,
  ] = await Promise.all([
    // Revenue (B2C + B2B)
    Promise.all([
      Purchase.sum('amount', {
        where: {
          courseId,
          status: PurchaseStatus.COMPLETED,
          purchasedAt: { [Op.between]: [start, end] },
        },
      }),
      TenantCourseLicense.sum('amount', {
        where: {
          courseId,
          ...(tenantId ? { tenantId } : {}),
          status: PurchaseStatus.COMPLETED,
          purchasedAt: { [Op.between]: [start, end] },
        },
      }),
    ]),

    // Enrollment time series (purchases + license assignments)
    sequelize.query<{ date: string; count: string }>(`
      SELECT date, SUM(cnt) as count FROM (
        SELECT TO_CHAR(purchased_at, 'YYYY-MM-DD') as date, COUNT(*) as cnt
        FROM purchases
        WHERE course_id = :courseId AND status = 'completed'
          AND purchased_at BETWEEN :start AND :end
        GROUP BY TO_CHAR(purchased_at, 'YYYY-MM-DD')
        UNION ALL
        SELECT TO_CHAR(a.assigned_at, 'YYYY-MM-DD') as date, COUNT(*) as cnt
        FROM tenant_course_license_assignments a
        JOIN tenant_course_licenses tcl ON tcl.id = a.license_id
        WHERE tcl.course_id = :courseId AND tcl.status = 'completed'
          AND a.assigned_at BETWEEN :start AND :end
          ${tenantFilter}
        GROUP BY TO_CHAR(a.assigned_at, 'YYYY-MM-DD')
      ) combined
      GROUP BY date ORDER BY date
    `, { replacements, type: 'SELECT' as never }),

    // Completion funnel
    sequelize.query<{ enrolled: string; started: string; completed: string }>(`
      SELECT
        COUNT(DISTINCT p.user_id) as enrolled,
        COUNT(DISTINCT CASE WHEN up.progress_count > 0 THEN p.user_id END) as started,
        COUNT(DISTINCT CASE
          WHEN up.completed_count >= c.lessons_count AND c.lessons_count > 0 THEN p.user_id
        END) as completed
      FROM purchases p
      JOIN courses c ON c.id = p.course_id
      LEFT JOIN (
        SELECT user_id, course_id,
          COUNT(*) as progress_count,
          COUNT(*) FILTER (WHERE completed = true) as completed_count
        FROM user_progress
        GROUP BY user_id, course_id
      ) up ON up.user_id = p.user_id AND up.course_id = p.course_id
      WHERE p.course_id = :courseId AND p.status = 'completed'
        AND p.purchased_at BETWEEN :start AND :end
    `, { replacements, type: 'SELECT' as never }),

    // Quiz performance
    sequelize.query<{ avgScore: string; passRate: string; totalAttempts: string }>(`
      SELECT
        COALESCE(AVG(qr.score::float / NULLIF(qr.max_score, 0) * 100), 0) as "avgScore",
        COALESCE(
          COUNT(*) FILTER (WHERE qr.passed = true)::float / NULLIF(COUNT(*), 0) * 100,
          0
        ) as "passRate",
        COUNT(*) as "totalAttempts"
      FROM quiz_results qr
      JOIN lessons l ON l.id = qr.lesson_id
      JOIN chapters ch ON ch.id = l.chapter_id
      WHERE ch.course_id = :courseId
        AND qr.completed_at BETWEEN :start AND :end
    `, { replacements, type: 'SELECT' as never }),

    // Watch time
    sequelize.query<{ totalSeconds: string; avgSeconds: string }>(`
      SELECT
        COALESCE(SUM(progress_seconds), 0) as "totalSeconds",
        COALESCE(AVG(progress_seconds), 0) as "avgSeconds"
      FROM user_progress
      WHERE course_id = :courseId
        AND updated_at BETWEEN :start AND :end
    `, { replacements, type: 'SELECT' as never }),

    // Reviews summary
    sequelize.query<{ avgRating: string; total: string; rating: string; ratingCount: string }>(`
      SELECT
        AVG(rating) as "avgRating",
        COUNT(*) as total,
        rating,
        COUNT(*) as "ratingCount"
      FROM course_reviews
      WHERE course_id = :courseId
        AND created_at BETWEEN :start AND :end
        AND status = 'approved'
      GROUP BY rating
    `, { replacements, type: 'SELECT' as never }),

    // Learner progress (paginated)
    sequelize.query<{
      userId: string; firstName: string; lastName: string; email: string;
      lessonsCompleted: string; watchTimeSeconds: string; lastActiveAt: string;
    }>(`
      SELECT
        u.id as "userId",
        u.first_name as "firstName",
        u.last_name as "lastName",
        u.email,
        COALESCE(up.completed_count, 0) as "lessonsCompleted",
        COALESCE(up.total_seconds, 0) as "watchTimeSeconds",
        up.last_active as "lastActiveAt"
      FROM purchases p
      JOIN users u ON u.id = p.user_id
      LEFT JOIN (
        SELECT user_id, course_id,
          COUNT(*) FILTER (WHERE completed = true) as completed_count,
          SUM(progress_seconds) as total_seconds,
          MAX(updated_at) as last_active
        FROM user_progress
        GROUP BY user_id, course_id
      ) up ON up.user_id = p.user_id AND up.course_id = p.course_id
      WHERE p.course_id = :courseId AND p.status = 'completed'
      ORDER BY up.last_active DESC NULLS LAST
      LIMIT :pageSize OFFSET :offset
    `, {
      replacements: { ...replacements, pageSize, offset: (page - 1) * pageSize },
      type: 'SELECT' as never,
    }),

    // Learner count
    Purchase.count({
      where: { courseId, status: PurchaseStatus.COMPLETED },
    }),
  ]);

  const [b2cRevenue, b2bRevenue] = revenueData;
  const b2c = b2cRevenue || 0;
  const b2b = b2bRevenue || 0;

  const funnel = funnelData[0];
  const quiz = quizData[0];
  const watchTime = watchTimeData[0];

  // Build review distribution
  const totalReviews = reviewData.reduce((sum, r) => sum + parseInt(r.ratingCount, 10), 0);
  let reviewsSummary = null;
  if (totalReviews > 0) {
    const distribution: Record<string, number> = {};
    for (let i = 1; i <= 5; i++) distribution[String(i)] = 0;
    for (const r of reviewData) {
      distribution[String(r.rating)] = parseInt(r.ratingCount, 10) || 0;
    }
    reviewsSummary = {
      avgRating: Math.round((parseFloat(reviewData[0]?.avgRating || '0')) * 10) / 10,
      distribution,
      total: totalReviews,
    };
  }

  const totalLessons = (course as unknown as { lessonsCount: number }).lessonsCount || 0;

  ctx.body = {
    data: {
      courseId,
      title: (course as unknown as { title: string }).title,
      revenue: { total: b2c + b2b, b2c, b2b },
      enrollmentTimeSeries: enrollmentTimeSeries.map((e) => ({
        date: e.date,
        count: parseInt(e.count, 10) || 0,
      })),
      completionFunnel: {
        enrolled: parseInt(funnel?.enrolled || '0', 10),
        started: parseInt(funnel?.started || '0', 10),
        completed: parseInt(funnel?.completed || '0', 10),
      },
      quizPerformance: parseInt(quiz?.totalAttempts || '0', 10) > 0 ? {
        avgScore: Math.round(parseFloat(quiz.avgScore) * 10) / 10,
        passRate: Math.round(parseFloat(quiz.passRate) * 10) / 10,
        totalAttempts: parseInt(quiz.totalAttempts, 10),
      } : null,
      watchTime: {
        totalSeconds: parseInt(watchTime?.totalSeconds || '0', 10),
        avgSeconds: Math.round(parseFloat(watchTime?.avgSeconds || '0')),
      },
      reviews: reviewsSummary,
      learners: {
        items: learnersData.map((l) => ({
          userId: l.userId,
          firstName: l.firstName,
          lastName: l.lastName,
          email: l.email,
          progressPercent: totalLessons > 0
            ? Math.round((parseInt(l.lessonsCompleted, 10) / totalLessons) * 100)
            : 0,
          lessonsCompleted: parseInt(l.lessonsCompleted, 10),
          totalLessons,
          watchTimeSeconds: parseInt(l.watchTimeSeconds, 10) || 0,
          lastActiveAt: l.lastActiveAt || null,
        })),
        total: learnersCount,
        page,
        pageSize,
      },
    },
  };
}
