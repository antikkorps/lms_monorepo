import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context } from 'koa';
import { UserRole, PurchaseStatus } from '../database/models/enums.js';

// =============================================================================
// Module Mocks
// =============================================================================

const mockCourse = {
  findByPk: vi.fn(),
};

const mockPurchase = {
  sum: vi.fn(),
  count: vi.fn(),
};

const mockTenantCourseLicense = {
  sum: vi.fn(),
};

const mockSequelize = {
  query: vi.fn(),
};

vi.mock('../database/models/index.js', () => ({
  Course: mockCourse,
  Purchase: mockPurchase,
  TenantCourseLicense: mockTenantCourseLicense,
}));

vi.mock('../database/sequelize.js', () => ({
  sequelize: mockSequelize,
}));

vi.mock('sequelize', () => ({
  Op: {
    between: Symbol('between'),
    in: Symbol('in'),
  },
}));

vi.mock('./analytics.schemas.js', () => ({
  courseAnalyticsParamsSchema: {
    parse: vi.fn((p: unknown) => ({ courseId: (p as Record<string, string>).courseId })),
  },
  courseAnalyticsQuerySchema: {
    parse: vi.fn((q: unknown) => ({
      period: (q as Record<string, string>).period || '30d',
      page: Number((q as Record<string, string>).page) || 1,
      pageSize: Number((q as Record<string, string>).pageSize) || 20,
    })),
  },
}));

vi.mock('../utils/app-error.js', () => ({
  AppError: {
    unauthorized: (msg: string) => ({ status: 401, message: msg }),
    forbidden: (msg: string) => ({ status: 403, message: msg }),
    notFound: (msg: string) => ({ status: 404, message: msg }),
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
        userId: 'admin-1',
        email: 'admin@test.com',
        role: UserRole.SUPER_ADMIN,
        tenantId: null,
      },
    },
    query: { period: '30d', page: '1', pageSize: '20' },
    params: { courseId: 'course-1' },
    request: { body: {} },
    body: undefined,
    status: 200,
    ...overrides,
  } as unknown as Context;
}

// =============================================================================
// Tests
// =============================================================================

