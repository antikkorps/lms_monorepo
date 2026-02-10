import Router from '@koa/router';
import {
  listCourseReviews,
  getMyReview,
  createReview,
  updateReview,
  deleteReview,
  listPendingReviews,
  getInstructorReviews,
  moderateReview,
} from './controller.js';
import { authenticate, optionalAuthenticate, requireRole } from '../auth/middleware.js';
import { UserRole } from '../database/models/enums.js';
import { validate, validateQuery } from '../middlewares/validate.js';
import {
  createReviewSchema,
  updateReviewSchema,
  listReviewsQuerySchema,
  listPendingReviewsQuerySchema,
  moderateReviewSchema,
} from './schemas.js';

export const reviewsRouter = new Router({ prefix: '/reviews' });

// Public: list approved reviews for a course
reviewsRouter.get(
  '/',
  optionalAuthenticate,
  validateQuery(listReviewsQuerySchema),
  listCourseReviews
);

// Instructor+: list pending reviews (must come before /:id routes)
reviewsRouter.get(
  '/pending',
  authenticate,
  requireRole(UserRole.INSTRUCTOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN),
  validateQuery(listPendingReviewsQuerySchema),
  listPendingReviews
);

// Instructor+: list reviews for their courses
reviewsRouter.get(
  '/instructor',
  authenticate,
  requireRole(UserRole.INSTRUCTOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN),
  getInstructorReviews
);

// Auth: get my review for a course
reviewsRouter.get(
  '/my/:courseId',
  authenticate,
  getMyReview
);

// Auth: create a review
reviewsRouter.post(
  '/',
  authenticate,
  validate(createReviewSchema),
  createReview
);

// Auth: update own review
reviewsRouter.patch(
  '/:id',
  authenticate,
  validate(updateReviewSchema),
  updateReview
);

// Auth: delete own review
reviewsRouter.delete(
  '/:id',
  authenticate,
  deleteReview
);

// Instructor+: moderate a review
reviewsRouter.post(
  '/:id/moderate',
  authenticate,
  requireRole(UserRole.INSTRUCTOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN),
  validate(moderateReviewSchema),
  moderateReview
);
