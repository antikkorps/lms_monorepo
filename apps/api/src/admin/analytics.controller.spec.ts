import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context } from 'koa';
import { UserRole, PurchaseStatus } from '../database/models/enums.js';

// =============================================================================
// Module Mocks
// =============================================================================

const mockUser = {
  findAll: vi.fn(),
  count: vi.fn(),
};

const mockPurchase = {
  sum: vi.fn(),
  count: vi.fn(),
  findAll: vi.fn(),
};

const mockUserProgress = {
  count: vi.fn(),
};

const mockTenantCourseLicense = {
  sum: vi.fn(),
  count: vi.fn(),
};

const mockSequelize = {
  query: vi.fn(),
};

vi.mock('../database/models/index.js', () => ({
  User: mockUser,
  Purchase: mockPurchase,
  UserProgress: mockUserProgress,
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
  fn: vi.fn((...args: unknown[]) => args),
  col: vi.fn((name: string) => name),
}));

vi.mock('./analytics.schemas.js', () => ({
  analyticsQuerySchema: {
    parse: vi.fn((q: unknown) => ({ period: (q as Record<string, string>).period || '30d' })),
  },
  exportQuerySchema: {
    parse: vi.fn((q: unknown) => ({
      period: (q as Record<string, string>).period || '30d',
      type: (q as Record<string, string>).type || 'overview',
      format: (q as Record<string, string>).format || 'csv',
    })),
  },
}));

