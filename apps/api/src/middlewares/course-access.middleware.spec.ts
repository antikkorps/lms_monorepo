import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context } from 'koa';
import { UserRole, TenantStatus, SubscriptionStatus } from '../database/models/enums.js';
import { createMockContext, createMockNext } from '../test/mocks/koa.mock.js';

// =============================================================================
// Module Mocks
// =============================================================================

vi.mock('../utils/course-access.js', () => ({
  checkCourseAccess: vi.fn(),
  checkCourseAccessFromLesson: vi.fn(),
  checkTenantAccess: vi.fn(),
}));

vi.mock('../database/models/Tenant.js', () => ({
  Tenant: {
    findByPk: vi.fn(),
  },
}));

// Import after mocks
import {
  requireCourseAccessMiddleware,
  requireLessonAccessMiddleware,
  requireActiveTenantMiddleware,
  loadTenantStatusMiddleware,
} from './course-access.middleware.js';
import {
  checkCourseAccess,
  checkCourseAccessFromLesson,
  checkTenantAccess,
} from '../utils/course-access.js';
import { Tenant } from '../database/models/Tenant.js';

// =============================================================================
// Test Helpers
// =============================================================================

interface MockContextOptions {
  params?: Record<string, string>;
  state?: Record<string, unknown>;
}

function createTestContext(options: MockContextOptions = {}): Context {
  return createMockContext({
    ...options,
    state: options.state || {},
  }) as unknown as Context;
}

// =============================================================================
// Test Suite
// =============================================================================

