import Router from '@koa/router';
import { authenticate, optionalAuthenticate, requireRole } from '../auth/middleware.js';
import { UserRole } from '../database/models/enums.js';
import { validate } from '../middlewares/validate.js';
import {
  createPathSchema,
  updatePathSchema,
  addPathCourseSchema,
  reorderPathCoursesSchema,
  setPrerequisitesSchema,
} from './schemas.js';
import {
  listPaths,
  getPath,
  createPath,
  updatePath,
  deletePath,
  addCourseToPath,
  removeCourseFromPath,
  reorderPathCourses,
  getPathProgress,
  getPrerequisites,
  setPrerequisites,
  checkPrerequisitesMet,
} from './controller.js';

export const pathsRouter = new Router({ prefix: '/paths' });

const instructorAuth = [
  authenticate,
  requireRole(UserRole.INSTRUCTOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN),
];

// Public path listing
pathsRouter.get('/', optionalAuthenticate, listPaths);

// Path detail (by ID or slug)
pathsRouter.get('/:id', optionalAuthenticate, getPath);

// Path CRUD (instructor+)
pathsRouter.post('/', ...instructorAuth, validate(createPathSchema), createPath);
pathsRouter.patch('/:id', ...instructorAuth, validate(updatePathSchema), updatePath);
pathsRouter.delete('/:id', ...instructorAuth, deletePath);

// Path courses management
pathsRouter.post('/:id/courses', ...instructorAuth, validate(addPathCourseSchema), addCourseToPath);
pathsRouter.delete('/:id/courses/:courseId', ...instructorAuth, removeCourseFromPath);
pathsRouter.patch('/:id/courses/reorder', ...instructorAuth, validate(reorderPathCoursesSchema), reorderPathCourses);

// Path progress (authenticated)
pathsRouter.get('/:id/progress', authenticate, getPathProgress);

// Prerequisites router (mounted on courses)
export const prerequisitesRouter = new Router({ prefix: '/courses' });

prerequisitesRouter.get('/:id/prerequisites', optionalAuthenticate, getPrerequisites);
prerequisitesRouter.put(
  '/:id/prerequisites',
  ...instructorAuth,
  validate(setPrerequisitesSchema),
  setPrerequisites
);
prerequisitesRouter.get('/:id/prerequisites/check', authenticate, checkPrerequisitesMet);