vi.mock('../utils/app-error.js', () => ({
  AppError: {
    unauthorized: (msg: string) => ({ status: 401, message: msg }),
    forbidden: (msg: string) => ({ status: 403, message: msg }),
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
    query: { period: '30d' },
    params: {},
    request: { body: {} },
    body: undefined,
    status: 200,
    set: vi.fn(),
    ...overrides,
  } as unknown as Context;
}

// =============================================================================
// Tests
// =============================================================================

describe('AdminAnalyticsController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock returns
    mockPurchase.sum.mockResolvedValue(0);
    mockPurchase.count.mockResolvedValue(0);
    mockTenantCourseLicense.sum.mockResolvedValue(0);
    mockTenantCourseLicense.count.mockResolvedValue(0);
    mockUser.count.mockResolvedValue(0);
    mockUser.findAll.mockResolvedValue([]);
    mockUserProgress.count.mockResolvedValue(0);
    mockSequelize.query.mockResolvedValue([{ count: '0' }]);
  });

  describe('getAnalyticsOverview', () => {
    it('should return overview metrics for super admin', async () => {
      mockPurchase.sum.mockResolvedValueOnce(1000).mockResolvedValueOnce(500);
      mockTenantCourseLicense.sum.mockResolvedValueOnce(2000).mockResolvedValueOnce(1000);
      mockUser.count.mockResolvedValueOnce(50).mockResolvedValueOnce(30);
      mockUserProgress.count.mockResolvedValueOnce(100).mockResolvedValueOnce(80);

      const ctx = createMockContext();

      const { getAnalyticsOverview } = await import('./analytics.controller.js');
      await getAnalyticsOverview(ctx);

      const body = ctx.body as { data: { totalRevenue: number; b2cRevenue: number; b2bRevenue: number; newUsers: number } };
      expect(body.data.totalRevenue).toBe(3000);
      expect(body.data.b2cRevenue).toBe(1000);
      expect(body.data.b2bRevenue).toBe(2000);
      expect(body.data.newUsers).toBe(50);
    });

    it('should handle null revenue values', async () => {
      mockPurchase.sum.mockResolvedValue(null);
      mockTenantCourseLicense.sum.mockResolvedValue(null);

      const ctx = createMockContext();

      const { getAnalyticsOverview } = await import('./analytics.controller.js');
      await getAnalyticsOverview(ctx);

      const body = ctx.body as { data: { totalRevenue: number } };
      expect(body.data.totalRevenue).toBe(0);
    });

    it('should calculate deltas correctly', async () => {
      // Current: 200, Previous: 100 → +100%
      mockPurchase.sum.mockResolvedValueOnce(200).mockResolvedValueOnce(100);
      mockTenantCourseLicense.sum.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
      mockUser.count.mockResolvedValueOnce(10).mockResolvedValueOnce(5);
      mockUserProgress.count.mockResolvedValueOnce(20).mockResolvedValueOnce(10);

      const ctx = createMockContext();

      const { getAnalyticsOverview } = await import('./analytics.controller.js');
      await getAnalyticsOverview(ctx);

      const body = ctx.body as { data: { deltas: { revenue: number; users: number } } };
      expect(body.data.deltas.revenue).toBe(100);
      expect(body.data.deltas.users).toBe(100);
    });

    it('should scope to tenant for tenant admin', async () => {
      mockUser.findAll.mockResolvedValue([{ id: 'user-1' }, { id: 'user-2' }]);

      const ctx = createMockContext({
        state: {
          user: {
            userId: 'tenant-admin-1',
            email: 'ta@test.com',
            role: UserRole.TENANT_ADMIN,
            tenantId: 'tenant-1',
          },
        },
      });

      const { getAnalyticsOverview } = await import('./analytics.controller.js');
      await getAnalyticsOverview(ctx);

      expect(mockUser.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-1' },
        })
      );
    });

    it('should throw unauthorized without user', async () => {
      const ctx = createMockContext({ state: {} });

      const { getAnalyticsOverview } = await import('./analytics.controller.js');

      await expect(getAnalyticsOverview(ctx)).rejects.toEqual({
        status: 401,
        message: 'Authentication required',
      });
    });

    it('should throw forbidden for tenant admin without tenantId', async () => {
      const ctx = createMockContext({
        state: {
          user: {
            userId: 'ta-1',
            email: 'ta@test.com',
            role: UserRole.TENANT_ADMIN,
            tenantId: null,
          },
        },
      });

      const { getAnalyticsOverview } = await import('./analytics.controller.js');

      await expect(getAnalyticsOverview(ctx)).rejects.toEqual({
        status: 403,
        message: 'Tenant access required',
      });
    });
  });

  describe('getAnalyticsRevenue', () => {
    it('should return revenue data', async () => {
      mockSequelize.query
        .mockResolvedValueOnce([{ date: '2026-02-01', amount: '1000', b2cAmount: '600', b2bAmount: '400' }])
        .mockResolvedValueOnce([{ courseId: 'c-1', title: 'Course', b2cRevenue: '600', b2bRevenue: '400', revenue: '1000', sales: '5', licenses: '2' }]);
      mockPurchase.findAll.mockResolvedValue([]);

      const ctx = createMockContext();

      const { getAnalyticsRevenue } = await import('./analytics.controller.js');
      await getAnalyticsRevenue(ctx);

      const body = ctx.body as { data: { timeSeries: unknown[]; topCourses: unknown[] } };
      expect(body.data.timeSeries).toHaveLength(1);
      expect(body.data.topCourses).toHaveLength(1);
    });
  });

  describe('getAnalyticsEngagement', () => {
    it('should return engagement data', async () => {
      mockSequelize.query
        .mockResolvedValueOnce([{ date: '2026-02-01', activeUsers: '10', completions: '5' }])
        .mockResolvedValueOnce([{ date: '2026-02-01', count: '3' }])
        .mockResolvedValueOnce([{ courseId: 'c-1', title: 'Course', enrolled: '20', completed: '5' }])
        .mockResolvedValueOnce([{ category: 'tech', count: '10' }]);

      const ctx = createMockContext();

      const { getAnalyticsEngagement } = await import('./analytics.controller.js');
      await getAnalyticsEngagement(ctx);

      const body = ctx.body as { data: { dailyEngagement: unknown[]; userGrowth: unknown[]; completionRates: unknown[] } };
      expect(body.data.dailyEngagement).toHaveLength(1);
      expect(body.data.userGrowth).toHaveLength(1);
      expect(body.data.completionRates).toHaveLength(1);
    });

    it('should calculate completion rate correctly', async () => {
      mockSequelize.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ courseId: 'c-1', title: 'Test', enrolled: '100', completed: '25' }])
        .mockResolvedValueOnce([]);

      const ctx = createMockContext();

      const { getAnalyticsEngagement } = await import('./analytics.controller.js');
      await getAnalyticsEngagement(ctx);

      const body = ctx.body as { data: { completionRates: Array<{ rate: number }> } };
      expect(body.data.completionRates[0].rate).toBe(25);
    });
  });

  describe('getAnalyticsExport', () => {
    it('should export CSV for overview type', async () => {
      mockPurchase.sum.mockResolvedValue(500);
      mockTenantCourseLicense.sum.mockResolvedValue(300);
      mockUser.count.mockResolvedValue(10);
      mockUserProgress.count.mockResolvedValue(25);

      const ctx = createMockContext({
        query: { period: '30d', type: 'overview', format: 'csv' },
      });

      const { getAnalyticsExport } = await import('./analytics.controller.js');
      await getAnalyticsExport(ctx);

      expect(ctx.set).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(typeof ctx.body).toBe('string');
      expect((ctx.body as string)).toContain('Metric,Value');
    });

    it('should export CSV for revenue type', async () => {
      mockSequelize.query.mockResolvedValueOnce([
        { date: '2026-02-01', amount: '100', b2cAmount: '60', b2bAmount: '40' },
      ]);

      const ctx = createMockContext({
        query: { period: '30d', type: 'revenue', format: 'csv' },
      });

      const { getAnalyticsExport } = await import('./analytics.controller.js');
      await getAnalyticsExport(ctx);

      expect(typeof ctx.body).toBe('string');
      expect((ctx.body as string)).toContain('Date,Total,B2C,B2B');
    });

    it('should export CSV for engagement type', async () => {
      mockSequelize.query.mockResolvedValueOnce([
        { date: '2026-02-01', activeUsers: '5', completions: '3' },
      ]);

      const ctx = createMockContext({
        query: { period: '30d', type: 'engagement', format: 'csv' },
      });

      const { getAnalyticsExport } = await import('./analytics.controller.js');
      await getAnalyticsExport(ctx);

      expect(typeof ctx.body).toBe('string');
      expect((ctx.body as string)).toContain('Date,Active Users,Completions');
    });

    it('should generate PDF when format is pdf', async () => {
      const mockPdfStream = { pipe: vi.fn() };
      vi.doMock('./analytics-pdf.js', () => ({
        generateAnalyticsPdf: vi.fn().mockReturnValue(mockPdfStream),
      }));

      vi.resetModules();

      // Re-setup mocks after resetModules
      mockPurchase.sum.mockResolvedValue(100);
      mockTenantCourseLicense.sum.mockResolvedValue(0);
      mockUser.count.mockResolvedValue(5);
      mockUserProgress.count.mockResolvedValue(3);

      const ctx = createMockContext({
        query: { period: '30d', type: 'overview', format: 'pdf' },
      });

      const { getAnalyticsExport } = await import('./analytics.controller.js');
      await getAnalyticsExport(ctx);

      expect(ctx.set).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    });
  });

  describe('getAnalyticsLicenses', () => {
    it('should return license analytics', async () => {
      mockSequelize.query
        .mockResolvedValueOnce([{ totalSeats: '100', usedSeats: '75' }])
        .mockResolvedValueOnce([{ status: 'completed', count: '10' }]);
      mockPurchase.sum.mockResolvedValue(5000);
      mockTenantCourseLicense.sum.mockResolvedValue(3000);
      mockTenantCourseLicense.count.mockResolvedValue(2);

      const ctx = createMockContext();

      const { getAnalyticsLicenses } = await import('./analytics.controller.js');
      await getAnalyticsLicenses(ctx);

      const body = ctx.body as {
        data: {
          seatUtilization: { totalSeats: number; usedSeats: number; rate: number };
          revenueSplit: { b2c: number; b2b: number };
          upcomingExpirations: number;
        };
      };
      expect(body.data.seatUtilization.totalSeats).toBe(100);
      expect(body.data.seatUtilization.usedSeats).toBe(75);
      expect(body.data.seatUtilization.rate).toBe(75);
      expect(body.data.revenueSplit.b2c).toBe(5000);
      expect(body.data.revenueSplit.b2b).toBe(3000);
      expect(body.data.upcomingExpirations).toBe(2);
    });

    it('should handle zero seats', async () => {
      mockSequelize.query
        .mockResolvedValueOnce([{ totalSeats: '0', usedSeats: '0' }])
        .mockResolvedValueOnce([]);
      mockPurchase.sum.mockResolvedValue(null);
      mockTenantCourseLicense.sum.mockResolvedValue(null);
      mockTenantCourseLicense.count.mockResolvedValue(0);

      const ctx = createMockContext();

      const { getAnalyticsLicenses } = await import('./analytics.controller.js');
      await getAnalyticsLicenses(ctx);

      const body = ctx.body as { data: { seatUtilization: { rate: number } } };
      expect(body.data.seatUtilization.rate).toBe(0);
    });
  });
});
