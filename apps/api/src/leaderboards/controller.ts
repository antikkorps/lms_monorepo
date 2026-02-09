import type { Context } from 'koa';
import { LeaderboardEntry, User } from '../database/models/index.js';
import { LeaderboardPeriod, UserRole } from '../database/models/enums.js';
import { AppError } from '../utils/app-error.js';
import { getRedisClient } from '../utils/redis.js';
import type { LeaderboardQuery } from './schemas.js';

const CACHE_TTL_SECONDS = 300; // 5 minutes

interface AuthenticatedUser {
  userId: string;
  email: string;
  role: UserRole;
  tenantId?: string | null;
}

function getAuthenticatedUser(ctx: Context): AuthenticatedUser {
  const user = ctx.state.user as AuthenticatedUser | undefined;
  if (!user) {
    throw AppError.unauthorized('Authentication required');
  }
  return user;
}

/**
 * Calculate period start date for a given period
 */
export function calculatePeriodStart(period: LeaderboardPeriod): string {
  const now = new Date();

  switch (period) {
    case LeaderboardPeriod.WEEKLY: {
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
      return monday.toISOString().split('T')[0];
    }
    case LeaderboardPeriod.MONTHLY: {
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    }
    case LeaderboardPeriod.ALL_TIME:
    default:
      return '2020-01-01';
  }
}

/**
 * Get leaderboard
 * GET /leaderboards
 */
export async function getLeaderboard(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const query = ctx.query as unknown as LeaderboardQuery;
  const { metric, period, scope, courseId, page, limit } = query;

  const periodStart = calculatePeriodStart(period as LeaderboardPeriod);
  const offset = (Number(page) - 1) * Number(limit);

  // Build cache key
  const cacheKey = `leaderboard:${metric}:${period}:${scope}:${courseId || 'global'}:${periodStart}:${page}:${limit}`;

  // Try cache
  try {
    const redis = getRedisClient();
    const cached = await redis.get(cacheKey);
    if (cached) {
      ctx.body = JSON.parse(cached);
      return;
    }
  } catch {
    // Redis unavailable, continue without cache
  }

  // Build where clause
  const where: Record<string, unknown> = {
    metric,
    period,
    periodStart,
  };

  if (scope === 'tenant' && user.tenantId) {
    where.tenantId = user.tenantId;
    where.courseId = null;
  } else if (scope === 'course' && courseId) {
    where.courseId = courseId;
    where.tenantId = null;
  } else {
    // Global scope
    where.tenantId = null;
    where.courseId = null;
  }

  const { rows, count } = await LeaderboardEntry.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'avatarUrl'],
      },
    ],
    order: [['rank', 'ASC']],
    limit: Number(limit),
    offset,
  });

  const responseData = {
    entries: rows.map((entry) => ({
      rank: entry.rank,
      score: Number(entry.score),
      user: entry.user
        ? {
            id: entry.user.id,
            firstName: entry.user.firstName,
            lastName: entry.user.lastName,
            avatarUrl: entry.user.avatarUrl,
          }
        : null,
    })),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: count,
      totalPages: Math.ceil(count / Number(limit)),
    },
    meta: {
      metric,
      period,
      scope,
      periodStart,
    },
  };

  const body = { data: responseData };

  // Cache response
  try {
    const redis = getRedisClient();
    await redis.set(cacheKey, JSON.stringify(body), 'EX', CACHE_TTL_SECONDS);
  } catch {
    // Cache write failure is non-critical
  }

  ctx.body = body;
}

/**
 * Get my rank
 * GET /leaderboards/me
 */
export async function getMyRank(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const query = ctx.query as unknown as LeaderboardQuery;
  const { metric, period, scope, courseId } = query;

  const periodStart = calculatePeriodStart(period as LeaderboardPeriod);

  const where: Record<string, unknown> = {
    userId: user.userId,
    metric,
    period,
    periodStart,
  };

  if (scope === 'tenant' && user.tenantId) {
    where.tenantId = user.tenantId;
    where.courseId = null;
  } else if (scope === 'course' && courseId) {
    where.courseId = courseId;
    where.tenantId = null;
  } else {
    where.tenantId = null;
    where.courseId = null;
  }

  const entry = await LeaderboardEntry.findOne({ where });

  ctx.body = {
    data: entry
      ? {
          rank: entry.rank,
          score: Number(entry.score),
        }
      : null,
  };
}
