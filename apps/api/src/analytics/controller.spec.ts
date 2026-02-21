import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context } from 'koa';
import { UserRole, CourseStatus, PurchaseStatus } from '../database/models/enums.js';

// =============================================================================
// Module Mocks
// =============================================================================

const mockCourse = {};
const mockPurchase = {
  findAll: vi.fn(),
};
const mockUserProgress = {
  findAll: vi.fn(),
};
const mockQuizResult = {
  findAll: vi.fn(),
};

vi.mock('../database/models/index.js', () => ({
  Course: mockCourse,
  Purchase: mockPurchase,
  UserProgress: mockUserProgress,
  QuizResult: mockQuizResult,
}));

vi.mock('../utils/app-error.js', () => ({
  AppError: {
    unauthorized: (msg: string) => ({ status: 401, message: msg }),
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

// =============================================================================
// Tests
// =============================================================================

describe('AnalyticsController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getLearnerAnalytics', () => {
    it('should return analytics for user with no data', async () => {
      mockPurchase.findAll.mockResolvedValue([]);
      mockUserProgress.findAll.mockResolvedValue([]);
      mockQuizResult.findAll.mockResolvedValue([]);

      const ctx = createMockContext();

      const { getLearnerAnalytics } = await import('./controller.js');
      await getLearnerAnalytics(ctx);

      const body = ctx.body as { data: { summary: Record<string, number>; dailyActivity: unknown[]; courseProgress: unknown[] } };
      expect(body.data.summary.totalCourses).toBe(0);
      expect(body.data.summary.completedCourses).toBe(0);
      expect(body.data.dailyActivity).toHaveLength(30);
      expect(body.data.courseProgress).toHaveLength(0);
    });

    it('should calculate course progress from purchases and progress', async () => {
      mockPurchase.findAll.mockResolvedValue([
        {
          courseId: 'course-1',
          course: { id: 'course-1', title: 'Test Course', lessonsCount: 10 },
        },
      ]);
      mockUserProgress.findAll.mockResolvedValue([
        { courseId: 'course-1', lessonId: 'l-1', completed: true, progressSeconds: 300, completedAt: new Date(), updatedAt: new Date() },
        { courseId: 'course-1', lessonId: 'l-2', completed: true, progressSeconds: 600, completedAt: new Date(), updatedAt: new Date() },
        { courseId: 'course-1', lessonId: 'l-3', completed: false, progressSeconds: 100, completedAt: null, updatedAt: new Date() },
      ]);
      mockQuizResult.findAll.mockResolvedValue([]);

      const ctx = createMockContext();

      const { getLearnerAnalytics } = await import('./controller.js');
      await getLearnerAnalytics(ctx);

      const body = ctx.body as { data: { courseProgress: Array<{ progress: number; lessonsCompleted: number }> } };
      expect(body.data.courseProgress).toHaveLength(1);
      expect(body.data.courseProgress[0].progress).toBe(20); // 2/10 = 20%
      expect(body.data.courseProgress[0].lessonsCompleted).toBe(2);
    });

    it('should calculate average quiz score', async () => {
      mockPurchase.findAll.mockResolvedValue([]);
      mockUserProgress.findAll.mockResolvedValue([]);
      mockQuizResult.findAll.mockResolvedValue([
        { score: 80, maxScore: 100, completedAt: new Date() },
        { score: 60, maxScore: 100, completedAt: new Date() },
      ]);

      const ctx = createMockContext();

      const { getLearnerAnalytics } = await import('./controller.js');
      await getLearnerAnalytics(ctx);

      const body = ctx.body as { data: { summary: { averageQuizScore: number } } };
      expect(body.data.summary.averageQuizScore).toBe(70);
    });

    it('should return 30 days of daily activity', async () => {
      mockPurchase.findAll.mockResolvedValue([]);
      mockUserProgress.findAll.mockResolvedValue([]);
      mockQuizResult.findAll.mockResolvedValue([]);

      const ctx = createMockContext();

      const { getLearnerAnalytics } = await import('./controller.js');
      await getLearnerAnalytics(ctx);

      const body = ctx.body as { data: { dailyActivity: unknown[] } };
      expect(body.data.dailyActivity).toHaveLength(30);
    });

    it('should count completed courses', async () => {
      mockPurchase.findAll.mockResolvedValue([
        {
          courseId: 'course-1',
          course: { id: 'course-1', title: 'Done', lessonsCount: 2 },
        },
      ]);
      mockUserProgress.findAll.mockResolvedValue([
        { courseId: 'course-1', lessonId: 'l-1', completed: true, progressSeconds: 100, completedAt: new Date(), updatedAt: new Date() },
        { courseId: 'course-1', lessonId: 'l-2', completed: true, progressSeconds: 100, completedAt: new Date(), updatedAt: new Date() },
      ]);
      mockQuizResult.findAll.mockResolvedValue([]);

      const ctx = createMockContext();

      const { getLearnerAnalytics } = await import('./controller.js');
      await getLearnerAnalytics(ctx);

      const body = ctx.body as { data: { summary: { completedCourses: number } } };
      expect(body.data.summary.completedCourses).toBe(1);
    });

    it('should throw unauthorized without user', async () => {
      const ctx = createMockContext({ state: {} });

      const { getLearnerAnalytics } = await import('./controller.js');

      await expect(getLearnerAnalytics(ctx)).rejects.toEqual({
        status: 401,
        message: 'Authentication required',
      });
    });

    it('should include weekly streaks', async () => {
      mockPurchase.findAll.mockResolvedValue([]);
      mockUserProgress.findAll.mockResolvedValue([]);
      mockQuizResult.findAll.mockResolvedValue([]);

      const ctx = createMockContext();

      const { getLearnerAnalytics } = await import('./controller.js');
      await getLearnerAnalytics(ctx);

      const body = ctx.body as { data: { weeklyStreaks: unknown[] } };
      expect(body.data.weeklyStreaks).toHaveLength(8);
    });
  });
});
