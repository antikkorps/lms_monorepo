import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context } from 'koa';
import { LeaderboardPeriod, UserRole } from '../database/models/enums.js';

// =============================================================================
// Module Mocks
// =============================================================================

const mockLeaderboardEntry = {
  findAndCountAll: vi.fn(),
  findOne: vi.fn(),
};

const mockUser = {};

const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
};

vi.mock('../database/models/index.js', () => ({
  LeaderboardEntry: mockLeaderboardEntry,
  User: mockUser,
}));

vi.mock('../utils/redis.js', () => ({
  getRedisClient: () => mockRedis,
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
        tenantId: 'tenant-1',
      },
    },
    query: {
      metric: 'courses_completed',
      period: 'weekly',
      scope: 'global',
      page: '1',
      limit: '10',
    },
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

describe('LeaderboardsController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
  });

  describe('calculatePeriodStart', () => {
    it('should return Monday for WEEKLY', async () => {
      const { calculatePeriodStart } = await import('./controller.js');
      const result = calculatePeriodStart(LeaderboardPeriod.WEEKLY);

      // Should be a valid date string
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Should be a Monday
      const date = new Date(result);
      expect(date.getDay()).toBe(1);
    });

    it('should return 1st of month for MONTHLY', async () => {
      const { calculatePeriodStart } = await import('./controller.js');
      const result = calculatePeriodStart(LeaderboardPeriod.MONTHLY);

      expect(result).toMatch(/^\d{4}-\d{2}-01$/);
    });

    it('should return 2020-01-01 for ALL_TIME', async () => {
      const { calculatePeriodStart } = await import('./controller.js');
      const result = calculatePeriodStart(LeaderboardPeriod.ALL_TIME);

      expect(result).toBe('2020-01-01');
    });
  });

  describe('getLeaderboard', () => {
    it('should return cached data when available', async () => {
      const cachedData = { data: { entries: [], pagination: {} } };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

      const ctx = createMockContext();

      const { getLeaderboard } = await import('./controller.js');
      await getLeaderboard(ctx);

      expect(ctx.body).toEqual(cachedData);
      expect(mockLeaderboardEntry.findAndCountAll).not.toHaveBeenCalled();
    });

    it('should query DB on cache miss', async () => {
      const mockEntry = {
        rank: 1,
        score: 42,
        user: {
          id: 'user-1',
          firstName: 'John',
          lastName: 'Doe',
          avatarUrl: null,
        },
      };

      mockLeaderboardEntry.findAndCountAll.mockResolvedValue({
        rows: [mockEntry],
        count: 1,
      });

      const ctx = createMockContext();

      const { getLeaderboard } = await import('./controller.js');
      await getLeaderboard(ctx);

      expect(ctx.body).toEqual({
        data: {
          entries: [
            {
              rank: 1,
              score: 42,
              user: {
                id: 'user-1',
                firstName: 'John',
                lastName: 'Doe',
                avatarUrl: null,
              },
            },
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1,
          },
          meta: expect.objectContaining({
            metric: 'courses_completed',
            period: 'weekly',
            scope: 'global',
          }),
        },
      });
    });

    it('should cache response after DB query', async () => {
      mockLeaderboardEntry.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      const ctx = createMockContext();

      const { getLeaderboard } = await import('./controller.js');
      await getLeaderboard(ctx);

      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('leaderboard:'),
        expect.any(String),
        'EX',
        300
      );
    });

    it('should filter by tenant scope', async () => {
      mockLeaderboardEntry.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      const ctx = createMockContext({
        query: {
          metric: 'courses_completed',
          period: 'weekly',
          scope: 'tenant',
          page: '1',
          limit: '10',
        },
      } as unknown as Partial<Context>);

      const { getLeaderboard } = await import('./controller.js');
      await getLeaderboard(ctx);

      expect(mockLeaderboardEntry.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'tenant-1',
            courseId: null,
          }),
        })
      );
    });

    it('should filter by course scope', async () => {
      mockLeaderboardEntry.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      const ctx = createMockContext({
        query: {
          metric: 'courses_completed',
          period: 'weekly',
          scope: 'course',
          courseId: 'course-1',
          page: '1',
          limit: '10',
        },
      } as unknown as Partial<Context>);

      const { getLeaderboard } = await import('./controller.js');
      await getLeaderboard(ctx);

      expect(mockLeaderboardEntry.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            courseId: 'course-1',
            tenantId: null,
          }),
        })
      );
    });

    it('should handle user with null user association', async () => {
      mockLeaderboardEntry.findAndCountAll.mockResolvedValue({
        rows: [{ rank: 1, score: 10, user: null }],
        count: 1,
      });

      const ctx = createMockContext();

      const { getLeaderboard } = await import('./controller.js');
      await getLeaderboard(ctx);

      expect((ctx.body as Record<string, unknown>)).toBeDefined();
      const body = ctx.body as { data: { entries: Array<{ user: null }> } };
      expect(body.data.entries[0].user).toBeNull();
    });

    it('should throw unauthorized without user', async () => {
      const ctx = createMockContext({ state: {} });

      const { getLeaderboard } = await import('./controller.js');

      await expect(getLeaderboard(ctx)).rejects.toEqual({
        status: 401,
        message: 'Authentication required',
      });
    });

    it('should continue without cache on Redis error', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis down'));
      mockLeaderboardEntry.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      const ctx = createMockContext();

      const { getLeaderboard } = await import('./controller.js');
      await getLeaderboard(ctx);

      // Should still return data
      expect(ctx.body).toBeDefined();
    });

    it('should handle pagination correctly', async () => {
      mockLeaderboardEntry.findAndCountAll.mockResolvedValue({ rows: [], count: 50 });

      const ctx = createMockContext({
        query: {
          metric: 'courses_completed',
          period: 'weekly',
          scope: 'global',
          page: '3',
          limit: '10',
        },
      } as unknown as Partial<Context>);

      const { getLeaderboard } = await import('./controller.js');
      await getLeaderboard(ctx);

      expect(mockLeaderboardEntry.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          offset: 20,
          limit: 10,
        })
      );
      const body = ctx.body as { data: { pagination: { totalPages: number } } };
      expect(body.data.pagination.totalPages).toBe(5);
    });
  });

  describe('getMyRank', () => {
    it('should return user rank and score', async () => {
      mockLeaderboardEntry.findOne.mockResolvedValue({ rank: 5, score: 42 });

      const ctx = createMockContext();

      const { getMyRank } = await import('./controller.js');
      await getMyRank(ctx);

      expect(ctx.body).toEqual({
        data: {
          rank: 5,
          score: 42,
        },
      });
    });

    it('should return null when no entry', async () => {
      mockLeaderboardEntry.findOne.mockResolvedValue(null);

      const ctx = createMockContext();

      const { getMyRank } = await import('./controller.js');
      await getMyRank(ctx);

      expect(ctx.body).toEqual({ data: null });
    });

    it('should filter by tenant scope', async () => {
      mockLeaderboardEntry.findOne.mockResolvedValue(null);

      const ctx = createMockContext({
        query: {
          metric: 'courses_completed',
          period: 'weekly',
          scope: 'tenant',
          page: '1',
          limit: '10',
        },
      } as unknown as Partial<Context>);

      const { getMyRank } = await import('./controller.js');
      await getMyRank(ctx);

      expect(mockLeaderboardEntry.findOne).toHaveBeenCalledWith({
        where: expect.objectContaining({
          userId: 'user-123',
          tenantId: 'tenant-1',
          courseId: null,
        }),
      });
    });

    it('should throw unauthorized without user', async () => {
      const ctx = createMockContext({ state: {} });

      const { getMyRank } = await import('./controller.js');

      await expect(getMyRank(ctx)).rejects.toEqual({
        status: 401,
        message: 'Authentication required',
      });
    });
  });
});
