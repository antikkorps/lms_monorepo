/**
 * Badges Controller
 * Provides badge/achievement data for learners
 */

import type { Context } from 'koa';
import { Op } from 'sequelize';
import {
  Badge,
  UserBadge,
  UserProgress,
  QuizResult,
  Purchase,
  Course,
} from '../database/models/index.js';
import { UserRole, CourseStatus, PurchaseStatus } from '../database/models/enums.js';
import type { BadgeCriteria, BadgeCategory, BadgeRarity } from '../database/models/Badge.js';
import { AppError } from '../utils/app-error.js';

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

interface BadgeResponse {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  earnedAt: Date | null;
  progress?: number;
  requirement?: string;
}

/**
 * Calculate progress for a badge based on its criteria
 */
async function calculateBadgeProgress(
  userId: string,
  criteria: BadgeCriteria
): Promise<{ progress: number; requirement: string }> {
  const threshold = criteria.threshold || 1;

  switch (criteria.type) {
    case 'lessons_completed': {
      const completedCount = await UserProgress.count({
        where: { userId, completed: true },
      });
      const progress = Math.min(100, Math.round((completedCount / threshold) * 100));
      return {
        progress,
        requirement: `${completedCount}/${threshold} lessons`,
      };
    }

    case 'course_completion': {
      if (criteria.courseId) {
        // Specific course completion
        const course = await Course.findByPk(criteria.courseId, {
          attributes: ['lessonsCount'],
        });
        if (!course) {
          return { progress: 0, requirement: 'Course not found' };
        }
        const completedLessons = await UserProgress.count({
          where: {
            userId,
            courseId: criteria.courseId,
            completed: true,
          },
        });
        const progress = course.lessonsCount > 0
          ? Math.min(100, Math.round((completedLessons / course.lessonsCount) * 100))
          : 0;
        return {
          progress,
          requirement: `${completedLessons}/${course.lessonsCount} lessons`,
        };
      } else {
        // Multiple courses completion
        const completedCourses = await getCompletedCoursesCount(userId);
        const progress = Math.min(100, Math.round((completedCourses / threshold) * 100));
        return {
          progress,
          requirement: `${completedCourses}/${threshold} courses`,
        };
      }
    }

    case 'quiz_score': {
      // Count quizzes with score >= threshold
      const quizResults = await QuizResult.findAll({
        where: { userId },
        attributes: ['score', 'maxScore'],
      });
      const qualifyingQuizzes = quizResults.filter(
        (qr) => qr.maxScore > 0 && (qr.score / qr.maxScore) * 100 >= threshold
      ).length;
      // Assume we need 5 qualifying quizzes
      const targetQuizzes = 5;
      const progress = Math.min(100, Math.round((qualifyingQuizzes / targetQuizzes) * 100));
      return {
        progress,
        requirement: `${qualifyingQuizzes}/${targetQuizzes} quizzes`,
      };
    }

    case 'streak': {
      const currentStreak = await calculateCurrentStreak(userId);
      const progress = Math.min(100, Math.round((currentStreak / threshold) * 100));
      return {
        progress,
        requirement: `${currentStreak}/${threshold} days`,
      };
    }

    case 'custom':
    default:
      return {
        progress: 0,
        requirement: criteria.description || 'Custom requirement',
      };
  }
}

/**
 * Calculate completed courses count for a user
 */
async function getCompletedCoursesCount(userId: string): Promise<number> {
  const purchases = await Purchase.findAll({
    where: {
      userId,
      status: PurchaseStatus.COMPLETED,
    },
    include: [{
      model: Course,
      as: 'course',
      where: { status: CourseStatus.PUBLISHED },
      attributes: ['id', 'lessonsCount'],
    }],
  });

  let completedCount = 0;
  for (const purchase of purchases) {
    if (!purchase.course) continue;
    const completedLessons = await UserProgress.count({
      where: {
        userId,
        courseId: purchase.courseId,
        completed: true,
      },
    });
    if (completedLessons >= (purchase.course.lessonsCount || 0) && purchase.course.lessonsCount > 0) {
      completedCount++;
    }
  }
  return completedCount;
}

/**
 * Calculate current learning streak
 */
async function calculateCurrentStreak(userId: string): Promise<number> {
  const progressRecords = await UserProgress.findAll({
    where: {
      userId,
      completed: true,
      completedAt: { [Op.ne]: null },
    },
    attributes: ['completedAt'],
    order: [['completedAt', 'DESC']],
  });

  if (progressRecords.length === 0) return 0;

  const activeDates = new Set<string>();
  for (const record of progressRecords) {
    if (record.completedAt) {
      activeDates.add(new Date(record.completedAt).toISOString().split('T')[0]);
    }
  }

  const sortedDates = Array.from(activeDates).sort().reverse();

  // Check if last activity was today or yesterday
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (sortedDates[0] !== today && sortedDates[0] !== yesterday) {
    return 0; // Streak broken
  }

  let streak = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const current = new Date(sortedDates[i - 1]);
    const previous = new Date(sortedDates[i]);
    const diffDays = Math.floor((current.getTime() - previous.getTime()) / 86400000);

    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Get user badges
 * GET /user/badges
 */
export async function getUserBadges(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const userId = user.userId;

  // Get all badges
  const allBadges = await Badge.findAll({
    order: [['createdAt', 'ASC']],
  });

  // Get user's earned badges
  const earnedBadges = await UserBadge.findAll({
    where: { userId },
    attributes: ['badgeId', 'earnedAt'],
  });

  const earnedMap = new Map<string, Date>();
  for (const ub of earnedBadges) {
    earnedMap.set(ub.badgeId, ub.earnedAt);
  }

  // Build response with progress for non-earned badges
  const badges: BadgeResponse[] = [];

  for (const badge of allBadges) {
    const earnedAt = earnedMap.get(badge.id) || null;
    const response: BadgeResponse = {
      id: badge.id,
      name: badge.name,
      description: badge.description,
      imageUrl: badge.imageUrl,
      category: (badge.category as BadgeCategory) || 'milestone',
      rarity: (badge.rarity as BadgeRarity) || 'common',
      earnedAt,
    };

    // Calculate progress for non-earned badges
    if (!earnedAt) {
      const { progress, requirement } = await calculateBadgeProgress(userId, badge.criteria);
      response.progress = progress;
      response.requirement = requirement;
    }

    badges.push(response);
  }

  ctx.body = {
    data: badges,
  };
}
