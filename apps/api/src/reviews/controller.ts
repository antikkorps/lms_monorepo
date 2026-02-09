import type { Context } from 'koa';
import { CourseReview, Course, User, Purchase } from '../database/models/index.js';
import { ReviewStatus, UserRole, PurchaseStatus, CourseStatus } from '../database/models/enums.js';
import { AppError } from '../utils/app-error.js';
import { sequelize } from '../database/sequelize.js';
import type { CreateReviewInput, UpdateReviewInput, ModerateReviewInput } from './schemas.js';

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

function serializeReview(review: CourseReview) {
  return {
    id: review.id,
    courseId: review.courseId,
    rating: review.rating,
    title: review.title,
    comment: review.comment,
    status: review.status,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    user: review.user
      ? {
          id: review.user.id,
          firstName: review.user.firstName,
          lastName: review.user.lastName,
          avatarUrl: review.user.avatarUrl,
        }
      : null,
  };
}

/**
 * Recalculate course average rating and count from approved reviews
 */
async function recalculateCourseRating(courseId: string): Promise<void> {
  const result = await CourseReview.findOne({
    where: {
      courseId,
      status: ReviewStatus.APPROVED,
    },
    attributes: [
      [sequelize.fn('AVG', sequelize.col('rating')), 'avgRating'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
    ],
    raw: true,
  }) as unknown as { avgRating: string | null; count: string };

  const avgRating = result.avgRating ? parseFloat(result.avgRating) : 0;
  const count = parseInt(result.count, 10) || 0;

  await Course.update(
    {
      averageRating: Math.round(avgRating * 100) / 100,
      ratingsCount: count,
    },
    { where: { id: courseId } }
  );
}

/**
 * List approved reviews for a course (public)
 * GET /reviews?courseId=
 */
export async function listCourseReviews(ctx: Context): Promise<void> {
  const { courseId, page, limit } = ctx.query as unknown as {
    courseId: string;
    page: number;
    limit: number;
  };

  const offset = (page - 1) * limit;

  const { rows, count } = await CourseReview.findAndCountAll({
    where: {
      courseId,
      status: ReviewStatus.APPROVED,
    },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'avatarUrl'],
      },
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  ctx.body = {
    data: {
      reviews: rows.map(serializeReview),
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    },
  };
}

/**
 * Get my review for a course
 * GET /reviews/my/:courseId
 */
export async function getMyReview(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const { courseId } = ctx.params;

  const review = await CourseReview.findOne({
    where: {
      courseId,
      userId: user.userId,
    },
  });

  ctx.body = {
    data: review
      ? {
          id: review.id,
          courseId: review.courseId,
          rating: review.rating,
          title: review.title,
          comment: review.comment,
          status: review.status,
          createdAt: review.createdAt,
          updatedAt: review.updatedAt,
        }
      : null,
  };
}

/**
 * Create a review
 * POST /reviews
 */
export async function createReview(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const { courseId, rating, title, comment } = ctx.request.body as CreateReviewInput;

  // Verify course exists and is published
  const course = await Course.findByPk(courseId);
  if (!course || course.status !== CourseStatus.PUBLISHED) {
    throw AppError.notFound('Course not found');
  }

  // Check enrollment (user must have purchased or have access)
  const purchase = await Purchase.findOne({
    where: {
      userId: user.userId,
      courseId,
      status: PurchaseStatus.COMPLETED,
    },
  });

  if (!purchase) {
    throw AppError.forbidden('You must be enrolled in this course to leave a review');
  }

  // Check for existing review (one per user per course)
  const existing = await CourseReview.findOne({
    where: {
      courseId,
      userId: user.userId,
    },
  });

  if (existing) {
    throw AppError.conflict('You have already reviewed this course');
  }

  const review = await CourseReview.create({
    courseId,
    userId: user.userId,
    rating,
    title,
    comment,
    status: ReviewStatus.PENDING,
  });

  ctx.status = 201;
  ctx.body = {
    data: {
      id: review.id,
      courseId: review.courseId,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      status: review.status,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    },
  };
}

/**
 * Update own review
 * PATCH /reviews/:id
 */
export async function updateReview(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const { id } = ctx.params;
  const body = ctx.request.body as UpdateReviewInput;

  const review = await CourseReview.findByPk(id);
  if (!review) {
    throw AppError.notFound('Review not found');
  }

  if (review.userId !== user.userId) {
    throw AppError.forbidden('You can only edit your own review');
  }

  // Reset to pending on edit
  await review.update({
    ...body,
    status: ReviewStatus.PENDING,
    moderatedById: null,
    moderatedAt: null,
    moderationNote: null,
  });

  // Recalculate since old approved review might now be pending
  await recalculateCourseRating(review.courseId);

  ctx.body = {
    data: {
      id: review.id,
      courseId: review.courseId,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      status: review.status,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    },
  };
}

/**
 * Delete own review (soft-delete)
 * DELETE /reviews/:id
 */
export async function deleteReview(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const { id } = ctx.params;

  const review = await CourseReview.findByPk(id);
  if (!review) {
    throw AppError.notFound('Review not found');
  }

  if (review.userId !== user.userId) {
    throw AppError.forbidden('You can only delete your own review');
  }

  const courseId = review.courseId;
  await review.destroy(); // paranoid soft-delete

  await recalculateCourseRating(courseId);

  ctx.status = 204;
}

/**
 * List pending reviews for moderation (instructor+)
 * GET /reviews/pending
 */
export async function listPendingReviews(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const { page = 1, limit = 20 } = ctx.query as unknown as {
    page: number;
    limit: number;
  };

  const offset = (Number(page) - 1) * Number(limit);

  // Build where clause: instructor sees only their courses' reviews
  const whereClause: Record<string, unknown> = {
    status: ReviewStatus.PENDING,
  };

  let courseWhere: Record<string, unknown> | undefined;
  if (user.role === UserRole.INSTRUCTOR) {
    courseWhere = { instructorId: user.userId };
  }

  const { rows, count } = await CourseReview.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'avatarUrl'],
      },
      {
        model: Course,
        as: 'course',
        attributes: ['id', 'title', 'slug'],
        ...(courseWhere ? { where: courseWhere } : {}),
      },
    ],
    order: [['createdAt', 'ASC']],
    limit: Number(limit),
    offset,
  });

  ctx.body = {
    data: {
      reviews: rows.map((review) => ({
        ...serializeReview(review),
        course: review.course
          ? {
              id: review.course.id,
              title: review.course.title,
              slug: review.course.slug,
            }
          : null,
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count,
        totalPages: Math.ceil(count / Number(limit)),
      },
    },
  };
}

/**
 * Get reviews for instructor's courses
 * GET /reviews/instructor
 */
export async function getInstructorReviews(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const { page = 1, limit = 20 } = ctx.query as unknown as {
    page: number;
    limit: number;
  };

  const offset = (Number(page) - 1) * Number(limit);

  const courseWhere: Record<string, unknown> = {};
  if (user.role === UserRole.INSTRUCTOR) {
    courseWhere.instructorId = user.userId;
  }

  const { rows, count } = await CourseReview.findAndCountAll({
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'avatarUrl'],
      },
      {
        model: Course,
        as: 'course',
        attributes: ['id', 'title', 'slug'],
        where: courseWhere,
      },
    ],
    order: [['createdAt', 'DESC']],
    limit: Number(limit),
    offset,
  });

  ctx.body = {
    data: {
      reviews: rows.map((review) => ({
        ...serializeReview(review),
        course: review.course
          ? {
              id: review.course.id,
              title: review.course.title,
              slug: review.course.slug,
            }
          : null,
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count,
        totalPages: Math.ceil(count / Number(limit)),
      },
    },
  };
}

/**
 * Moderate a review (approve/reject)
 * POST /reviews/:id/moderate
 */
export async function moderateReview(ctx: Context): Promise<void> {
  const user = getAuthenticatedUser(ctx);
  const { id } = ctx.params;
  const { action, note } = ctx.request.body as ModerateReviewInput;

  const review = await CourseReview.findByPk(id, {
    include: [
      {
        model: Course,
        as: 'course',
        attributes: ['id', 'instructorId'],
      },
    ],
  });

  if (!review) {
    throw AppError.notFound('Review not found');
  }

  // Instructors can only moderate reviews on their own courses
  if (
    user.role === UserRole.INSTRUCTOR &&
    review.course?.instructorId !== user.userId
  ) {
    throw AppError.forbidden('You can only moderate reviews on your own courses');
  }

  const newStatus =
    action === 'approve' ? ReviewStatus.APPROVED : ReviewStatus.REJECTED;

  await review.update({
    status: newStatus,
    moderatedById: user.userId,
    moderatedAt: new Date(),
    moderationNote: note || null,
  });

  await recalculateCourseRating(review.courseId);

  ctx.body = {
    data: {
      id: review.id,
      courseId: review.courseId,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      status: review.status,
      moderatedAt: review.moderatedAt,
      moderationNote: review.moderationNote,
    },
  };
}
