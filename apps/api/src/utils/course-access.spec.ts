import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserRole, PurchaseStatus, TenantStatus, SubscriptionStatus, CourseStatus } from '../database/models/enums.js';

// =============================================================================
// Module Mocks
// =============================================================================

vi.mock('../database/models/index.js', () => ({
  Course: {
    findByPk: vi.fn(),
  },
  Purchase: {
    findOne: vi.fn(),
  },
  Lesson: {
    findByPk: vi.fn(),
  },
  Chapter: {},
  Tenant: {
    findByPk: vi.fn(),
  },
}));

// Import after mocks
import {
  checkCourseAccess,
  checkTenantAccess,
  checkCourseAccessFromLesson,
  canEditCourse,
  type AuthenticatedUser,
} from './course-access.js';
import { Course, Purchase, Lesson, Tenant } from '../database/models/index.js';

// =============================================================================
// Test Helpers
// =============================================================================

function createMockCourse(overrides: Record<string, unknown> = {}) {
  return {
    id: 'course-123',
    title: 'Test Course',
    slug: 'test-course',
    status: CourseStatus.PUBLISHED,
    instructorId: 'instructor-123',
    isFree: false,
    price: 49.99,
    ...overrides,
  };
}

function createMockPurchase(overrides: Record<string, unknown> = {}) {
  return {
    id: 'purchase-123',
    userId: 'user-123',
    courseId: 'course-123',
    status: PurchaseStatus.COMPLETED,
    amount: 49.99,
    ...overrides,
  };
}

function createMockTenant(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tenant-123',
    name: 'Test Tenant',
    status: TenantStatus.ACTIVE,
    subscriptionStatus: SubscriptionStatus.ACTIVE,
    seatsPurchased: 10,
    seatsUsed: 5,
    ...overrides,
  };
}

function createMockLesson(overrides: Record<string, unknown> = {}) {
  return {
    id: 'lesson-123',
    title: 'Test Lesson',
    isFree: false,
    chapter: {
      course: createMockCourse(),
    },
    ...overrides,
  };
}

function createUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    userId: 'user-123',
    email: 'user@example.com',
    role: UserRole.LEARNER,
    tenantId: null,
    ...overrides,
  };
}

// =============================================================================
// Test Suite
// =============================================================================

