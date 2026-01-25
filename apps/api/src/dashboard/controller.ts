/**
 * Dashboard Controller
 * Provides endpoints for learner dashboard data
 */

import type { Context } from 'koa';
import { Op } from 'sequelize';
import {
  Course,
  Chapter,
  Lesson,
  User,
  Purchase,
  UserProgress,
  Badge,
  UserBadge,
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

/**
 * Get learner dashboard data
 * GET /learner/dashboard
 */
export async function getLearnerDashboard(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const userId = user.userId;

  // Get user's enrolled courses (purchases with status completed)
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
        include: [
          {
            model: User,
            as: 'instructor',
            attributes: ['id', 'firstName', 'lastName', 'avatarUrl'],
          },
          {
            model: Chapter,
            as: 'chapters',
            include: [
              {
                model: Lesson,
                as: 'lessons',
                attributes: ['id'],
              },
            ],
          },
        ],
      },
    ],
  });

  const enrolledCourseIds = purchases.map((p) => p.courseId);

  // Get progress for all enrolled courses
  const progressRecords = await UserProgress.findAll({
    where: {
      userId,
      courseId: { [Op.in]: enrolledCourseIds },
      completed: true,
    },
    attributes: ['courseId', 'lessonId', 'progressSeconds', 'completedAt'],
  });

  // Group progress by course
  const progressByCoursе: Map<
    string,
    { completedLessons: Set<string>; lastAccessed: Date | null; totalTime: number }
  > = new Map();

  for (const progress of progressRecords) {
    if (!progressByCoursе.has(progress.courseId)) {
      progressByCoursе.set(progress.courseId, {
        completedLessons: new Set(),
        lastAccessed: null,
        totalTime: 0,
      });
    }
    const courseProgress = progressByCoursе.get(progress.courseId)!;
    courseProgress.completedLessons.add(progress.lessonId);
    courseProgress.totalTime += progress.progressSeconds || 0;
    if (
      progress.completedAt &&
      (!courseProgress.lastAccessed || progress.completedAt > courseProgress.lastAccessed)
    ) {
      courseProgress.lastAccessed = progress.completedAt;
    }
  }

  // Build in-progress courses
  const inProgressCourses: Array<{
    id: string;
    title: string;
    slug: string;
    description: string | null;
    thumbnailUrl: string | null;
    instructorName: string;
    price: number;
    currency: string;
    duration: number;
    chaptersCount: number;
    lessonsCount: number;
    progress: number;
    lastAccessedAt: Date | null;
    nextLessonTitle: string | null;
  }> = [];

  let completedCoursesCount = 0;
  let totalLearningTime = 0;

  for (const purchase of purchases) {
    const course = purchase.course;
    if (!course) continue;

    // Calculate total lessons for this course
    let totalLessons = 0;
    let firstIncompleteLessonTitle: string | null = null;

    for (const chapter of course.chapters || []) {
      for (const lesson of chapter.lessons || []) {
        totalLessons++;
        const courseProgress = progressByCoursе.get(course.id);
        if (!firstIncompleteLessonTitle && !courseProgress?.completedLessons.has(lesson.id)) {
          // Find full lesson data
          const fullLesson = await Lesson.findByPk(lesson.id, { attributes: ['title'] });
          firstIncompleteLessonTitle = fullLesson?.title || null;
        }
      }
    }

    const courseProgress = progressByCoursе.get(course.id);
    const completedLessonsCount = courseProgress?.completedLessons.size || 0;
    const progressPercent =
      totalLessons > 0 ? Math.round((completedLessonsCount / totalLessons) * 100) : 0;

    totalLearningTime += courseProgress?.totalTime || 0;

    // Course is complete if all lessons are done
    if (progressPercent >= 100) {
      completedCoursesCount++;
    } else {
      // Add to in-progress list
      const instructor = course.instructor;
      inProgressCourses.push({
        id: course.id,
        title: course.title,
        slug: course.slug,
        description: course.description,
        thumbnailUrl: course.thumbnailUrl,
        instructorName: instructor
          ? `${instructor.firstName} ${instructor.lastName}`
          : 'Unknown',
        price: Number(course.price), // Keep in actual currency, frontend will format
        currency: course.currency || 'EUR',
        duration: Math.floor(course.duration / 60), // Convert seconds to minutes
        chaptersCount: course.chaptersCount,
        lessonsCount: course.lessonsCount,
        progress: progressPercent,
        lastAccessedAt: courseProgress?.lastAccessed || null,
        nextLessonTitle: firstIncompleteLessonTitle,
      });
    }
  }

  // Sort in-progress courses by last accessed
  inProgressCourses.sort((a, b) => {
    if (!a.lastAccessedAt) return 1;
    if (!b.lastAccessedAt) return -1;
    return b.lastAccessedAt.getTime() - a.lastAccessedAt.getTime();
  });

  // Get recent badges
  const userBadges = await UserBadge.findAll({
    where: { userId },
    include: [
      {
        model: Badge,
        as: 'badge',
        attributes: ['id', 'name', 'description', 'imageUrl'],
      },
    ],
    order: [['earnedAt', 'DESC']],
    limit: 5,
  });

  const recentBadges = userBadges.map((ub) => ({
    id: ub.badge?.id || ub.badgeId,
    name: ub.badge?.name || 'Unknown Badge',
    description: ub.badge?.description || '',
    imageUrl: ub.badge?.imageUrl || '',
    earnedAt: ub.earnedAt,
    courseId: ub.courseId || undefined,
  }));

  // Build stats
  const stats = {
    enrolledCourses: enrolledCourseIds.length,
    completedCourses: completedCoursesCount,
    inProgressCourses: inProgressCourses.length,
    totalBadges: await UserBadge.count({ where: { userId } }),
    totalLearningTime: Math.round(totalLearningTime / 60), // Convert seconds to minutes
  };

  ctx.body = {
    data: {
      stats,
      inProgressCourses: inProgressCourses.slice(0, 5), // Limit to 5
      recentBadges,
    },
  };
}

