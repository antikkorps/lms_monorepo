import type { Context } from 'koa';
import { UserStreak, UserActivityLog } from '../database/models/index.js';
import { UserRole } from '../database/models/enums.js';
import { AppError } from '../utils/app-error.js';
import { sequelize } from '../database/sequelize.js';
import { logger } from '../utils/logger.js';

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
 * Get my streak
 * GET /streaks/me
 */
export async function getMyStreak(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);

  let streak = await UserStreak.findOne({
    where: { userId: user.userId },
  });

  if (!streak) {
    streak = await UserStreak.create({
      userId: user.userId,
      currentStreak: 0,
      longestStreak: 0,
    });
  }

  ctx.body = {
    data: {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastActiveDate: streak.lastActiveDate,
    },
  };
}

/**
 * Record an activity (idempotent).
 * Called by the streak worker.
 */
export async function recordActivity(
  userId: string,
  activityType: string,
  referenceId?: string
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  try {
    await UserActivityLog.findOrCreate({
      where: {
        userId,
        activityType,
        activityDate: today,
        referenceId: referenceId || null,
      },
      defaults: {
        userId,
        activityType,
        activityDate: today,
        referenceId: referenceId || null,
      },
    });
  } catch (error) {
    // Ignore unique constraint violations (concurrent inserts)
    if ((error as { name?: string }).name === 'SequelizeUniqueConstraintError') {
      return;
    }
    throw error;
  }
}

/**
 * Recalculate streak for a user based on their activity log.
 * Scans distinct activity_date DESC, computing current + longest streak.
 */
export async function recalculateStreak(userId: string): Promise<void> {
  // Get distinct activity dates ordered DESC
  const activities = await UserActivityLog.findAll({
    where: { userId },
    attributes: [
      [sequelize.fn('DISTINCT', sequelize.col('activity_date')), 'activityDate'],
    ],
    order: [[sequelize.col('activity_date'), 'DESC']],
    raw: true,
  }) as unknown as { activityDate: string }[];

  if (activities.length === 0) {
    await UserStreak.upsert({
      userId,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      streakUpdatedAt: new Date(),
    });
    return;
  }

  const sortedDates = activities.map((a) => a.activityDate);

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Current streak: starts from today or yesterday
  let currentStreak = 0;
  if (sortedDates[0] === today || sortedDates[0] === yesterday) {
    currentStreak = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const current = new Date(sortedDates[i - 1]);
      const previous = new Date(sortedDates[i]);
      const diffDays = Math.floor(
        (current.getTime() - previous.getTime()) / 86400000
      );

      if (diffDays === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Longest streak: scan all dates
  let longestStreak = 1;
  let tempStreak = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const current = new Date(sortedDates[i - 1]);
    const previous = new Date(sortedDates[i]);
    const diffDays = Math.floor(
      (current.getTime() - previous.getTime()) / 86400000
    );

    if (diffDays === 1) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }

  // Get the existing record to preserve longest_streak if higher
  const existing = await UserStreak.findOne({ where: { userId } });
  const finalLongest = Math.max(
    longestStreak,
    existing?.longestStreak || 0,
    currentStreak
  );

  await UserStreak.upsert({
    userId,
    currentStreak,
    longestStreak: finalLongest,
    lastActiveDate: sortedDates[0],
    streakUpdatedAt: new Date(),
  });

  logger.debug(
    { userId, currentStreak, longestStreak: finalLongest },
    'Streak recalculated'
  );
}
