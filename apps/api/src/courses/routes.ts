import Router from '@koa/router';
import {
  listCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  publishCourse,
  getMyCourses,
  listChapters,
  createChapter,
  updateChapter,
  deleteChapter,
  reorderChapters,
  listLessons,
  createLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
  getLesson,
} from './controller.js';
import { authenticate, optionalAuthenticate, requireRole } from '../auth/middleware.js';
import { UserRole } from '../database/models/enums.js';
import { validate } from '../middlewares/validate.js';
import { z } from 'zod';

// Validation schemas
const createCourseSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens').optional(),
  description: z.string().max(5000).optional(),
  thumbnailUrl: z.string().url().optional(),
  price: z.number().nonnegative().default(0),
});

const updateCourseSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).nullable().optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  price: z.number().nonnegative().optional(),
});

const createChapterSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  position: z.number().int().nonnegative().optional(),
});

const lessonTypeEnum = z.enum(['video', 'quiz', 'document', 'assignment']);

const createLessonSchema = z.object({
  title: z.string().min(1).max(255),
  type: lessonTypeEnum.optional(),
  videoUrl: z.string().url().optional(),
  videoId: z.string().optional(),
  duration: z.number().int().nonnegative().optional(),
  position: z.number().int().nonnegative().optional(),
  isFree: z.boolean().default(false),
  requiresPrevious: z.boolean().default(true),
});

export const coursesRouter = new Router({ prefix: '/courses' });

// Validation schemas for reorder
const reorderSchema = z.object({
  order: z.array(z.string().uuid()),
});

const updateChapterSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
  position: z.number().int().nonnegative().optional(),
});

const updateLessonSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  type: z.enum(['video', 'quiz', 'document', 'assignment']).optional(),
  videoUrl: z.string().url().nullable().optional(),
  videoId: z.string().nullable().optional(),
  duration: z.number().int().nonnegative().optional(),
  position: z.number().int().nonnegative().optional(),
  isFree: z.boolean().optional(),
  requiresPrevious: z.boolean().optional(),
});

// =============================================================================
// Course routes
// =============================================================================

// Public routes (with optional auth for filtering)
coursesRouter.get('/', optionalAuthenticate, listCourses);

// Protected routes - instructor/admin only
// IMPORTANT: /my must come BEFORE /:id to avoid being matched as an id
coursesRouter.get(
  '/my',
  authenticate,
  requireRole(UserRole.INSTRUCTOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN),
  getMyCourses
);

coursesRouter.get('/:id', optionalAuthenticate, getCourse);

coursesRouter.post(
  '/',
  authenticate,
  requireRole(UserRole.INSTRUCTOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN),
  validate(createCourseSchema),
  createCourse
);

coursesRouter.patch(
  '/:id',
  authenticate,
  requireRole(UserRole.INSTRUCTOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN),
  validate(updateCourseSchema),
  updateCourse
);

coursesRouter.delete(
  '/:id',
  authenticate,
  requireRole(UserRole.INSTRUCTOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN),
  deleteCourse
);

coursesRouter.post(
  '/:id/publish',
  authenticate,
  requireRole(UserRole.INSTRUCTOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN),
  publishCourse
);

// =============================================================================
// Chapter routes (nested under courses)
// =============================================================================

coursesRouter.get('/:courseId/chapters', optionalAuthenticate, listChapters);

coursesRouter.post(
  '/:courseId/chapters',
  authenticate,
  requireRole(UserRole.INSTRUCTOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN),
  validate(createChapterSchema),
  createChapter
);

coursesRouter.patch(
  '/:courseId/chapters/:id',
  authenticate,
  requireRole(UserRole.INSTRUCTOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN),
  validate(updateChapterSchema),
  updateChapter
);

coursesRouter.delete(
  '/:courseId/chapters/:id',
  authenticate,
  requireRole(UserRole.INSTRUCTOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN),
  deleteChapter
);

coursesRouter.patch(
  '/:courseId/chapters/reorder',
  authenticate,
  requireRole(UserRole.INSTRUCTOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN),
  validate(reorderSchema),
  reorderChapters
);

// =============================================================================
// Lesson routes (nested under chapters)
// =============================================================================

coursesRouter.get('/:courseId/chapters/:chapterId/lessons', optionalAuthenticate, listLessons);

coursesRouter.post(
  '/:courseId/chapters/:chapterId/lessons',
  authenticate,
  requireRole(UserRole.INSTRUCTOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN),
  validate(createLessonSchema),
  createLesson
);

coursesRouter.patch(
  '/:courseId/chapters/:chapterId/lessons/reorder',
  authenticate,
  requireRole(UserRole.INSTRUCTOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN),
  validate(reorderSchema),
  reorderLessons
);

// Lesson routes at root level (for easier access)
export const lessonsRouter = new Router({ prefix: '/lessons' });

// Get a single lesson with localized content
lessonsRouter.get('/:id', optionalAuthenticate, getLesson);

lessonsRouter.patch(
  '/:id',
  authenticate,
  requireRole(UserRole.INSTRUCTOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN),
  validate(updateLessonSchema),
  updateLesson
);

lessonsRouter.delete(
  '/:id',
  authenticate,
  requireRole(UserRole.INSTRUCTOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN),
  deleteLesson
);