/**
 * Get learner progress for all enrolled courses
 * GET /learner/progress
 */
export async function getLearnerProgress(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const userId = user.userId;

  // Get user's enrolled courses (purchases with status completed)
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
        include: [
          {
            model: User,
            as: 'instructor',
            attributes: ['id', 'firstName', 'lastName', 'avatarUrl'],
          },
          {
            model: Chapter,
            as: 'chapters',
            include: [
              {
                model: Lesson,
                as: 'lessons',
                attributes: ['id', 'title', 'duration'],
                order: [['position', 'ASC']],
              },
            ],
            order: [['position', 'ASC']],
          },
        ],
      },
    ],
  });

  const enrolledCourseIds = purchases.map((p) => p.courseId);

  // Get progress for all enrolled courses
  const progressRecords = await UserProgress.findAll({
    where: {
      userId,
      courseId: { [Op.in]: enrolledCourseIds },
      completed: true,
    },
    attributes: ['courseId', 'lessonId', 'progressSeconds', 'completedAt'],
  });

  // Group progress by course
  const progressByCourse: Map<
    string,
    { completedLessons: Set<string>; lastAccessed: Date | null; totalTime: number }
  > = new Map();

  for (const progress of progressRecords) {
    if (!progressByCourse.has(progress.courseId)) {
      progressByCourse.set(progress.courseId, {
        completedLessons: new Set(),
        lastAccessed: null,
        totalTime: 0,
      });
    }
    const courseProgress = progressByCourse.get(progress.courseId)!;
    courseProgress.completedLessons.add(progress.lessonId);
    courseProgress.totalTime += progress.progressSeconds || 0;
    if (
      progress.completedAt &&
      (!courseProgress.lastAccessed || progress.completedAt > courseProgress.lastAccessed)
    ) {
      courseProgress.lastAccessed = progress.completedAt;
    }
  }

  // Build all courses with progress
  const courses: Array<{
    id: string;
    title: string;
    slug: string;
    description: string | null;
    thumbnailUrl: string | null;
    instructorName: string;
    price: number;
    currency: string;
    duration: number;
    chaptersCount: number;
    lessonsCount: number;
    progress: number;
    completedLessons: number;
    totalLessons: number;
    lastAccessedAt: Date | null;
    completedAt: Date | null;
    nextLessonId: string | null;
    nextLessonTitle: string | null;
    estimatedTimeLeft: number;
  }> = [];

  let completedCoursesCount = 0;
  let totalLearningTime = 0;

  for (const purchase of purchases) {
    const course = purchase.course;
    if (!course) continue;

    // Calculate total lessons and find next incomplete lesson
    let totalLessons = 0;
    let firstIncompleteLessonId: string | null = null;
    let firstIncompleteLessonTitle: string | null = null;
    let remainingDuration = 0;

    const courseProgress = progressByCourse.get(course.id);

    for (const chapter of course.chapters || []) {
      for (const lesson of chapter.lessons || []) {
        totalLessons++;
        const isCompleted = courseProgress?.completedLessons.has(lesson.id);

        if (!isCompleted) {
          remainingDuration += lesson.duration || 0;
          if (!firstIncompleteLessonId) {
            firstIncompleteLessonId = lesson.id;
            firstIncompleteLessonTitle = lesson.title;
          }
        }
      }
    }

    const completedLessonsCount = courseProgress?.completedLessons.size || 0;
    const progressPercent =
      totalLessons > 0 ? Math.round((completedLessonsCount / totalLessons) * 100) : 0;

    totalLearningTime += courseProgress?.totalTime || 0;

    const isCompleted = progressPercent >= 100;
    if (isCompleted) {
      completedCoursesCount++;
    }

    const instructor = course.instructor;
    courses.push({
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      thumbnailUrl: course.thumbnailUrl,
      instructorName: instructor
        ? `${instructor.firstName} ${instructor.lastName}`
        : 'Unknown',
      price: Number(course.price),
      currency: course.currency || 'EUR',
      duration: Math.floor(course.duration / 60), // Convert seconds to minutes
      chaptersCount: course.chaptersCount,
      lessonsCount: course.lessonsCount,
      progress: progressPercent,
      completedLessons: completedLessonsCount,
      totalLessons,
      lastAccessedAt: courseProgress?.lastAccessed || purchase.createdAt,
      completedAt: isCompleted ? courseProgress?.lastAccessed || null : null,
      nextLessonId: firstIncompleteLessonId,
      nextLessonTitle: firstIncompleteLessonTitle,
      estimatedTimeLeft: Math.floor(remainingDuration / 60), // Convert to minutes
    });
  }

  // Sort by last accessed
  courses.sort((a, b) => {
    if (!a.lastAccessedAt) return 1;
    if (!b.lastAccessedAt) return -1;
    return new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime();
  });

  // Build stats
  const stats = {
    totalCourses: enrolledCourseIds.length,
    inProgressCourses: enrolledCourseIds.length - completedCoursesCount,
    completedCourses: completedCoursesCount,
    totalLearningTime: Math.round(totalLearningTime / 60), // Convert seconds to minutes
    currentStreak: 0, // TODO: Calculate actual streak
    longestStreak: 0, // TODO: Calculate actual streak
  };

  ctx.body = {
    data: {
      courses,
      stats,
    },
  };
}