describe('Course Access Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // requireCourseAccessMiddleware
  // ===========================================================================

  describe('requireCourseAccessMiddleware', () => {
    it('should throw error if courseId is missing', async () => {
      const middleware = requireCourseAccessMiddleware();
      const ctx = createTestContext({ params: {} });
      const next = createMockNext();

      await expect(middleware(ctx, next)).rejects.toThrow('Course ID is required');
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow access when checkCourseAccess returns true', async () => {
      vi.mocked(checkCourseAccess).mockResolvedValue({
        hasAccess: true,
        accessType: 'purchase',
      });

      const middleware = requireCourseAccessMiddleware();
      const ctx = createTestContext({
        params: { courseId: 'course-123' },
        state: { user: { userId: 'user-123', role: UserRole.LEARNER } },
      });
      const next = createMockNext();

      await middleware(ctx, next);

      expect(next).toHaveBeenCalled();
      expect(ctx.state.courseAccess).toEqual({
        hasAccess: true,
        accessType: 'purchase',
      });
    });

    it('should throw error when access denied', async () => {
      vi.mocked(checkCourseAccess).mockResolvedValue({
        hasAccess: false,
        reason: 'No active purchase',
      });

      const middleware = requireCourseAccessMiddleware();
      const ctx = createTestContext({
        params: { courseId: 'course-123' },
        state: { user: { userId: 'user-123', role: UserRole.LEARNER } },
      });
      const next = createMockNext();

      await expect(middleware(ctx, next)).rejects.toThrow('No active purchase');
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // requireLessonAccessMiddleware
  // ===========================================================================

  describe('requireLessonAccessMiddleware', () => {
    it('should throw error if lessonId is missing', async () => {
      const middleware = requireLessonAccessMiddleware();
      const ctx = createTestContext({ params: {} });
      const next = createMockNext();

      await expect(middleware(ctx, next)).rejects.toThrow('Lesson ID is required');
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow access when checkCourseAccessFromLesson returns true', async () => {
      vi.mocked(checkCourseAccessFromLesson).mockResolvedValue({
        hasAccess: true,
        accessType: 'free',
        courseId: 'course-123',
      });

      const middleware = requireLessonAccessMiddleware();
      const ctx = createTestContext({
        params: { lessonId: 'lesson-123' },
        state: { user: { userId: 'user-123', role: UserRole.LEARNER } },
      });
      const next = createMockNext();

      await middleware(ctx, next);

      expect(next).toHaveBeenCalled();
      expect(ctx.state.courseAccess).toEqual({
        hasAccess: true,
        accessType: 'free',
        courseId: 'course-123',
      });
    });

    it('should throw error when lesson access denied', async () => {
      vi.mocked(checkCourseAccessFromLesson).mockResolvedValue({
        hasAccess: false,
        reason: 'Course access required',
      });

      const middleware = requireLessonAccessMiddleware();
      const ctx = createTestContext({
        params: { lessonId: 'lesson-123' },
        state: { user: { userId: 'user-123', role: UserRole.LEARNER } },
      });
      const next = createMockNext();

      await expect(middleware(ctx, next)).rejects.toThrow('Course access required');
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // requireActiveTenantMiddleware
  // ===========================================================================

  describe('requireActiveTenantMiddleware', () => {
    it('should throw error if not authenticated', async () => {
      const middleware = requireActiveTenantMiddleware();
      const ctx = createTestContext({ state: {} });
      const next = createMockNext();

      await expect(middleware(ctx, next)).rejects.toThrow('Authentication required');
      expect(next).not.toHaveBeenCalled();
    });

    it('should throw error if user has no tenant', async () => {
      const middleware = requireActiveTenantMiddleware();
      const ctx = createTestContext({
        state: { user: { userId: 'user-123', tenantId: null } },
      });
      const next = createMockNext();

      await expect(middleware(ctx, next)).rejects.toThrow(
        'This resource requires tenant membership'
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow access for active tenant', async () => {
      vi.mocked(checkTenantAccess).mockResolvedValue({
        hasAccess: true,
      });

      const middleware = requireActiveTenantMiddleware();
      const ctx = createTestContext({
        state: { user: { userId: 'user-123', tenantId: 'tenant-123' } },
      });
      const next = createMockNext();

      await middleware(ctx, next);

      expect(next).toHaveBeenCalled();
    });

    it('should throw error for inactive tenant', async () => {
      vi.mocked(checkTenantAccess).mockResolvedValue({
        hasAccess: false,
        reason: 'Tenant subscription is suspended',
      });

      const middleware = requireActiveTenantMiddleware();
      const ctx = createTestContext({
        state: { user: { userId: 'user-123', tenantId: 'tenant-123' } },
      });
      const next = createMockNext();

      await expect(middleware(ctx, next)).rejects.toThrow(
        'Tenant subscription is suspended'
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // loadTenantStatusMiddleware
  // ===========================================================================

  describe('loadTenantStatusMiddleware', () => {
    it('should not attach tenant status for non-tenant users', async () => {
      const middleware = loadTenantStatusMiddleware();
      const ctx = createTestContext({
        state: { user: { userId: 'user-123', tenantId: null } },
      });
      const next = createMockNext();

      await middleware(ctx, next);

      expect(ctx.state.tenantStatus).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('should attach tenant status for tenant users', async () => {
      vi.mocked(Tenant.findByPk).mockResolvedValue({
        status: TenantStatus.ACTIVE,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        seatsPurchased: 10,
        seatsUsed: 5,
      } as never);

      const middleware = loadTenantStatusMiddleware();
      const ctx = createTestContext({
        state: { user: { userId: 'user-123', tenantId: 'tenant-123' } },
      });
      const next = createMockNext();

      await middleware(ctx, next);

      expect(ctx.state.tenantStatus).toEqual({
        status: TenantStatus.ACTIVE,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        isActive: true,
        seatsAvailable: 5,
      });
      expect(next).toHaveBeenCalled();
    });

    it('should mark inactive tenant correctly', async () => {
      vi.mocked(Tenant.findByPk).mockResolvedValue({
        status: TenantStatus.SUSPENDED,
        subscriptionStatus: SubscriptionStatus.PAST_DUE,
        seatsPurchased: 10,
        seatsUsed: 5,
      } as never);

      const middleware = loadTenantStatusMiddleware();
      const ctx = createTestContext({
        state: { user: { userId: 'user-123', tenantId: 'tenant-123' } },
      });
      const next = createMockNext();

      await middleware(ctx, next);

      expect(ctx.state.tenantStatus?.isActive).toBe(false);
      expect(next).toHaveBeenCalled();
    });
  });
});
