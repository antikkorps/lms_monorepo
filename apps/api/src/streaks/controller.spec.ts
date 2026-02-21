import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context } from 'koa';
import { UserRole } from '../database/models/enums.js';

// =============================================================================
// Module Mocks
// =============================================================================

const mockUserStreak = {
  findOne: vi.fn(),
  create: vi.fn(),
  upsert: vi.fn(),
};

const mockUserActivityLog = {
  findOrCreate: vi.fn(),
  findAll: vi.fn(),
};

vi.mock('../database/models/index.js', () => ({
  UserStreak: mockUserStreak,
  UserActivityLog: mockUserActivityLog,
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

describe('StreaksController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMyStreak', () => {
    it('should return existing streak', async () => {
      mockUserStreak.findOne.mockResolvedValue({
        currentStreak: 5,
        longestStreak: 10,
        lastActiveDate: '2026-02-20',
      });

      const ctx = createMockContext();

      const { getMyStreak } = await import('./controller.js');
      await getMyStreak(ctx);

      expect(ctx.body).toEqual({
        data: {
          currentStreak: 5,
          longestStreak: 10,
          lastActiveDate: '2026-02-20',
        },
      });
    });

    it('should create initial streak if none exists', async () => {
      mockUserStreak.findOne.mockResolvedValue(null);
      mockUserStreak.create.mockResolvedValue({
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: null,
      });

      const ctx = createMockContext();

      const { getMyStreak } = await import('./controller.js');
      await getMyStreak(ctx);

      expect(mockUserStreak.create).toHaveBeenCalledWith({
        userId: 'user-123',
        currentStreak: 0,
        longestStreak: 0,
      });
      expect(ctx.body).toEqual({
        data: {
          currentStreak: 0,
          longestStreak: 0,
          lastActiveDate: null,
        },
      });
    });

    it('should throw unauthorized without user', async () => {
      const ctx = createMockContext({ state: {} });

      const { getMyStreak } = await import('./controller.js');

      await expect(getMyStreak(ctx)).rejects.toEqual({
        status: 401,
        message: 'Authentication required',
      });
    });
  });

  describe('recordActivity', () => {
    it('should record activity with findOrCreate', async () => {
      mockUserActivityLog.findOrCreate.mockResolvedValue([{}, true]);

      const { recordActivity } = await import('./controller.js');
      await recordActivity('user-123', 'lesson_completed', 'lesson-1');

      expect(mockUserActivityLog.findOrCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-123',
            activityType: 'lesson_completed',
            referenceId: 'lesson-1',
          }),
        })
      );
    });

    it('should set referenceId to null when not provided', async () => {
      mockUserActivityLog.findOrCreate.mockResolvedValue([{}, true]);

      const { recordActivity } = await import('./controller.js');
      await recordActivity('user-123', 'quiz_completed');

      expect(mockUserActivityLog.findOrCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            referenceId: null,
          }),
        })
      );
    });

    it('should ignore unique constraint violations', async () => {
      mockUserActivityLog.findOrCreate.mockRejectedValue({
        name: 'SequelizeUniqueConstraintError',
      });

      const { recordActivity } = await import('./controller.js');

      // Should not throw
      await recordActivity('user-123', 'lesson_completed');
    });

    it('should rethrow non-unique constraint errors', async () => {
      const error = new Error('DB connection failed');
      mockUserActivityLog.findOrCreate.mockRejectedValue(error);

      const { recordActivity } = await import('./controller.js');

      await expect(recordActivity('user-123', 'lesson_completed')).rejects.toThrow(
        'DB connection failed'
      );
    });
  });

  describe('recalculateStreak', () => {
    it('should set zero streak when no activities', async () => {
      mockUserActivityLog.findAll.mockResolvedValue([]);

      const { recalculateStreak } = await import('./controller.js');
      await recalculateStreak('user-123');

      expect(mockUserStreak.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          currentStreak: 0,
          longestStreak: 0,
          lastActiveDate: null,
        })
      );
    });

    it('should compute streak of 1 for single activity today', async () => {
      const today = new Date().toISOString().split('T')[0];
      mockUserActivityLog.findAll.mockResolvedValue([{ activityDate: today }]);
      mockUserStreak.findOne.mockResolvedValue(null);

      const { recalculateStreak } = await import('./controller.js');
      await recalculateStreak('user-123');

      expect(mockUserStreak.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          currentStreak: 1,
          longestStreak: 1,
        })
      );
    });

    it('should compute consecutive streak', async () => {
      const dates = [];
      for (let i = 0; i < 5; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push({ activityDate: d.toISOString().split('T')[0] });
      }
      mockUserActivityLog.findAll.mockResolvedValue(dates);
      mockUserStreak.findOne.mockResolvedValue(null);

      const { recalculateStreak } = await import('./controller.js');
      await recalculateStreak('user-123');

      expect(mockUserStreak.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          currentStreak: 5,
          longestStreak: 5,
        })
      );
    });

    it('should reset current streak if last activity is older than yesterday', async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const fourDaysAgo = new Date();
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

      mockUserActivityLog.findAll.mockResolvedValue([
        { activityDate: threeDaysAgo.toISOString().split('T')[0] },
        { activityDate: fourDaysAgo.toISOString().split('T')[0] },
      ]);
      mockUserStreak.findOne.mockResolvedValue(null);

      const { recalculateStreak } = await import('./controller.js');
      await recalculateStreak('user-123');

      expect(mockUserStreak.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          currentStreak: 0,
          longestStreak: 2,
        })
      );
    });

    it('should preserve existing longest streak if higher', async () => {
      const today = new Date().toISOString().split('T')[0];
      mockUserActivityLog.findAll.mockResolvedValue([{ activityDate: today }]);
      mockUserStreak.findOne.mockResolvedValue({ longestStreak: 20 });

      const { recalculateStreak } = await import('./controller.js');
      await recalculateStreak('user-123');

      expect(mockUserStreak.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          longestStreak: 20,
        })
      );
    });

    it('should count streak from yesterday', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dayBefore = new Date();
      dayBefore.setDate(dayBefore.getDate() - 2);

      mockUserActivityLog.findAll.mockResolvedValue([
        { activityDate: yesterday.toISOString().split('T')[0] },
        { activityDate: dayBefore.toISOString().split('T')[0] },
      ]);
      mockUserStreak.findOne.mockResolvedValue(null);

      const { recalculateStreak } = await import('./controller.js');
      await recalculateStreak('user-123');

      expect(mockUserStreak.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          currentStreak: 2,
        })
      );
    });
  });
});