describe('CourseAnalyticsController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCourseAnalytics', () => {
    it('should return course analytics', async () => {
      mockCourse.findByPk.mockResolvedValue({ id: 'course-1', title: 'Test Course', lessonsCount: 10 });
      mockPurchase.sum.mockResolvedValue(5000);
      mockTenantCourseLicense.sum.mockResolvedValue(2000);
      mockSequelize.query
        .mockResolvedValueOnce([{ date: '2026-02-01', count: '5' }]) // enrollment
        .mockResolvedValueOnce([{ enrolled: '50', started: '40', completed: '20' }]) // funnel
        .mockResolvedValueOnce([{ avgScore: '85.5', passRate: '90.0', totalAttempts: '30' }]) // quiz
        .mockResolvedValueOnce([{ totalSeconds: '36000', avgSeconds: '720' }]) // watch time
        .mockResolvedValueOnce([{ avgRating: '4.5', total: '10', rating: '5', ratingCount: '6' }]) // reviews
        .mockResolvedValueOnce([ // learners
          {
            userId: 'u-1', firstName: 'John', lastName: 'Doe', email: 'john@test.com',
            lessonsCompleted: '8', watchTimeSeconds: '3600', lastActiveAt: '2026-02-20',
          },
        ]);
      mockPurchase.count.mockResolvedValue(50);

      const ctx = createMockContext();

      const { getCourseAnalytics } = await import('./analytics-course.controller.js');
      await getCourseAnalytics(ctx);

      const body = ctx.body as {
        data: {
          courseId: string;
          revenue: { total: number };
          completionFunnel: { enrolled: number; completed: number };
          quizPerformance: { avgScore: number };
          learners: { total: number; items: unknown[] };
        };
      };
      expect(body.data.courseId).toBe('course-1');
      expect(body.data.revenue.total).toBe(7000);
      expect(body.data.completionFunnel.enrolled).toBe(50);
      expect(body.data.completionFunnel.completed).toBe(20);
      expect(body.data.quizPerformance?.avgScore).toBe(85.5);
      expect(body.data.learners.total).toBe(50);
      expect(body.data.learners.items).toHaveLength(1);
    });

    it('should throw 404 when course not found', async () => {
      mockCourse.findByPk.mockResolvedValue(null);

      const ctx = createMockContext();

      const { getCourseAnalytics } = await import('./analytics-course.controller.js');

      await expect(getCourseAnalytics(ctx)).rejects.toEqual({
        status: 404,
        message: 'Course not found',
      });
    });

    it('should return null quiz performance when no attempts', async () => {
      mockCourse.findByPk.mockResolvedValue({ id: 'course-1', title: 'Test', lessonsCount: 5 });
      mockPurchase.sum.mockResolvedValue(0);
      mockTenantCourseLicense.sum.mockResolvedValue(0);
      mockSequelize.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ enrolled: '0', started: '0', completed: '0' }])
        .mockResolvedValueOnce([{ avgScore: '0', passRate: '0', totalAttempts: '0' }])
        .mockResolvedValueOnce([{ totalSeconds: '0', avgSeconds: '0' }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockPurchase.count.mockResolvedValue(0);

      const ctx = createMockContext();

      const { getCourseAnalytics } = await import('./analytics-course.controller.js');
      await getCourseAnalytics(ctx);

      const body = ctx.body as { data: { quizPerformance: null; reviews: null } };
      expect(body.data.quizPerformance).toBeNull();
      expect(body.data.reviews).toBeNull();
    });

    it('should throw unauthorized without user', async () => {
      const ctx = createMockContext({ state: {} });

      const { getCourseAnalytics } = await import('./analytics-course.controller.js');

      await expect(getCourseAnalytics(ctx)).rejects.toEqual({
        status: 401,
        message: 'Authentication required',
      });
    });

    it('should scope to tenant for tenant admin', async () => {
      mockCourse.findByPk.mockResolvedValue({ id: 'course-1', title: 'Test', lessonsCount: 5 });
      mockPurchase.sum.mockResolvedValue(0);
      mockTenantCourseLicense.sum.mockResolvedValue(0);
      mockSequelize.query.mockResolvedValue([]);
      mockPurchase.count.mockResolvedValue(0);

      const ctx = createMockContext({
        state: {
          user: {
            userId: 'ta-1',
            email: 'ta@test.com',
            role: UserRole.TENANT_ADMIN,
            tenantId: 'tenant-1',
          },
        },
      });

      const { getCourseAnalytics } = await import('./analytics-course.controller.js');
      await getCourseAnalytics(ctx);

      // Should not throw — tenant admin has access
      expect(ctx.body).toBeDefined();
    });

    it('should calculate learner progress percentage', async () => {
      mockCourse.findByPk.mockResolvedValue({ id: 'course-1', title: 'Test', lessonsCount: 10 });
      mockPurchase.sum.mockResolvedValue(0);
      mockTenantCourseLicense.sum.mockResolvedValue(0);
      mockSequelize.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ enrolled: '1', started: '1', completed: '0' }])
        .mockResolvedValueOnce([{ avgScore: '0', passRate: '0', totalAttempts: '0' }])
        .mockResolvedValueOnce([{ totalSeconds: '100', avgSeconds: '100' }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{
          userId: 'u-1', firstName: 'A', lastName: 'B', email: 'a@b.com',
          lessonsCompleted: '7', watchTimeSeconds: '500', lastActiveAt: null,
        }]);
      mockPurchase.count.mockResolvedValue(1);

      const ctx = createMockContext();

      const { getCourseAnalytics } = await import('./analytics-course.controller.js');
      await getCourseAnalytics(ctx);

      const body = ctx.body as { data: { learners: { items: Array<{ progressPercent: number }> } } };
      expect(body.data.learners.items[0].progressPercent).toBe(70);
    });
  });
});