describe('Course Access Utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // checkCourseAccess
  // ===========================================================================

  describe('checkCourseAccess', () => {
    it('should return no access if course not found', async () => {
      vi.mocked(Course.findByPk).mockResolvedValue(null);

      const result = await checkCourseAccess(createUser(), 'nonexistent');

      expect(result.hasAccess).toBe(false);
      expect(result.reason).toBe('Course not found');
    });

    it('should grant access to SuperAdmin', async () => {
      vi.mocked(Course.findByPk).mockResolvedValue(createMockCourse() as never);

      const result = await checkCourseAccess(
        createUser({ role: UserRole.SUPER_ADMIN }),
        'course-123'
      );

      expect(result.hasAccess).toBe(true);
      expect(result.accessType).toBe('admin');
    });

    it('should grant access to course instructor', async () => {
      vi.mocked(Course.findByPk).mockResolvedValue(
        createMockCourse({ instructorId: 'user-123' }) as never
      );

      const result = await checkCourseAccess(createUser(), 'course-123');

      expect(result.hasAccess).toBe(true);
      expect(result.accessType).toBe('instructor');
    });

    it('should grant access to free courses for authenticated users', async () => {
      vi.mocked(Course.findByPk).mockResolvedValue(
        createMockCourse({ isFree: true }) as never
      );

      const result = await checkCourseAccess(createUser(), 'course-123');

      expect(result.hasAccess).toBe(true);
      expect(result.accessType).toBe('free');
    });

    it('should deny access to free courses for unauthenticated users', async () => {
      vi.mocked(Course.findByPk).mockResolvedValue(
        createMockCourse({ isFree: true }) as never
      );

      const result = await checkCourseAccess(undefined, 'course-123');

      expect(result.hasAccess).toBe(false);
      expect(result.reason).toBe('Authentication required for free course access');
    });

    it('should grant access with COMPLETED purchase (B2C)', async () => {
      vi.mocked(Course.findByPk).mockResolvedValue(createMockCourse() as never);
      vi.mocked(Purchase.findOne).mockResolvedValue(createMockPurchase() as never);

      const result = await checkCourseAccess(createUser(), 'course-123');

      expect(result.hasAccess).toBe(true);
      expect(result.accessType).toBe('purchase');
    });

    it('should deny access with REFUNDED purchase', async () => {
      vi.mocked(Course.findByPk).mockResolvedValue(createMockCourse() as never);
      vi.mocked(Purchase.findOne).mockResolvedValue(null); // No COMPLETED purchase

      const result = await checkCourseAccess(createUser(), 'course-123');

      expect(result.hasAccess).toBe(false);
      expect(result.reason).toBe('No active purchase or subscription found for this course');
    });

    it('should grant access with active tenant subscription (B2B)', async () => {
      vi.mocked(Course.findByPk).mockResolvedValue(createMockCourse() as never);
      vi.mocked(Tenant.findByPk).mockResolvedValue(createMockTenant() as never);
      vi.mocked(Purchase.findOne).mockResolvedValue(null); // No B2C purchase

      const result = await checkCourseAccess(
        createUser({ tenantId: 'tenant-123' }),
        'course-123'
      );

      expect(result.hasAccess).toBe(true);
      expect(result.accessType).toBe('tenant');
    });

    it('should deny access for unauthenticated users on paid courses', async () => {
      vi.mocked(Course.findByPk).mockResolvedValue(createMockCourse() as never);

      const result = await checkCourseAccess(undefined, 'course-123');

      expect(result.hasAccess).toBe(false);
      expect(result.reason).toBe('Authentication required');
    });

    it('should fallback to B2C purchase if tenant subscription inactive', async () => {
      vi.mocked(Course.findByPk).mockResolvedValue(createMockCourse() as never);
      vi.mocked(Tenant.findByPk).mockResolvedValue(
        createMockTenant({ status: TenantStatus.SUSPENDED }) as never
      );
      vi.mocked(Purchase.findOne).mockResolvedValue(createMockPurchase() as never);

      const result = await checkCourseAccess(
        createUser({ tenantId: 'tenant-123' }),
        'course-123'
      );

      expect(result.hasAccess).toBe(true);
      expect(result.accessType).toBe('purchase');
    });
  });

  // ===========================================================================
  // checkTenantAccess
  // ===========================================================================

  describe('checkTenantAccess', () => {
    it('should return no access if tenant not found', async () => {
      vi.mocked(Tenant.findByPk).mockResolvedValue(null);

      const result = await checkTenantAccess('nonexistent', 'user-123');

      expect(result.hasAccess).toBe(false);
      expect(result.reason).toBe('Tenant not found');
    });

    it('should grant access for active tenant', async () => {
      vi.mocked(Tenant.findByPk).mockResolvedValue(createMockTenant() as never);

      const result = await checkTenantAccess('tenant-123', 'user-123');

      expect(result.hasAccess).toBe(true);
    });

    it('should grant access for trial tenant', async () => {
      vi.mocked(Tenant.findByPk).mockResolvedValue(
        createMockTenant({ status: TenantStatus.TRIAL }) as never
      );

      const result = await checkTenantAccess('tenant-123', 'user-123');

      expect(result.hasAccess).toBe(true);
    });

    it('should deny access for suspended tenant', async () => {
      vi.mocked(Tenant.findByPk).mockResolvedValue(
        createMockTenant({ status: TenantStatus.SUSPENDED }) as never
      );

      const result = await checkTenantAccess('tenant-123', 'user-123');

      expect(result.hasAccess).toBe(false);
      expect(result.reason).toBe('Tenant subscription is suspended');
    });

    it('should deny access for cancelled tenant', async () => {
      vi.mocked(Tenant.findByPk).mockResolvedValue(
        createMockTenant({ status: TenantStatus.CANCELLED }) as never
      );

      const result = await checkTenantAccess('tenant-123', 'user-123');

      expect(result.hasAccess).toBe(false);
      expect(result.reason).toBe('Tenant subscription is cancelled');
    });

    it('should deny access if subscription is past_due', async () => {
      vi.mocked(Tenant.findByPk).mockResolvedValue(
        createMockTenant({ subscriptionStatus: SubscriptionStatus.PAST_DUE }) as never
      );

      const result = await checkTenantAccess('tenant-123', 'user-123');

      expect(result.hasAccess).toBe(false);
      expect(result.reason).toBe('Subscription status is past_due');
    });

    it('should deny access if no seats available', async () => {
      vi.mocked(Tenant.findByPk).mockResolvedValue(
        createMockTenant({ seatsPurchased: 5, seatsUsed: 10 }) as never
      );

      const result = await checkTenantAccess('tenant-123', 'user-123');

      expect(result.hasAccess).toBe(false);
      expect(result.reason).toBe('No available seats in tenant subscription');
    });
  });

  // ===========================================================================
  // checkCourseAccessFromLesson
  // ===========================================================================

  describe('checkCourseAccessFromLesson', () => {
    it('should return no access if lesson not found', async () => {
      vi.mocked(Lesson.findByPk).mockResolvedValue(null);

      const result = await checkCourseAccessFromLesson(createUser(), 'nonexistent');

      expect(result.hasAccess).toBe(false);
      expect(result.reason).toBe('Lesson not found');
    });

    it('should grant access to free lessons', async () => {
      vi.mocked(Lesson.findByPk).mockResolvedValue(
        createMockLesson({ isFree: true }) as never
      );

      const result = await checkCourseAccessFromLesson(createUser(), 'lesson-123');

      expect(result.hasAccess).toBe(true);
      expect(result.accessType).toBe('free');
    });

    it('should check course access for non-free lessons', async () => {
      const mockLesson = createMockLesson();
      vi.mocked(Lesson.findByPk).mockResolvedValue(mockLesson as never);
      vi.mocked(Course.findByPk).mockResolvedValue(mockLesson.chapter.course as never);
      vi.mocked(Purchase.findOne).mockResolvedValue(createMockPurchase() as never);

      const result = await checkCourseAccessFromLesson(createUser(), 'lesson-123');

      expect(result.hasAccess).toBe(true);
      expect(result.accessType).toBe('purchase');
      expect(result.courseId).toBe('course-123');
    });
  });

  // ===========================================================================
  // canEditCourse
  // ===========================================================================

  describe('canEditCourse', () => {
    it('should allow SuperAdmin to edit any course', () => {
      const user = createUser({ role: UserRole.SUPER_ADMIN });
      const course = createMockCourse({ instructorId: 'other-user' });

      expect(canEditCourse(user, course as never)).toBe(true);
    });

    it('should allow TenantAdmin to edit any course', () => {
      const user = createUser({ role: UserRole.TENANT_ADMIN });
      const course = createMockCourse({ instructorId: 'other-user' });

      expect(canEditCourse(user, course as never)).toBe(true);
    });

    it('should allow instructor to edit their own course', () => {
      const user = createUser({ userId: 'instructor-123', role: UserRole.INSTRUCTOR });
      const course = createMockCourse({ instructorId: 'instructor-123' });

      expect(canEditCourse(user, course as never)).toBe(true);
    });

    it('should deny instructor from editing other courses', () => {
      const user = createUser({ userId: 'instructor-123', role: UserRole.INSTRUCTOR });
      const course = createMockCourse({ instructorId: 'other-instructor' });

      expect(canEditCourse(user, course as never)).toBe(false);
    });

    it('should deny learner from editing courses', () => {
      const user = createUser({ role: UserRole.LEARNER });
      const course = createMockCourse();

      expect(canEditCourse(user, course as never)).toBe(false);
    });
  });
});
