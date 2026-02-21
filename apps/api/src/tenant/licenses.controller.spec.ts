import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context } from 'koa';
import { UserRole, CourseStatus, PurchaseStatus, LicenseType } from '../database/models/enums.js';

// =============================================================================
// Module Mocks
// =============================================================================

const mockCourse = {
  findByPk: vi.fn(),
};

const mockUser = {
  findOne: vi.fn(),
};

const mockTenant = {
  findByPk: vi.fn(),
};

const mockTenantCourseLicense = {
  findOne: vi.fn(),
  findAndCountAll: vi.fn(),
  create: vi.fn(),
};

const mockTenantCourseLicenseAssignment = {
  findOne: vi.fn(),
  create: vi.fn(),
  destroy: vi.fn(),
};

const mockStripeService = {
  createCustomer: vi.fn(),
  createB2BLicenseCheckoutSession: vi.fn(),
  createRefund: vi.fn(),
};

const mockGetDiscountTiers = vi.fn();
const mockCalculateLicensePrice = vi.fn();

const mockTransaction = vi.fn((fn: (t: unknown) => Promise<unknown>) => fn({ id: 'tx-1' }));

vi.mock('../database/models/index.js', () => ({
  Course: mockCourse,
  User: mockUser,
  Tenant: mockTenant,
  TenantCourseLicense: mockTenantCourseLicense,
  TenantCourseLicenseAssignment: mockTenantCourseLicenseAssignment,
}));

vi.mock('../database/sequelize.js', () => ({
  sequelize: {
    transaction: mockTransaction,
  },
}));

vi.mock('../services/stripe/index.js', () => ({
  stripeService: mockStripeService,
}));

vi.mock('./licenses.pricing.js', () => ({
  getDiscountTiers: mockGetDiscountTiers,
  calculateLicensePrice: mockCalculateLicensePrice,
}));

vi.mock('../config/index.js', () => ({
  config: {
    frontendUrl: 'https://app.test.com',
    licensing: {
      volumeDiscountTiers: [
        { minSeats: 10, discountPercent: 10 },
        { minSeats: 50, discountPercent: 20 },
      ],
    },
  },
}));

vi.mock('../utils/app-error.js', () => {
  class MockAppError extends Error {
    status: number;
    code?: string;
    constructor(message: string, status: number, code?: string) {
      super(message);
      this.status = status;
      this.code = code;
    }
  }
  return {
    AppError: Object.assign(MockAppError, {
      unauthorized: (msg: string) => new MockAppError(msg, 401),
      forbidden: (msg: string) => new MockAppError(msg, 403),
      notFound: (msg: string) => new MockAppError(msg, 404),
      badRequest: (msg: string) => new MockAppError(msg, 400),
      conflict: (msg: string) => new MockAppError(msg, 409),
    }),
  };
});

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
        userId: 'ta-1',
        email: 'admin@tenant.com',
        role: UserRole.TENANT_ADMIN,
        tenantId: 'tenant-1',
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

