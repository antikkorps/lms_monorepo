import Router from '@koa/router';
import {
  listLessonContents,
  getLessonContentByLang,
  createLessonContent,
  upsertLessonContent,
  updateLessonContent,
  deleteLessonContent,
} from './controller.js';
import { authenticate, requireRole } from '../auth/middleware.js';
import { validate, validateQuery } from '../middlewares/validate.js';
import {
  createLessonContentSchema,
  upsertLessonContentSchema,
  updateLessonContentSchema,
  listLessonContentsQuerySchema,
} from './schemas.js';
import { UserRole } from '../database/models/enums.js';

export const lessonContentRouter = new Router({ prefix: '/lessons/:lessonId/content' });

// List all content for a lesson (all locales)
// GET /api/v1/lessons/:lessonId/content
lessonContentRouter.get(
  '/',
  authenticate,
  requireRole(UserRole.INSTRUCTOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN),
  validateQuery(listLessonContentsQuerySchema),
  listLessonContents
);

// Get content for a specific locale
// GET /api/v1/lessons/:lessonId/content/:lang
lessonContentRouter.get(
  '/:lang',
  authenticate,
  requireRole(UserRole.INSTRUCTOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN),
  getLessonContentByLang
);

// Create content for a specific locale
// POST /api/v1/lessons/:lessonId/content
lessonContentRouter.post(
  '/',
  authenticate,
  requireRole(UserRole.INSTRUCTOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN),
  validate(createLessonContentSchema),
  createLessonContent
);

// Upsert (create or update) content for a specific locale
// PUT /api/v1/lessons/:lessonId/content
lessonContentRouter.put(
  '/',
  authenticate,
  requireRole(UserRole.INSTRUCTOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN),
  validate(upsertLessonContentSchema),
  upsertLessonContent
);

// Update content for a specific locale
// PATCH /api/v1/lessons/:lessonId/content/:lang
lessonContentRouter.patch(
  '/:lang',
  authenticate,
  requireRole(UserRole.INSTRUCTOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN),
  validate(updateLessonContentSchema),
  updateLessonContent
);

// Delete content for a specific locale
// DELETE /api/v1/lessons/:lessonId/content/:lang
lessonContentRouter.delete(
  '/:lang',
  authenticate,
  requireRole(UserRole.INSTRUCTOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN),
  deleteLessonContent
);
