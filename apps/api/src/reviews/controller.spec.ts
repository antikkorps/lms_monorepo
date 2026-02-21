import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context } from 'koa';
import { ReviewStatus, UserRole, PurchaseStatus, CourseStatus } from '../database/models/enums.js';

// =============================================================================
// Module Mocks
// =============================================================================

const mockCourseReview = {
  findAndCountAll: vi.fn(),
  findOne: vi.fn(),
  findByPk: vi.fn(),
  create: vi.fn(),
};

const mockCourse = {
  findByPk: vi.fn(),
  update: vi.fn(),
};

const mockUser = {};

const mockPurchase = {
  findOne: vi.fn(),
};

vi.mock('../database/models/index.js', () => ({
  CourseReview: mockCourseReview,
  Course: mockCourse,
  User: mockUser,
  Purchase: mockPurchase,
}));

vi.mock('../database/sequelize.js', () => ({
  sequelize: {
    fn: vi.fn((...args: unknown[]) => args),
    col: vi.fn((name: string) => name),
  },
}));

vi.mock('../utils/app-error.js', () => ({
  AppError: {
    unauthorized: (msg: string) => ({ status: 401, message: msg }),
    notFound: (msg: string) => ({ status: 404, message: msg }),
    forbidden: (msg: string) => ({ status: 403, message: msg }),
    conflict: (msg: string) => ({ status: 409, message: msg }),
  },
}));

vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

// =============================================================================
// Test Helpers
// =============================================================================

function createMockContext(overrides: Partial<Context> = {}): Context {
  return {
    state: {
      user: {
        userId: 'user-123',
        email: 'user@test.com',
        role: UserRole.LEARNER,
        tenantId: null,
      },
    },
    query: {},
    params: {},
    request: { body: {} },
    body: undefined,
    status: 200,
    ...overrides,
  } as unknown as Context;
}