function createMockLicense(overrides = {}) {
  const data = {
    id: 'license-1',
    tenantId: 'tenant-1',
    courseId: 'course-1',
    licenseType: LicenseType.SEATS,
    seatsTotal: 10,
    seatsUsed: 3,
    availableSeats: 7,
    hasAvailableSeats: true,
    amount: 500,
    currency: 'eur',
    status: PurchaseStatus.COMPLETED,
    purchasedAt: new Date(),
    expiresAt: null,
    renewedAt: null,
    renewalCount: 0,
    isExpired: false,
    isExpiringSoon: false,
    stripePaymentIntentId: 'pi_test123',
    stripeCheckoutSessionId: 'cs_test123',
    course: { id: 'course-1', title: 'Test Course', price: 50, currency: 'eur', slug: 'test' },
    purchasedBy: null,
    assignments: [],
    ...overrides,
  };

  return {
    ...data,
    update: vi.fn().mockResolvedValue(undefined),
    increment: vi.fn().mockResolvedValue(undefined),
    decrement: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn().mockResolvedValue(undefined),
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('LicensesController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDiscountTiers.mockResolvedValue([]);
    mockCalculateLicensePrice.mockReturnValue({ totalPrice: 500, pricePerSeat: 50, discount: 0 });
  });

  describe('createLicenseCheckout', () => {
    it('should create checkout session for seats license', async () => {
      mockCourse.findByPk.mockResolvedValue({
        id: 'course-1', title: 'Test', price: 50, currency: 'eur',
        status: CourseStatus.PUBLISHED, isFree: false, slug: 'test',
      });
      mockTenant.findByPk.mockResolvedValue({
        id: 'tenant-1', name: 'Acme', stripeCustomerId: 'cus_test',
        update: vi.fn(),
      });
      mockTenantCourseLicense.findOne.mockResolvedValue(null);
      mockTenantCourseLicense.create.mockResolvedValue({});
      mockStripeService.createB2BLicenseCheckoutSession.mockResolvedValue({
        sessionId: 'cs_123', url: 'https://checkout.stripe.com/123',
      });

      const ctx = createMockContext({
        request: { body: { courseId: 'course-1', licenseType: 'seats', seats: 10 } } as unknown as Context['request'],
      });

      const { createLicenseCheckout } = await import('./licenses.controller.js');
      await createLicenseCheckout(ctx);

      const body = ctx.body as { data: { sessionId: string; url: string } };
      expect(body.data.sessionId).toBe('cs_123');
      expect(body.data.url).toBe('https://checkout.stripe.com/123');
    });

    it('should create Stripe customer if tenant has none', async () => {
      mockCourse.findByPk.mockResolvedValue({
        id: 'course-1', title: 'Test', price: 50, currency: 'eur',
        status: CourseStatus.PUBLISHED, isFree: false, slug: 'test',
      });
      const tenantMock = {
        id: 'tenant-1', name: 'Acme', stripeCustomerId: null,
        update: vi.fn(),
      };
      mockTenant.findByPk.mockResolvedValue(tenantMock);
      mockTenantCourseLicense.findOne.mockResolvedValue(null);
      mockTenantCourseLicense.create.mockResolvedValue({});
      mockStripeService.createCustomer.mockResolvedValue({ customerId: 'cus_new' });
      mockStripeService.createB2BLicenseCheckoutSession.mockResolvedValue({
        sessionId: 'cs_123', url: 'https://checkout.stripe.com/123',
      });

      const ctx = createMockContext({
        request: { body: { courseId: 'course-1', licenseType: 'seats', seats: 5 } } as unknown as Context['request'],
      });

      const { createLicenseCheckout } = await import('./licenses.controller.js');
      await createLicenseCheckout(ctx);

      expect(mockStripeService.createCustomer).toHaveBeenCalled();
      expect(tenantMock.update).toHaveBeenCalledWith({ stripeCustomerId: 'cus_new' });
    });

    it('should throw 400 for missing courseId', async () => {
      const ctx = createMockContext({
        request: { body: { licenseType: 'seats', seats: 10 } } as unknown as Context['request'],
      });

      const { createLicenseCheckout } = await import('./licenses.controller.js');

      await expect(createLicenseCheckout(ctx)).rejects.toThrow('Course ID is required');
    });

    it('should throw 400 for invalid licenseType', async () => {
      const ctx = createMockContext({
        request: { body: { courseId: 'c-1', licenseType: 'invalid' } } as unknown as Context['request'],
      });

      const { createLicenseCheckout } = await import('./licenses.controller.js');

      await expect(createLicenseCheckout(ctx)).rejects.toThrow('License type must be');
    });

    it('should throw 400 for seats license without seats count', async () => {
      const ctx = createMockContext({
        request: { body: { courseId: 'c-1', licenseType: 'seats' } } as unknown as Context['request'],
      });

      const { createLicenseCheckout } = await import('./licenses.controller.js');

      await expect(createLicenseCheckout(ctx)).rejects.toThrow('Number of seats is required');
    });

    it('should throw 404 when course not found', async () => {
      mockCourse.findByPk.mockResolvedValue(null);

      const ctx = createMockContext({
        request: { body: { courseId: 'missing', licenseType: 'seats', seats: 5 } } as unknown as Context['request'],
      });

      const { createLicenseCheckout } = await import('./licenses.controller.js');

      await expect(createLicenseCheckout(ctx)).rejects.toThrow('Course not found');
    });

    it('should throw 400 for unpublished course', async () => {
      mockCourse.findByPk.mockResolvedValue({
        id: 'c-1', status: 'draft', isFree: false,
      });

      const ctx = createMockContext({
        request: { body: { courseId: 'c-1', licenseType: 'seats', seats: 5 } } as unknown as Context['request'],
      });

      const { createLicenseCheckout } = await import('./licenses.controller.js');

      await expect(createLicenseCheckout(ctx)).rejects.toThrow('not available for purchase');
    });

    it('should throw 400 for free course', async () => {
      mockCourse.findByPk.mockResolvedValue({
        id: 'c-1', status: CourseStatus.PUBLISHED, isFree: true,
      });

      const ctx = createMockContext({
        request: { body: { courseId: 'c-1', licenseType: 'seats', seats: 5 } } as unknown as Context['request'],
      });

      const { createLicenseCheckout } = await import('./licenses.controller.js');

      await expect(createLicenseCheckout(ctx)).rejects.toThrow('free');
    });

    it('should throw 409 when license already exists', async () => {
      mockCourse.findByPk.mockResolvedValue({
        id: 'c-1', status: CourseStatus.PUBLISHED, isFree: false, price: 50,
      });
      mockTenant.findByPk.mockResolvedValue({
        id: 'tenant-1', name: 'Acme', stripeCustomerId: 'cus_test',
        update: vi.fn(),
      });
      mockTenantCourseLicense.findOne.mockResolvedValue({ id: 'existing' });

      const ctx = createMockContext({
        request: { body: { courseId: 'c-1', licenseType: 'seats', seats: 5 } } as unknown as Context['request'],
      });

      const { createLicenseCheckout } = await import('./licenses.controller.js');

      await expect(createLicenseCheckout(ctx)).rejects.toThrow('already has an active license');
    });

    it('should throw 401 without user', async () => {
      const ctx = createMockContext({ state: {} });

      const { createLicenseCheckout } = await import('./licenses.controller.js');

      await expect(createLicenseCheckout(ctx)).rejects.toThrow('Authentication required');
    });

    it('should throw 403 for learner role', async () => {
      const ctx = createMockContext({
        state: {
          user: { userId: 'u-1', email: 'u@t.com', role: UserRole.LEARNER, tenantId: 'tenant-1' },
        },
        request: { body: { courseId: 'c-1', licenseType: 'seats', seats: 5 } } as unknown as Context['request'],
      });

      const { createLicenseCheckout } = await import('./licenses.controller.js');

      await expect(createLicenseCheckout(ctx)).rejects.toThrow('Admin or manager access required');
    });
  });

  describe('listLicenses', () => {
    it('should return paginated licenses', async () => {
      const license = createMockLicense();
      mockTenantCourseLicense.findAndCountAll.mockResolvedValue({
        rows: [license], count: 1,
      });

      const ctx = createMockContext({
        query: { page: 1, limit: 20 } as unknown as Record<string, string>,
      });

      const { listLicenses } = await import('./licenses.controller.js');
      await listLicenses(ctx);

      const body = ctx.body as { data: { licenses: unknown[]; pagination: { total: number } } };
      expect(body.data.licenses).toHaveLength(1);
      expect(body.data.pagination.total).toBe(1);
    });

    it('should filter by active status', async () => {
      mockTenantCourseLicense.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      const ctx = createMockContext({
        query: { status: 'active', page: 1, limit: 20 } as unknown as Record<string, string>,
      });

      const { listLicenses } = await import('./licenses.controller.js');
      await listLicenses(ctx);

      expect(mockTenantCourseLicense.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: PurchaseStatus.COMPLETED,
          }),
        })
      );
    });

    it('should filter by pending status', async () => {
      mockTenantCourseLicense.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      const ctx = createMockContext({
        query: { status: 'pending', page: 1, limit: 20 } as unknown as Record<string, string>,
      });

      const { listLicenses } = await import('./licenses.controller.js');
      await listLicenses(ctx);

      expect(mockTenantCourseLicense.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: PurchaseStatus.PENDING,
          }),
        })
      );
    });
  });

  describe('getLicense', () => {
    it('should return license with assignments', async () => {
      const license = createMockLicense({
        assignments: [{ id: 'a-1', userId: 'u-1', assignedAt: new Date(), user: { id: 'u-1' } }],
      });
      mockTenantCourseLicense.findOne.mockResolvedValue(license);

      const ctx = createMockContext({ params: { id: 'license-1' } });

      const { getLicense } = await import('./licenses.controller.js');
      await getLicense(ctx);

      const body = ctx.body as { data: { id: string; assignments: unknown[] } };
      expect(body.data.id).toBe('license-1');
      expect(body.data.assignments).toHaveLength(1);
    });

    it('should throw 404 when license not found', async () => {
      mockTenantCourseLicense.findOne.mockResolvedValue(null);

      const ctx = createMockContext({ params: { id: 'missing' } });

      const { getLicense } = await import('./licenses.controller.js');

      await expect(getLicense(ctx)).rejects.toThrow('License not found');
    });
  });

  describe('assignSeat', () => {
    it('should assign user to seat license', async () => {
      const license = createMockLicense();
      mockTenantCourseLicense.findOne.mockResolvedValue(license);
      mockUser.findOne.mockResolvedValue({ id: 'u-2', tenantId: 'tenant-1' });
      mockTenantCourseLicenseAssignment.findOne.mockResolvedValue(null);
      mockTenantCourseLicenseAssignment.create.mockResolvedValue({});

      const ctx = createMockContext({
        params: { id: 'license-1' },
        request: { body: { userId: 'u-2' } } as unknown as Context['request'],
      });

      const { assignSeat } = await import('./licenses.controller.js');
      await assignSeat(ctx);

      const body = ctx.body as { data: { seatsUsed: number } };
      expect(body.data.seatsUsed).toBe(4); // 3 + 1
    });

    it('should throw 400 without userId', async () => {
      const ctx = createMockContext({
        params: { id: 'license-1' },
        request: { body: {} } as unknown as Context['request'],
      });

      const { assignSeat } = await import('./licenses.controller.js');

      await expect(assignSeat(ctx)).rejects.toThrow('User ID is required');
    });

    it('should throw 404 when license not found', async () => {
      mockTenantCourseLicense.findOne.mockResolvedValue(null);

      const ctx = createMockContext({
        params: { id: 'missing' },
        request: { body: { userId: 'u-2' } } as unknown as Context['request'],
      });

      const { assignSeat } = await import('./licenses.controller.js');

      await expect(assignSeat(ctx)).rejects.toThrow('License not found');
    });

    it('should throw 400 for inactive license', async () => {
      mockTenantCourseLicense.findOne.mockResolvedValue(
        createMockLicense({ status: PurchaseStatus.PENDING })
      );

      const ctx = createMockContext({
        params: { id: 'license-1' },
        request: { body: { userId: 'u-2' } } as unknown as Context['request'],
      });

      const { assignSeat } = await import('./licenses.controller.js');

      await expect(assignSeat(ctx)).rejects.toThrow('License is not active');
    });

    it('should throw 400 for unlimited license', async () => {
      mockTenantCourseLicense.findOne.mockResolvedValue(
        createMockLicense({ licenseType: LicenseType.UNLIMITED })
      );

      const ctx = createMockContext({
        params: { id: 'license-1' },
        request: { body: { userId: 'u-2' } } as unknown as Context['request'],
      });

      const { assignSeat } = await import('./licenses.controller.js');

      await expect(assignSeat(ctx)).rejects.toThrow('do not require seat assignment');
    });

    it('should throw 400 when no available seats', async () => {
      mockTenantCourseLicense.findOne.mockResolvedValue(
        createMockLicense({ hasAvailableSeats: false })
      );

      const ctx = createMockContext({
        params: { id: 'license-1' },
        request: { body: { userId: 'u-2' } } as unknown as Context['request'],
      });

      const { assignSeat } = await import('./licenses.controller.js');

      await expect(assignSeat(ctx)).rejects.toThrow('No available seats');
    });

    it('should throw 404 when user not in tenant', async () => {
      mockTenantCourseLicense.findOne.mockResolvedValue(createMockLicense());
      mockUser.findOne.mockResolvedValue(null);

      const ctx = createMockContext({
        params: { id: 'license-1' },
        request: { body: { userId: 'u-outside' } } as unknown as Context['request'],
      });

      const { assignSeat } = await import('./licenses.controller.js');

      await expect(assignSeat(ctx)).rejects.toThrow('User not found');
    });

    it('should throw 409 when user already assigned', async () => {
      mockTenantCourseLicense.findOne.mockResolvedValue(createMockLicense());
      mockUser.findOne.mockResolvedValue({ id: 'u-2', tenantId: 'tenant-1' });
      mockTenantCourseLicenseAssignment.findOne.mockResolvedValue({ id: 'existing' });

      const ctx = createMockContext({
        params: { id: 'license-1' },
        request: { body: { userId: 'u-2' } } as unknown as Context['request'],
      });

      const { assignSeat } = await import('./licenses.controller.js');

      await expect(assignSeat(ctx)).rejects.toThrow('already assigned');
    });
  });

  describe('unassignSeat', () => {
    it('should unassign user from license', async () => {
      const license = createMockLicense();
      mockTenantCourseLicense.findOne.mockResolvedValue(license);
      const assignment = { id: 'a-1', destroy: vi.fn().mockResolvedValue(undefined) };
      mockTenantCourseLicenseAssignment.findOne.mockResolvedValue(assignment);

      const ctx = createMockContext({
        params: { id: 'license-1', userId: 'u-2' },
      });

      const { unassignSeat } = await import('./licenses.controller.js');
      await unassignSeat(ctx);

      const body = ctx.body as { data: { seatsUsed: number } };
      expect(body.data.seatsUsed).toBe(2); // 3 - 1
    });

    it('should throw 400 for unlimited license', async () => {
      mockTenantCourseLicense.findOne.mockResolvedValue(
        createMockLicense({ licenseType: LicenseType.UNLIMITED })
      );

      const ctx = createMockContext({
        params: { id: 'license-1', userId: 'u-2' },
      });

      const { unassignSeat } = await import('./licenses.controller.js');

      await expect(unassignSeat(ctx)).rejects.toThrow('do not have seat assignments');
    });

    it('should throw 404 when assignment not found', async () => {
      mockTenantCourseLicense.findOne.mockResolvedValue(createMockLicense());
      mockTenantCourseLicenseAssignment.findOne.mockResolvedValue(null);

      const ctx = createMockContext({
        params: { id: 'license-1', userId: 'u-missing' },
      });

      const { unassignSeat } = await import('./licenses.controller.js');

      await expect(unassignSeat(ctx)).rejects.toThrow('Assignment not found');
    });
  });

  describe('requestLicenseRefund', () => {
    it('should process refund via Stripe', async () => {
      const license = createMockLicense();
      mockTenantCourseLicense.findOne.mockResolvedValue(license);
      mockStripeService.createRefund.mockResolvedValue({
        refundId: 're_test',
        amount: 50000,
      });
      mockTenantCourseLicenseAssignment.destroy.mockResolvedValue(0);

      const ctx = createMockContext({
        params: { id: 'license-1' },
        request: { body: { reason: 'No longer needed' } } as unknown as Context['request'],
      });

      const { requestLicenseRefund } = await import('./licenses.controller.js');
      await requestLicenseRefund(ctx);

      const body = ctx.body as { data: { status: string; refundId: string } };
      expect(body.data.status).toBe(PurchaseStatus.REFUNDED);
      expect(body.data.refundId).toBe('re_test');
      expect(license.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PurchaseStatus.REFUNDED,
          refundAmount: 500,
        })
      );
    });

    it('should throw 403 for manager role', async () => {
      const ctx = createMockContext({
        state: {
          user: { userId: 'm-1', email: 'm@t.com', role: UserRole.MANAGER, tenantId: 'tenant-1' },
        },
        params: { id: 'license-1' },
        request: { body: {} } as unknown as Context['request'],
      });

      const { requestLicenseRefund } = await import('./licenses.controller.js');

      await expect(requestLicenseRefund(ctx)).rejects.toThrow('Only tenant administrators');
    });

    it('should throw 400 for non-active license', async () => {
      mockTenantCourseLicense.findOne.mockResolvedValue(
        createMockLicense({ status: PurchaseStatus.PENDING })
      );

      const ctx = createMockContext({
        params: { id: 'license-1' },
        request: { body: {} } as unknown as Context['request'],
      });

      const { requestLicenseRefund } = await import('./licenses.controller.js');

      await expect(requestLicenseRefund(ctx)).rejects.toThrow('Only active licenses');
    });

    it('should throw 400 when no payment intent', async () => {
      mockTenantCourseLicense.findOne.mockResolvedValue(
        createMockLicense({ stripePaymentIntentId: null })
      );

      const ctx = createMockContext({
        params: { id: 'license-1' },
        request: { body: {} } as unknown as Context['request'],
      });

      const { requestLicenseRefund } = await import('./licenses.controller.js');

      await expect(requestLicenseRefund(ctx)).rejects.toThrow('no associated payment');
    });
  });

  describe('hasLicenseAccess', () => {
    it('should return true for unlimited license', async () => {
      mockTenantCourseLicense.findOne.mockResolvedValue(
        createMockLicense({ licenseType: LicenseType.UNLIMITED, isExpired: false })
      );

      const { hasLicenseAccess } = await import('./licenses.controller.js');
      const result = await hasLicenseAccess('u-1', 'course-1', 'tenant-1');

      expect(result).toBe(true);
    });

    it('should return true for assigned seats license', async () => {
      mockTenantCourseLicense.findOne.mockResolvedValue(
        createMockLicense({ licenseType: LicenseType.SEATS, isExpired: false })
      );
      mockTenantCourseLicenseAssignment.findOne.mockResolvedValue({ id: 'a-1' });

      const { hasLicenseAccess } = await import('./licenses.controller.js');
      const result = await hasLicenseAccess('u-1', 'course-1', 'tenant-1');

      expect(result).toBe(true);
    });

    it('should return false for unassigned seats license', async () => {
      mockTenantCourseLicense.findOne.mockResolvedValue(
        createMockLicense({ licenseType: LicenseType.SEATS, isExpired: false })
      );
      mockTenantCourseLicenseAssignment.findOne.mockResolvedValue(null);

      const { hasLicenseAccess } = await import('./licenses.controller.js');
      const result = await hasLicenseAccess('u-1', 'course-1', 'tenant-1');

      expect(result).toBe(false);
    });

    it('should return false for expired license', async () => {
      mockTenantCourseLicense.findOne.mockResolvedValue(
        createMockLicense({ isExpired: true })
      );

      const { hasLicenseAccess } = await import('./licenses.controller.js');
      const result = await hasLicenseAccess('u-1', 'course-1', 'tenant-1');

      expect(result).toBe(false);
    });

    it('should return false when no license exists', async () => {
      mockTenantCourseLicense.findOne.mockResolvedValue(null);

      const { hasLicenseAccess } = await import('./licenses.controller.js');
      const result = await hasLicenseAccess('u-1', 'course-1', 'tenant-1');

      expect(result).toBe(false);
    });

    it('should return false for null tenantId', async () => {
      const { hasLicenseAccess } = await import('./licenses.controller.js');
      const result = await hasLicenseAccess('u-1', 'course-1', null);

      expect(result).toBe(false);
    });
  });

  describe('getLicensePricing', () => {
    it('should return pricing preview', async () => {
      mockCourse.findByPk.mockResolvedValue({
        id: 'course-1', price: 50, currency: 'eur', title: 'Test',
      });

      const ctx = createMockContext({
        query: { courseId: 'course-1', licenseType: 'seats', seats: '10' },
      });

      const { getLicensePricing } = await import('./licenses.controller.js');
      await getLicensePricing(ctx);

      expect(mockCalculateLicensePrice).toHaveBeenCalledWith(50, 'seats', 10, expect.anything());
    });

    it('should throw 400 without courseId', async () => {
      const ctx = createMockContext({ query: {} });

      const { getLicensePricing } = await import('./licenses.controller.js');

      await expect(getLicensePricing(ctx)).rejects.toThrow('Course ID is required');
    });

    it('should throw 404 when course not found', async () => {
      mockCourse.findByPk.mockResolvedValue(null);

      const ctx = createMockContext({ query: { courseId: 'missing' } });

      const { getLicensePricing } = await import('./licenses.controller.js');

      await expect(getLicensePricing(ctx)).rejects.toThrow('Course not found');
    });
  });

  describe('renewLicense', () => {
    it('should create renewal checkout', async () => {
      const license = createMockLicense();
      mockTenantCourseLicense.findOne.mockResolvedValue(license);
      mockTenant.findByPk.mockResolvedValue({
        id: 'tenant-1', stripeCustomerId: 'cus_test',
      });
      mockStripeService.createB2BLicenseCheckoutSession.mockResolvedValue({
        sessionId: 'cs_renew', url: 'https://checkout.stripe.com/renew',
      });

      const ctx = createMockContext({ params: { id: 'license-1' } });

      const { renewLicense } = await import('./licenses.controller.js');
      await renewLicense(ctx);

      const body = ctx.body as { data: { sessionId: string } };
      expect(body.data.sessionId).toBe('cs_renew');
    });

    it('should throw 404 when license not found', async () => {
      mockTenantCourseLicense.findOne.mockResolvedValue(null);

      const ctx = createMockContext({ params: { id: 'missing' } });

      const { renewLicense } = await import('./licenses.controller.js');

      await expect(renewLicense(ctx)).rejects.toThrow('License not found');
    });

    it('should throw 400 when course missing from license', async () => {
      mockTenantCourseLicense.findOne.mockResolvedValue(
        createMockLicense({ course: null })
      );

      const ctx = createMockContext({ params: { id: 'license-1' } });

      const { renewLicense } = await import('./licenses.controller.js');

      await expect(renewLicense(ctx)).rejects.toThrow('Course not found for this license');
    });
  });

  describe('updateTenantDiscountTiers', () => {
    it('should update discount tiers', async () => {
      const tenant = {
        id: 'tenant-1', settings: {},
        update: vi.fn().mockResolvedValue(undefined),
      };
      mockTenant.findByPk.mockResolvedValue(tenant);

      const ctx = createMockContext({
        params: { id: 'tenant-1' },
        request: {
          body: { tiers: [{ minSeats: 10, discountPercent: 15 }] },
        } as unknown as Context['request'],
      });

      const { updateTenantDiscountTiers } = await import('./licenses.controller.js');
      await updateTenantDiscountTiers(ctx);

      expect(tenant.update).toHaveBeenCalledWith({
        settings: { volumeDiscountTiers: [{ minSeats: 10, discountPercent: 15 }] },
      });
    });

    it('should throw 400 for empty tiers', async () => {
      const ctx = createMockContext({
        params: { id: 'tenant-1' },
        request: { body: { tiers: [] } } as unknown as Context['request'],
      });

      const { updateTenantDiscountTiers } = await import('./licenses.controller.js');

      await expect(updateTenantDiscountTiers(ctx)).rejects.toThrow('non-empty array');
    });

    it('should throw 400 for invalid minSeats', async () => {
      const ctx = createMockContext({
        params: { id: 'tenant-1' },
        request: { body: { tiers: [{ minSeats: 0, discountPercent: 10 }] } } as unknown as Context['request'],
      });

      const { updateTenantDiscountTiers } = await import('./licenses.controller.js');

      await expect(updateTenantDiscountTiers(ctx)).rejects.toThrow('positive minSeats');
    });

    it('should throw 400 for discount > 100', async () => {
      const ctx = createMockContext({
        params: { id: 'tenant-1' },
        request: { body: { tiers: [{ minSeats: 10, discountPercent: 150 }] } } as unknown as Context['request'],
      });

      const { updateTenantDiscountTiers } = await import('./licenses.controller.js');

      await expect(updateTenantDiscountTiers(ctx)).rejects.toThrow('between 0 and 100');
    });

    it('should throw 404 when tenant not found', async () => {
      mockTenant.findByPk.mockResolvedValue(null);

      const ctx = createMockContext({
        params: { id: 'missing' },
        request: { body: { tiers: [{ minSeats: 10, discountPercent: 10 }] } } as unknown as Context['request'],
      });

      const { updateTenantDiscountTiers } = await import('./licenses.controller.js');

      await expect(updateTenantDiscountTiers(ctx)).rejects.toThrow('Tenant not found');
    });
  });

  describe('deleteTenantDiscountTiers', () => {
    it('should reset to defaults', async () => {
      const tenant = {
        id: 'tenant-1', settings: { volumeDiscountTiers: [{ minSeats: 10, discountPercent: 15 }] },
        update: vi.fn().mockResolvedValue(undefined),
      };
      mockTenant.findByPk.mockResolvedValue(tenant);

      const ctx = createMockContext({ params: { id: 'tenant-1' } });

      const { deleteTenantDiscountTiers } = await import('./licenses.controller.js');
      await deleteTenantDiscountTiers(ctx);

      expect(tenant.update).toHaveBeenCalledWith({
        settings: {},
      });
      const body = ctx.body as { data: { isDefault: boolean } };
      expect(body.data.isDefault).toBe(true);
    });

    it('should throw 404 when tenant not found', async () => {
      mockTenant.findByPk.mockResolvedValue(null);

      const ctx = createMockContext({ params: { id: 'missing' } });

      const { deleteTenantDiscountTiers } = await import('./licenses.controller.js');

      await expect(deleteTenantDiscountTiers(ctx)).rejects.toThrow('Tenant not found');
    });
  });
});
