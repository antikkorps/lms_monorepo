/**
 * Analytics Controller
 * Provides learning analytics data for learners
 */

import type { Context } from 'koa';
import { Op } from 'sequelize';
import {
  Course,
  Purchase,
  UserProgress,
  QuizResult,
} from '../database/models/index.js';
import { CourseStatus, PurchaseStatus, UserRole } from '../database/models/enums.js';
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

interface DailyActivity {
  date: string;
  lessonsCompleted: number;
  minutesSpent: number;
  quizzesTaken: number;
}

interface CourseProgressItem {
  courseId: string;
  courseName: string;
  progress: number;
  lessonsCompleted: number;
  totalLessons: number;
}

interface WeeklyStreak {
  week: string;
  daysActive: number;
  totalMinutes: number;
}

interface AnalyticsSummary {
  totalCourses: number;
  completedCourses: number;
  totalLessons: number;
  completedLessons: number;
  totalMinutes: number;
  averageQuizScore: number;
  currentStreak: number;
  longestStreak: number;
}

/**
 * Get learner analytics data
 * GET /learner/analytics
 */
export async function getLearnerAnalytics(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const userId = user.userId;

  // Get date range (last 30 days)
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  // Get enrolled courses
  const purchases = await Purchase.findAll({
    where: {
      userId,
      status: PurchaseStatus.COMPLETED,
    },
    include: [
      {
        model: Course,
        as: 'course',
        where: { status: CourseStatus.PUBLISHED },
        attributes: ['id', 'title', 'lessonsCount'],
      },
    ],
  });

  const enrolledCourseIds = purchases.map((p) => p.courseId);

  // Get all progress records for enrolled courses
  const allProgress = await UserProgress.findAll({
    where: {
      userId,
      courseId: { [Op.in]: enrolledCourseIds },
    },
    attributes: ['courseId', 'lessonId', 'completed', 'progressSeconds', 'completedAt', 'updatedAt'],
  });

  // Get quiz results for last 30 days
  const quizResults = await QuizResult.findAll({
    where: {
      userId,
      completedAt: {
        [Op.between]: [thirtyDaysAgo, today],
      },
    },
    attributes: ['score', 'maxScore', 'completedAt'],
  });

  // Calculate daily activity for last 30 days
  const dailyActivity: DailyActivity[] = [];
  const activityByDate = new Map<string, { lessons: number; minutes: number; quizzes: number }>();

  // Initialize all 30 days with zeros
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - (29 - i));
    const dateStr = date.toISOString().split('T')[0];
    activityByDate.set(dateStr, { lessons: 0, minutes: 0, quizzes: 0 });
  }

  // Count completed lessons by date
  for (const progress of allProgress) {
    if (progress.completed && progress.completedAt) {
      const dateStr = new Date(progress.completedAt).toISOString().split('T')[0];
      const activity = activityByDate.get(dateStr);
      if (activity) {
        activity.lessons++;
        activity.minutes += Math.floor((progress.progressSeconds || 0) / 60);
      }
    }
  }

  // Count quizzes by date
  for (const quiz of quizResults) {
    const dateStr = new Date(quiz.completedAt).toISOString().split('T')[0];
    const activity = activityByDate.get(dateStr);
    if (activity) {
      activity.quizzes++;
    }
  }

  // Convert to array
  for (const [date, activity] of activityByDate) {
    dailyActivity.push({
      date,
      lessonsCompleted: activity.lessons,
      minutesSpent: activity.minutes,
      quizzesTaken: activity.quizzes,
    });
  }

  // Sort by date ascending
  dailyActivity.sort((a, b) => a.date.localeCompare(b.date));

  // Calculate course progress
  const courseProgress: CourseProgressItem[] = [];
  const progressByCourse = new Map<string, Set<string>>();

  for (const progress of allProgress) {
    if (progress.completed) {
      if (!progressByCourse.has(progress.courseId)) {
        progressByCourse.set(progress.courseId, new Set());
      }
      progressByCourse.get(progress.courseId)!.add(progress.lessonId);
    }
  }

  let completedCoursesCount = 0;
  let totalLessonsCompleted = 0;
  let totalLessonsCount = 0;

  for (const purchase of purchases) {
    const course = purchase.course;
    if (!course) continue;

    const completedLessons = progressByCourse.get(course.id)?.size || 0;
    const totalLessons = course.lessonsCount || 0;
    const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    totalLessonsCompleted += completedLessons;
    totalLessonsCount += totalLessons;

    if (progress >= 100) {
      completedCoursesCount++;
    }

    courseProgress.push({
      courseId: course.id,
      courseName: course.title,
      progress,
      lessonsCompleted: completedLessons,
      totalLessons,
    });
  }

  // Sort by progress descending
  courseProgress.sort((a, b) => b.progress - a.progress);

  // Calculate weekly streaks (last 8 weeks)
  const weeklyStreaks: WeeklyStreak[] = [];
  const now = new Date();

  for (let weekNum = 7; weekNum >= 0; weekNum--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekNum * 7 - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const daysWithActivity = new Set<string>();
    let totalMinutes = 0;

    for (const progress of allProgress) {
      if (progress.completedAt) {
        const completedDate = new Date(progress.completedAt);
        if (completedDate >= weekStart && completedDate <= weekEnd) {
          daysWithActivity.add(completedDate.toISOString().split('T')[0]);
          totalMinutes += Math.floor((progress.progressSeconds || 0) / 60);
        }
      }
    }

    weeklyStreaks.push({
      week: `Week ${8 - weekNum}`,
      daysActive: daysWithActivity.size,
      totalMinutes,
    });
  }

  // Calculate current streak
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  // Get all unique dates with activity
  const activeDates = new Set<string>();
  for (const progress of allProgress) {
    if (progress.completed && progress.completedAt) {
      activeDates.add(new Date(progress.completedAt).toISOString().split('T')[0]);
    }
  }

  // Calculate streaks
  const sortedDates = Array.from(activeDates).sort();
  let prevDate: Date | null = null;

  for (const dateStr of sortedDates) {
    const date = new Date(dateStr);
    if (prevDate) {
      const diffDays = Math.floor((date.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    } else {
      tempStreak = 1;
    }
    prevDate = date;
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  // Check if current streak is still active (last activity was today or yesterday)
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

  if (activeDates.has(todayStr) || activeDates.has(yesterdayStr)) {
    currentStreak = tempStreak;
  }

  // Calculate average quiz score
  let averageQuizScore = 0;
  if (quizResults.length > 0) {
    const totalPercentage = quizResults.reduce((sum, qr) => {
      return sum + (qr.maxScore > 0 ? (qr.score / qr.maxScore) * 100 : 0);
    }, 0);
    averageQuizScore = Math.round(totalPercentage / quizResults.length);
  }

  // Calculate total minutes
  const totalMinutes = allProgress.reduce((sum, p) => sum + Math.floor((p.progressSeconds || 0) / 60), 0);

  // Build summary
  const summary: AnalyticsSummary = {
    totalCourses: enrolledCourseIds.length,
    completedCourses: completedCoursesCount,
    totalLessons: totalLessonsCount,
    completedLessons: totalLessonsCompleted,
    totalMinutes,
    averageQuizScore,
    currentStreak,
    longestStreak,
  };

  ctx.body = {
    data: {
      dailyActivity,
      courseProgress,
      categoryDistribution: [], // No categories in Course model yet
      weeklyStreaks,
      summary,
    },
  };
}