function createMockReview(overrides = {}) {
  const data = {
    id: 'review-1',
    courseId: 'course-1',
    userId: 'user-123',
    rating: 4,
    title: 'Great course',
    comment: 'Learned a lot',
    status: ReviewStatus.APPROVED,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    user: {
      id: 'user-123',
      firstName: 'John',
      lastName: 'Doe',
      avatarUrl: null,
    },
    course: null,
    moderatedAt: null,
    moderationNote: null,
    moderatedById: null,
    ...overrides,
  };

  return {
    ...data,
    update: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn().mockResolvedValue(undefined),
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('ReviewsController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listCourseReviews', () => {
    it('should return paginated approved reviews', async () => {
      const review = createMockReview();
      mockCourseReview.findAndCountAll.mockResolvedValue({ rows: [review], count: 1 });

      const ctx = createMockContext({
        query: { courseId: 'course-1', page: 1, limit: 10 } as unknown as Record<string, string>,
      });

      const { listCourseReviews } = await import('./controller.js');
      await listCourseReviews(ctx);

      const body = ctx.body as { data: { reviews: unknown[]; pagination: { total: number } } };
      expect(body.data.reviews).toHaveLength(1);
      expect(body.data.pagination.total).toBe(1);
    });

    it('should return empty list for course with no reviews', async () => {
      mockCourseReview.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      const ctx = createMockContext({
        query: { courseId: 'course-1', page: 1, limit: 10 } as unknown as Record<string, string>,
      });

      const { listCourseReviews } = await import('./controller.js');
      await listCourseReviews(ctx);

      const body = ctx.body as { data: { reviews: unknown[] } };
      expect(body.data.reviews).toHaveLength(0);
    });
  });

  describe('getMyReview', () => {
    it('should return user review for course', async () => {
      const review = createMockReview();
      mockCourseReview.findOne.mockResolvedValue(review);

      const ctx = createMockContext({ params: { courseId: 'course-1' } });

      const { getMyReview } = await import('./controller.js');
      await getMyReview(ctx);

      const body = ctx.body as { data: { id: string } };
      expect(body.data.id).toBe('review-1');
    });

    it('should return null when no review exists', async () => {
      mockCourseReview.findOne.mockResolvedValue(null);

      const ctx = createMockContext({ params: { courseId: 'course-1' } });

      const { getMyReview } = await import('./controller.js');
      await getMyReview(ctx);

      expect(ctx.body).toEqual({ data: null });
    });

    it('should throw unauthorized without user', async () => {
      const ctx = createMockContext({ state: {} });

      const { getMyReview } = await import('./controller.js');

      await expect(getMyReview(ctx)).rejects.toEqual({
        status: 401,
        message: 'Authentication required',
      });
    });
  });

  describe('createReview', () => {
    it('should create a review for enrolled user', async () => {
      mockCourse.findByPk.mockResolvedValue({ id: 'course-1', status: CourseStatus.PUBLISHED });
      mockPurchase.findOne.mockResolvedValue({ id: 'purchase-1' });
      mockCourseReview.findOne.mockResolvedValue(null);
      mockCourseReview.create.mockResolvedValue(
        createMockReview({ status: ReviewStatus.PENDING })
      );

      const ctx = createMockContext({
        request: { body: { courseId: 'course-1', rating: 5, title: 'Amazing', comment: 'Great!' } } as unknown as Context['request'],
      });

      const { createReview } = await import('./controller.js');
      await createReview(ctx);

      expect(ctx.status).toBe(201);
      expect(mockCourseReview.create).toHaveBeenCalledWith(
        expect.objectContaining({
          courseId: 'course-1',
          userId: 'user-123',
          rating: 5,
          status: ReviewStatus.PENDING,
        })
      );
    });

    it('should throw 404 when course not found', async () => {
      mockCourse.findByPk.mockResolvedValue(null);

      const ctx = createMockContext({
        request: { body: { courseId: 'missing', rating: 5 } } as unknown as Context['request'],
      });

      const { createReview } = await import('./controller.js');

      await expect(createReview(ctx)).rejects.toEqual({
        status: 404,
        message: 'Course not found',
      });
    });

    it('should throw 404 when course is not published', async () => {
      mockCourse.findByPk.mockResolvedValue({ id: 'course-1', status: 'draft' });

      const ctx = createMockContext({
        request: { body: { courseId: 'course-1', rating: 5 } } as unknown as Context['request'],
      });

      const { createReview } = await import('./controller.js');

      await expect(createReview(ctx)).rejects.toEqual({
        status: 404,
        message: 'Course not found',
      });
    });

    it('should throw 403 when user not enrolled', async () => {
      mockCourse.findByPk.mockResolvedValue({ id: 'course-1', status: CourseStatus.PUBLISHED });
      mockPurchase.findOne.mockResolvedValue(null);

      const ctx = createMockContext({
        request: { body: { courseId: 'course-1', rating: 5 } } as unknown as Context['request'],
      });

      const { createReview } = await import('./controller.js');

      await expect(createReview(ctx)).rejects.toEqual({
        status: 403,
        message: 'You must be enrolled in this course to leave a review',
      });
    });

    it('should throw 409 when review already exists', async () => {
      mockCourse.findByPk.mockResolvedValue({ id: 'course-1', status: CourseStatus.PUBLISHED });
      mockPurchase.findOne.mockResolvedValue({ id: 'purchase-1' });
      mockCourseReview.findOne.mockResolvedValue({ id: 'existing-review' });

      const ctx = createMockContext({
        request: { body: { courseId: 'course-1', rating: 5 } } as unknown as Context['request'],
      });

      const { createReview } = await import('./controller.js');

      await expect(createReview(ctx)).rejects.toEqual({
        status: 409,
        message: 'You have already reviewed this course',
      });
    });
  });

  describe('updateReview', () => {
    it('should update own review and reset to pending', async () => {
      const review = createMockReview();
      mockCourseReview.findByPk.mockResolvedValue(review);
      // Mock recalculateCourseRating's inner query
      mockCourseReview.findOne.mockResolvedValue({ avgRating: '4.5', count: '10' });
      mockCourse.update.mockResolvedValue(undefined);

      const ctx = createMockContext({
        params: { id: 'review-1' },
        request: { body: { rating: 3, comment: 'Updated' } } as unknown as Context['request'],
      });

      const { updateReview } = await import('./controller.js');
      await updateReview(ctx);

      expect(review.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ReviewStatus.PENDING,
          moderatedById: null,
        })
      );
    });

    it('should throw 404 when review not found', async () => {
      mockCourseReview.findByPk.mockResolvedValue(null);

      const ctx = createMockContext({
        params: { id: 'missing' },
        request: { body: { rating: 3 } } as unknown as Context['request'],
      });

      const { updateReview } = await import('./controller.js');

      await expect(updateReview(ctx)).rejects.toEqual({
        status: 404,
        message: 'Review not found',
      });
    });

    it('should throw 403 when editing someone else review', async () => {
      mockCourseReview.findByPk.mockResolvedValue(
        createMockReview({ userId: 'other-user' })
      );

      const ctx = createMockContext({
        params: { id: 'review-1' },
        request: { body: { rating: 3 } } as unknown as Context['request'],
      });

      const { updateReview } = await import('./controller.js');

      await expect(updateReview(ctx)).rejects.toEqual({
        status: 403,
        message: 'You can only edit your own review',
      });
    });
  });

  describe('deleteReview', () => {
    it('should soft-delete own review', async () => {
      const review = createMockReview();
      mockCourseReview.findByPk.mockResolvedValue(review);
      mockCourseReview.findOne.mockResolvedValue({ avgRating: '4.0', count: '5' });
      mockCourse.update.mockResolvedValue(undefined);

      const ctx = createMockContext({ params: { id: 'review-1' } });

      const { deleteReview } = await import('./controller.js');
      await deleteReview(ctx);

      expect(review.destroy).toHaveBeenCalled();
      expect(ctx.status).toBe(204);
    });

    it('should throw 404 when review not found', async () => {
      mockCourseReview.findByPk.mockResolvedValue(null);

      const ctx = createMockContext({ params: { id: 'missing' } });

      const { deleteReview } = await import('./controller.js');

      await expect(deleteReview(ctx)).rejects.toEqual({
        status: 404,
        message: 'Review not found',
      });
    });

    it('should throw 403 when deleting someone else review', async () => {
      mockCourseReview.findByPk.mockResolvedValue(
        createMockReview({ userId: 'other-user' })
      );

      const ctx = createMockContext({ params: { id: 'review-1' } });

      const { deleteReview } = await import('./controller.js');

      await expect(deleteReview(ctx)).rejects.toEqual({
        status: 403,
        message: 'You can only delete your own review',
      });
    });
  });

  describe('listPendingReviews', () => {
    it('should return pending reviews for admin', async () => {
      const review = createMockReview({
        status: ReviewStatus.PENDING,
        course: { id: 'course-1', title: 'Test', slug: 'test' },
      });
      mockCourseReview.findAndCountAll.mockResolvedValue({ rows: [review], count: 1 });

      const ctx = createMockContext({
        state: {
          user: { userId: 'admin-1', email: 'admin@test.com', role: UserRole.SUPER_ADMIN },
        },
        query: { page: 1, limit: 20 } as unknown as Record<string, string>,
      });

      const { listPendingReviews } = await import('./controller.js');
      await listPendingReviews(ctx);

      const body = ctx.body as { data: { reviews: unknown[] } };
      expect(body.data.reviews).toHaveLength(1);
    });

    it('should filter by instructor courses for instructor role', async () => {
      mockCourseReview.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      const ctx = createMockContext({
        state: {
          user: { userId: 'instructor-1', email: 'i@test.com', role: UserRole.INSTRUCTOR },
        },
        query: { page: 1, limit: 20 } as unknown as Record<string, string>,
      });

      const { listPendingReviews } = await import('./controller.js');
      await listPendingReviews(ctx);

      expect(mockCourseReview.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.arrayContaining([
            expect.objectContaining({
              as: 'course',
              where: { instructorId: 'instructor-1' },
            }),
          ]),
        })
      );
    });
  });

  describe('getInstructorReviews', () => {
    it('should return reviews for instructor courses', async () => {
      const review = createMockReview({
        course: { id: 'course-1', title: 'Test', slug: 'test' },
      });
      mockCourseReview.findAndCountAll.mockResolvedValue({ rows: [review], count: 1 });

      const ctx = createMockContext({
        state: {
          user: { userId: 'instructor-1', email: 'i@test.com', role: UserRole.INSTRUCTOR },
        },
        query: { page: 1, limit: 20 } as unknown as Record<string, string>,
      });

      const { getInstructorReviews } = await import('./controller.js');
      await getInstructorReviews(ctx);

      const body = ctx.body as { data: { reviews: unknown[] } };
      expect(body.data.reviews).toHaveLength(1);
    });
  });

  describe('moderateReview', () => {
    it('should approve a review', async () => {
      const review = createMockReview({
        status: ReviewStatus.PENDING,
        course: { id: 'course-1', instructorId: 'admin-1' },
      });
      mockCourseReview.findByPk.mockResolvedValue(review);
      mockCourseReview.findOne.mockResolvedValue({ avgRating: '4.5', count: '10' });
      mockCourse.update.mockResolvedValue(undefined);

      const ctx = createMockContext({
        state: {
          user: { userId: 'admin-1', email: 'admin@test.com', role: UserRole.SUPER_ADMIN },
        },
        params: { id: 'review-1' },
        request: { body: { action: 'approve' } } as unknown as Context['request'],
      });

      const { moderateReview } = await import('./controller.js');
      await moderateReview(ctx);

      expect(review.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ReviewStatus.APPROVED,
          moderatedById: 'admin-1',
        })
      );
    });

    it('should reject a review with note', async () => {
      const review = createMockReview({
        status: ReviewStatus.PENDING,
        course: { id: 'course-1', instructorId: 'admin-1' },
      });
      mockCourseReview.findByPk.mockResolvedValue(review);
      mockCourseReview.findOne.mockResolvedValue({ avgRating: null, count: '0' });
      mockCourse.update.mockResolvedValue(undefined);

      const ctx = createMockContext({
        state: {
          user: { userId: 'admin-1', email: 'admin@test.com', role: UserRole.SUPER_ADMIN },
        },
        params: { id: 'review-1' },
        request: { body: { action: 'reject', note: 'Inappropriate' } } as unknown as Context['request'],
      });

      const { moderateReview } = await import('./controller.js');
      await moderateReview(ctx);

      expect(review.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ReviewStatus.REJECTED,
          moderationNote: 'Inappropriate',
        })
      );
    });

    it('should throw 404 when review not found', async () => {
      mockCourseReview.findByPk.mockResolvedValue(null);

      const ctx = createMockContext({
        state: {
          user: { userId: 'admin-1', email: 'admin@test.com', role: UserRole.SUPER_ADMIN },
        },
        params: { id: 'missing' },
        request: { body: { action: 'approve' } } as unknown as Context['request'],
      });

      const { moderateReview } = await import('./controller.js');

      await expect(moderateReview(ctx)).rejects.toEqual({
        status: 404,
        message: 'Review not found',
      });
    });

    it('should throw 403 when instructor moderates other course review', async () => {
      const review = createMockReview({
        course: { id: 'course-1', instructorId: 'other-instructor' },
      });
      mockCourseReview.findByPk.mockResolvedValue(review);

      const ctx = createMockContext({
        state: {
          user: { userId: 'instructor-1', email: 'i@test.com', role: UserRole.INSTRUCTOR },
        },
        params: { id: 'review-1' },
        request: { body: { action: 'approve' } } as unknown as Context['request'],
      });

      const { moderateReview } = await import('./controller.js');

      await expect(moderateReview(ctx)).rejects.toEqual({
        status: 403,
        message: 'You can only moderate reviews on your own courses',
      });
    });
  });
});
