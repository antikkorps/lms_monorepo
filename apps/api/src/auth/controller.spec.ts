import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context } from 'koa';
import { UserRole, UserStatus, SupportedLocale } from '../database/models/enums.js';

// =============================================================================
// Module Mocks
// =============================================================================

vi.mock('../database/models/User.js', () => ({
  User: {
    findOne: vi.fn(),
    findByPk: vi.fn(),
    create: vi.fn(),
    increment: vi.fn(),
  },
}));

vi.mock('../database/models/Tenant.js', () => ({
  Tenant: {
    findOne: vi.fn(),
    findByPk: vi.fn(),
    increment: vi.fn(),
  },
}));

vi.mock('./password.js', () => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
  validatePasswordStrength: vi.fn(),
}));

vi.mock('./jwt.js', () => ({
  generateTokenPair: vi.fn(),
  generateAccessToken: vi.fn(),
  generateRefreshToken: vi.fn(),
  verifyRefreshToken: vi.fn(),
}));

vi.mock('./session.js', () => ({
  storeRefreshTokenFamily: vi.fn(),
  invalidateRefreshTokenFamily: vi.fn(),
  invalidateAllUserSessions: vi.fn(),
  detectTokenReuse: vi.fn(),
  getRefreshTokenFamily: vi.fn(),
  generatePasswordResetToken: vi.fn(),
  storePasswordResetToken: vi.fn(),
  getPasswordResetToken: vi.fn(),
  deletePasswordResetToken: vi.fn(),
  generateEmailVerificationToken: vi.fn(),
  storeEmailVerificationToken: vi.fn(),
  getEmailVerificationToken: vi.fn(),
  deleteEmailVerificationToken: vi.fn(),
}));

vi.mock('../utils/locale.js', () => ({
  parseLocaleFromRequest: vi.fn(),
}));

// Need to override global config mock to add cookieSecure/cookieDomain
vi.mock('../config/index.js', () => ({
  config: {
    env: 'test',
    port: 3000,
    frontendUrl: 'http://localhost:5173',
    jwtSecret: 'test-jwt-secret',
    jwtRefreshSecret: 'test-refresh-secret',
    jwtAccessExpiresIn: '15m',
    jwtRefreshExpiresIn: '7d',
    cookieSecure: false,
    cookieDomain: '',
    corsOrigins: ['http://localhost:5173'],
    email: {
      provider: 'console',
      from: 'test@example.com',
      fromName: 'Test LMS',
    },
  },
}));

// Import after mocks
import {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  me,
  updateLocale,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
} from './controller.js';
import { User } from '../database/models/User.js';
import { Tenant } from '../database/models/Tenant.js';
import { hashPassword, verifyPassword, validatePasswordStrength } from './password.js';
import {
  generateTokenPair,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from './jwt.js';
import {
  storeRefreshTokenFamily,
  invalidateRefreshTokenFamily,
  invalidateAllUserSessions,
  detectTokenReuse,
  getRefreshTokenFamily,
  generatePasswordResetToken,
  storePasswordResetToken,
  getPasswordResetToken,
  deletePasswordResetToken,
  generateEmailVerificationToken,
  storeEmailVerificationToken,
  getEmailVerificationToken,
  deleteEmailVerificationToken,
} from './session.js';
import { parseLocaleFromRequest } from '../utils/locale.js';
import { emailService } from '../services/email/index.js';

// =============================================================================
// Test Helpers
// =============================================================================

interface MockContextOptions {
  params?: Record<string, string>;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  state?: Record<string, unknown>;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
}

function createMockContext(options: MockContextOptions = {}): Context {
  const headers = options.headers || {};
  const cookieStore = options.cookies || {};
  const setCookies: Record<string, string> = {};
  return {
    params: options.params || {},
    query: options.query || {},
    request: {
      body: options.body || {},
    },
    state: options.state || {},
    status: 200,
    body: null,
    get: (name: string) => headers[name.toLowerCase()] || '',
    cookies: {
      get: (name: string) => cookieStore[name] || undefined,
      set: vi.fn((name: string, value: string) => {
        setCookies[name] = value;
      }),
    },
  } as unknown as Context;
}

function createMockUser(overrides: Record<string, unknown> = {}) {
  const data: Record<string, unknown> = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    passwordHash: 'hashed-password',
    role: UserRole.LEARNER,
    status: UserStatus.ACTIVE,
    tenantId: null,
    avatarUrl: null,
    locale: SupportedLocale.EN,
    lastLoginAt: null,
    createdAt: new Date('2025-01-01'),
    ...overrides,
  };
  return {
    ...data,
    get fullName(): string {
      return `${data.firstName} ${data.lastName}`;
    },
    update: vi.fn().mockResolvedValue(undefined),
    toJSON: () => data,
  };
}

function createMockTenant(overrides: Record<string, unknown> = {}) {
  const data = {
    id: 'tenant-123',
    name: 'Test Org',
    slug: 'test-org',
    logoUrl: null,
    seatsPurchased: 10,
    seatsUsed: 5,
    ...overrides,
  };
  return {
    ...data,
    toJSON: () => data,
  };
}

// =============================================================================
// Test Suite
// =============================================================================

describe('Auth Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // register
  // ===========================================================================

  describe('register', () => {
    it('should throw VALIDATION_ERROR on missing required fields', async () => {
      const ctx = createMockContext({ body: { email: 'a@b.com' } });
      await expect(register(ctx)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      });
    });

    it('should throw WEAK_PASSWORD on weak password', async () => {
      const ctx = createMockContext({
        body: { email: 'a@b.com', password: 'weak', firstName: 'A', lastName: 'B' },
      });
      vi.mocked(validatePasswordStrength).mockReturnValue({ valid: false, errors: ['too short'] });

      await expect(register(ctx)).rejects.toMatchObject({
        code: 'WEAK_PASSWORD',
        statusCode: 400,
      });
    });

    it('should throw EMAIL_EXISTS on duplicate email', async () => {
      const ctx = createMockContext({
        body: { email: 'a@b.com', password: 'Strong1!', firstName: 'A', lastName: 'B' },
      });
      vi.mocked(validatePasswordStrength).mockReturnValue({ valid: true, errors: [] });
      vi.mocked(User.findOne).mockResolvedValue(createMockUser() as never);

      await expect(register(ctx)).rejects.toMatchObject({
        code: 'EMAIL_EXISTS',
        statusCode: 409,
      });
    });

    it('should throw INVALID_TENANT on bad tenant slug', async () => {
      const ctx = createMockContext({
        body: {
          email: 'a@b.com',
          password: 'Strong1!',
          firstName: 'A',
          lastName: 'B',
          tenantSlug: 'bad-slug',
        },
      });
      vi.mocked(validatePasswordStrength).mockReturnValue({ valid: true, errors: [] });
      vi.mocked(User.findOne).mockResolvedValue(null as never);
      vi.mocked(Tenant.findOne).mockResolvedValue(null as never);

      await expect(register(ctx)).rejects.toMatchObject({
        code: 'INVALID_TENANT',
        statusCode: 400,
      });
    });

    it('should throw NO_SEATS_AVAILABLE when tenant is full', async () => {
      const ctx = createMockContext({
        body: {
          email: 'a@b.com',
          password: 'Strong1!',
          firstName: 'A',
          lastName: 'B',
          tenantSlug: 'test-org',
        },
      });
      vi.mocked(validatePasswordStrength).mockReturnValue({ valid: true, errors: [] });
      vi.mocked(User.findOne).mockResolvedValue(null as never);
      vi.mocked(Tenant.findOne).mockResolvedValue(
        createMockTenant({ seatsPurchased: 5, seatsUsed: 5 }) as never
      );

      await expect(register(ctx)).rejects.toMatchObject({
        code: 'NO_SEATS_AVAILABLE',
        statusCode: 403,
      });
    });

    it('should create user with PENDING status and send verification email', async () => {
      const ctx = createMockContext({
        body: { email: 'new@test.com', password: 'Strong1!', firstName: 'Jane', lastName: 'Doe' },
        headers: { 'accept-language': 'fr' },
      });
      const mockUser = createMockUser({
        id: 'new-user',
        email: 'new@test.com',
        firstName: 'Jane',
        lastName: 'Doe',
        status: UserStatus.PENDING,
      });

      vi.mocked(validatePasswordStrength).mockReturnValue({ valid: true, errors: [] });
      vi.mocked(User.findOne).mockResolvedValue(null as never);
      vi.mocked(hashPassword).mockResolvedValue('hashed-pw');
      vi.mocked(User.create).mockResolvedValue(mockUser as never);
      vi.mocked(generateEmailVerificationToken).mockReturnValue('verify-token-123');
      vi.mocked(storeEmailVerificationToken).mockResolvedValue(undefined);
      vi.mocked(parseLocaleFromRequest).mockReturnValue(SupportedLocale.FR);

      await register(ctx);

      expect(ctx.status).toBe(201);
      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@test.com',
          status: UserStatus.PENDING,
          passwordHash: 'hashed-pw',
        })
      );
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'new@test.com',
          firstName: 'Jane',
          locale: SupportedLocale.FR,
        })
      );
    });

    it('should create user with tenant and increment seatsUsed', async () => {
      const ctx = createMockContext({
        body: {
          email: 'new@test.com',
          password: 'Strong1!',
          firstName: 'Jane',
          lastName: 'Doe',
          tenantSlug: 'test-org',
        },
      });
      const tenant = createMockTenant();
      const mockUser = createMockUser({
        id: 'new-user',
        email: 'new@test.com',
        status: UserStatus.PENDING,
        tenantId: 'tenant-123',
      });

      vi.mocked(validatePasswordStrength).mockReturnValue({ valid: true, errors: [] });
      vi.mocked(User.findOne).mockResolvedValue(null as never);
      vi.mocked(Tenant.findOne).mockResolvedValue(tenant as never);
      vi.mocked(hashPassword).mockResolvedValue('hashed-pw');
      vi.mocked(User.create).mockResolvedValue(mockUser as never);
      vi.mocked(generateEmailVerificationToken).mockReturnValue('verify-token');
      vi.mocked(storeEmailVerificationToken).mockResolvedValue(undefined);
      vi.mocked(parseLocaleFromRequest).mockReturnValue(SupportedLocale.EN);

      await register(ctx);

      expect(ctx.status).toBe(201);
      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'tenant-123' })
      );
      expect(Tenant.increment).toHaveBeenCalledWith('seatsUsed', {
        where: { id: 'tenant-123' },
      });
    });

    it('should return 201 with user data', async () => {
      const ctx = createMockContext({
        body: { email: 'new@test.com', password: 'Strong1!', firstName: 'Jane', lastName: 'Doe' },
      });
      const mockUser = createMockUser({
        id: 'new-user',
        email: 'new@test.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: UserRole.LEARNER,
        status: UserStatus.PENDING,
        tenantId: null,
      });

      vi.mocked(validatePasswordStrength).mockReturnValue({ valid: true, errors: [] });
      vi.mocked(User.findOne).mockResolvedValue(null as never);
      vi.mocked(hashPassword).mockResolvedValue('hashed-pw');
      vi.mocked(User.create).mockResolvedValue(mockUser as never);
      vi.mocked(generateEmailVerificationToken).mockReturnValue('token');
      vi.mocked(storeEmailVerificationToken).mockResolvedValue(undefined);
      vi.mocked(parseLocaleFromRequest).mockReturnValue(SupportedLocale.EN);

      await register(ctx);

      expect(ctx.status).toBe(201);
      const body = ctx.body as { success: boolean; data: { user: Record<string, unknown> } };
      expect(body.success).toBe(true);
      expect(body.data.user).toMatchObject({
        id: 'new-user',
        email: 'new@test.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: UserRole.LEARNER,
        status: UserStatus.PENDING,
      });
    });
  });

  // ===========================================================================
  // login
  // ===========================================================================

  describe('login', () => {
    it('should throw VALIDATION_ERROR on missing email/password', async () => {
      const ctx = createMockContext({ body: { email: 'a@b.com' } });
      await expect(login(ctx)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      });
    });

    it('should throw INVALID_CREDENTIALS on unknown email', async () => {
      const ctx = createMockContext({ body: { email: 'unknown@test.com', password: 'pass' } });
      vi.mocked(User.findOne).mockResolvedValue(null as never);

      await expect(login(ctx)).rejects.toMatchObject({
        code: 'INVALID_CREDENTIALS',
        statusCode: 401,
      });
    });

    it('should throw INVALID_CREDENTIALS on wrong password', async () => {
      const ctx = createMockContext({ body: { email: 'test@test.com', password: 'wrong' } });
      vi.mocked(User.findOne).mockResolvedValue(createMockUser() as never);
      vi.mocked(verifyPassword).mockResolvedValue(false);

      await expect(login(ctx)).rejects.toMatchObject({
        code: 'INVALID_CREDENTIALS',
        statusCode: 401,
      });
    });

    it('should throw EMAIL_NOT_VERIFIED on PENDING user', async () => {
      const ctx = createMockContext({ body: { email: 'test@test.com', password: 'pass' } });
      vi.mocked(User.findOne).mockResolvedValue(
        createMockUser({ status: UserStatus.PENDING }) as never
      );
      vi.mocked(verifyPassword).mockResolvedValue(true);

      await expect(login(ctx)).rejects.toMatchObject({
        code: 'EMAIL_NOT_VERIFIED',
        statusCode: 403,
      });
    });

    it('should throw ACCOUNT_INACTIVE on non-ACTIVE user', async () => {
      const ctx = createMockContext({ body: { email: 'test@test.com', password: 'pass' } });
      vi.mocked(User.findOne).mockResolvedValue(
        createMockUser({ status: UserStatus.SUSPENDED }) as never
      );
      vi.mocked(verifyPassword).mockResolvedValue(true);

      await expect(login(ctx)).rejects.toMatchObject({
        code: 'ACCOUNT_INACTIVE',
        statusCode: 403,
      });
    });

    it('should generate tokens, set cookies, and update lastLoginAt on success', async () => {
      const mockUser = createMockUser();
      const ctx = createMockContext({ body: { email: 'test@test.com', password: 'pass' } });
      vi.mocked(User.findOne).mockResolvedValue(mockUser as never);
      vi.mocked(verifyPassword).mockResolvedValue(true);
      vi.mocked(generateTokenPair).mockReturnValue({
        accessToken: 'at-123',
        refreshToken: 'rt-123',
        tokenFamily: 'fam-123',
      });
      vi.mocked(storeRefreshTokenFamily).mockResolvedValue(undefined);

      await login(ctx);

      expect(storeRefreshTokenFamily).toHaveBeenCalledWith('user-123', 'fam-123', 'rt-123');
      expect(mockUser.update).toHaveBeenCalledWith({ lastLoginAt: expect.any(Date) });
      expect(ctx.cookies.set).toHaveBeenCalledWith(
        'access_token',
        'at-123',
        expect.any(Object)
      );
      expect(ctx.cookies.set).toHaveBeenCalledWith(
        'refresh_token',
        'rt-123',
        expect.any(Object)
      );
    });

    it('should return user data and accessToken', async () => {
      const mockUser = createMockUser();
      const ctx = createMockContext({ body: { email: 'test@test.com', password: 'pass' } });
      vi.mocked(User.findOne).mockResolvedValue(mockUser as never);
      vi.mocked(verifyPassword).mockResolvedValue(true);
      vi.mocked(generateTokenPair).mockReturnValue({
        accessToken: 'at-123',
        refreshToken: 'rt-123',
        tokenFamily: 'fam-123',
      });
      vi.mocked(storeRefreshTokenFamily).mockResolvedValue(undefined);

      await login(ctx);

      const body = ctx.body as {
        success: boolean;
        data: { user: Record<string, unknown>; accessToken: string };
      };
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBe('at-123');
      expect(body.data.user).toMatchObject({
        id: 'user-123',
        email: 'test@example.com',
      });
    });
  });

  // ===========================================================================
  // refresh
  // ===========================================================================

  describe('refresh', () => {
    it('should throw REFRESH_TOKEN_REQUIRED when no token provided', async () => {
      const ctx = createMockContext({ body: {} });
      await expect(refresh(ctx)).rejects.toMatchObject({
        code: 'REFRESH_TOKEN_REQUIRED',
        statusCode: 401,
      });
    });

    it('should read token from cookie', async () => {
      const mockUser = createMockUser();
      const ctx = createMockContext({ cookies: { refresh_token: 'rt-from-cookie' } });
      vi.mocked(verifyRefreshToken).mockReturnValue({
        userId: 'user-123',
        tokenFamily: 'fam-123',
        type: 'refresh',
      });
      vi.mocked(detectTokenReuse).mockResolvedValue(false);
      vi.mocked(getRefreshTokenFamily).mockResolvedValue({
        userId: 'user-123',
        refreshToken: 'rt-from-cookie',
        createdAt: Date.now(),
      });
      vi.mocked(User.findByPk).mockResolvedValue(mockUser as never);
      vi.mocked(generateAccessToken).mockReturnValue('new-at');
      vi.mocked(generateRefreshToken).mockReturnValue('new-rt');
      vi.mocked(storeRefreshTokenFamily).mockResolvedValue(undefined);

      await refresh(ctx);

      expect(verifyRefreshToken).toHaveBeenCalledWith('rt-from-cookie');
    });

    it('should read token from body', async () => {
      const mockUser = createMockUser();
      const ctx = createMockContext({ body: { refreshToken: 'rt-from-body' } });
      vi.mocked(verifyRefreshToken).mockReturnValue({
        userId: 'user-123',
        tokenFamily: 'fam-123',
        type: 'refresh',
      });
      vi.mocked(detectTokenReuse).mockResolvedValue(false);
      vi.mocked(getRefreshTokenFamily).mockResolvedValue({
        userId: 'user-123',
        refreshToken: 'rt-from-body',
        createdAt: Date.now(),
      });
      vi.mocked(User.findByPk).mockResolvedValue(mockUser as never);
      vi.mocked(generateAccessToken).mockReturnValue('new-at');
      vi.mocked(generateRefreshToken).mockReturnValue('new-rt');
      vi.mocked(storeRefreshTokenFamily).mockResolvedValue(undefined);

      await refresh(ctx);

      expect(verifyRefreshToken).toHaveBeenCalledWith('rt-from-body');
    });

    it('should throw TOKEN_REUSE on reuse detection and invalidate all sessions', async () => {
      const ctx = createMockContext({ body: { refreshToken: 'old-rt' } });
      vi.mocked(verifyRefreshToken).mockReturnValue({
        userId: 'user-123',
        tokenFamily: 'fam-123',
        type: 'refresh',
      });
      vi.mocked(detectTokenReuse).mockResolvedValue(true);
      vi.mocked(invalidateAllUserSessions).mockResolvedValue(undefined);

      await expect(refresh(ctx)).rejects.toMatchObject({
        code: 'TOKEN_REUSE',
        statusCode: 401,
      });
      expect(invalidateAllUserSessions).toHaveBeenCalledWith('user-123');
    });

    it('should throw INVALID_REFRESH_TOKEN on missing family', async () => {
      const ctx = createMockContext({ body: { refreshToken: 'rt-123' } });
      vi.mocked(verifyRefreshToken).mockReturnValue({
        userId: 'user-123',
        tokenFamily: 'fam-123',
        type: 'refresh',
      });
      vi.mocked(detectTokenReuse).mockResolvedValue(false);
      vi.mocked(getRefreshTokenFamily).mockResolvedValue(null);

      await expect(refresh(ctx)).rejects.toMatchObject({
        code: 'INVALID_REFRESH_TOKEN',
        statusCode: 401,
      });
    });

    it('should throw USER_INVALID on inactive user', async () => {
      const ctx = createMockContext({ body: { refreshToken: 'rt-123' } });
      vi.mocked(verifyRefreshToken).mockReturnValue({
        userId: 'user-123',
        tokenFamily: 'fam-123',
        type: 'refresh',
      });
      vi.mocked(detectTokenReuse).mockResolvedValue(false);
      vi.mocked(getRefreshTokenFamily).mockResolvedValue({
        userId: 'user-123',
        refreshToken: 'rt-123',
        createdAt: Date.now(),
      });
      vi.mocked(User.findByPk).mockResolvedValue(
        createMockUser({ status: UserStatus.SUSPENDED }) as never
      );

      await expect(refresh(ctx)).rejects.toMatchObject({
        code: 'USER_INVALID',
        statusCode: 401,
      });
    });

    it('should rotate tokens and set cookies on success', async () => {
      const mockUser = createMockUser();
      const ctx = createMockContext({ body: { refreshToken: 'rt-123' } });
      vi.mocked(verifyRefreshToken).mockReturnValue({
        userId: 'user-123',
        tokenFamily: 'fam-123',
        type: 'refresh',
      });
      vi.mocked(detectTokenReuse).mockResolvedValue(false);
      vi.mocked(getRefreshTokenFamily).mockResolvedValue({
        userId: 'user-123',
        refreshToken: 'rt-123',
        createdAt: Date.now(),
      });
      vi.mocked(User.findByPk).mockResolvedValue(mockUser as never);
      vi.mocked(generateAccessToken).mockReturnValue('new-at');
      vi.mocked(generateRefreshToken).mockReturnValue('new-rt');
      vi.mocked(storeRefreshTokenFamily).mockResolvedValue(undefined);

      await refresh(ctx);

      expect(generateAccessToken).toHaveBeenCalled();
      expect(generateRefreshToken).toHaveBeenCalledWith('user-123', 'fam-123');
      expect(storeRefreshTokenFamily).toHaveBeenCalledWith('user-123', 'fam-123', 'new-rt');
      expect(ctx.cookies.set).toHaveBeenCalledWith('access_token', 'new-at', expect.any(Object));
      expect(ctx.cookies.set).toHaveBeenCalledWith(
        'refresh_token',
        'new-rt',
        expect.any(Object)
      );
      const body = ctx.body as { success: boolean; data: { accessToken: string } };
      expect(body.data.accessToken).toBe('new-at');
    });

    it('should throw REFRESH_TOKEN_EXPIRED on expired token', async () => {
      const ctx = createMockContext({ body: { refreshToken: 'expired-rt' } });
      const expiredError = new Error('jwt expired');
      expiredError.name = 'TokenExpiredError';
      vi.mocked(verifyRefreshToken).mockImplementation(() => {
        throw expiredError;
      });

      await expect(refresh(ctx)).rejects.toMatchObject({
        code: 'REFRESH_TOKEN_EXPIRED',
        statusCode: 401,
      });
    });
  });

  // ===========================================================================
  // logout
  // ===========================================================================

  describe('logout', () => {
    it('should clear cookies and return success', async () => {
      const ctx = createMockContext({ state: { user: { userId: 'user-123' } } });

      await logout(ctx);

      expect(ctx.cookies.set).toHaveBeenCalledWith('access_token', '', expect.any(Object));
      expect(ctx.cookies.set).toHaveBeenCalledWith('refresh_token', '', expect.any(Object));
      const body = ctx.body as { success: boolean; data: { message: string } };
      expect(body.success).toBe(true);
      expect(body.data.message).toContain('Logged out');
    });

    it('should invalidate refresh token family if cookie present', async () => {
      const ctx = createMockContext({
        cookies: { refresh_token: 'rt-to-invalidate' },
        state: { user: { userId: 'user-123' } },
      });
      vi.mocked(verifyRefreshToken).mockReturnValue({
        userId: 'user-123',
        tokenFamily: 'fam-123',
        type: 'refresh',
      });
      vi.mocked(invalidateRefreshTokenFamily).mockResolvedValue(undefined);

      await logout(ctx);

      expect(invalidateRefreshTokenFamily).toHaveBeenCalledWith('fam-123');
    });

    it('should handle invalid refresh token gracefully', async () => {
      const ctx = createMockContext({
        cookies: { refresh_token: 'invalid-token' },
        state: { user: { userId: 'user-123' } },
      });
      vi.mocked(verifyRefreshToken).mockImplementation(() => {
        throw new Error('invalid token');
      });

      await logout(ctx);

      // Should not throw, just clear cookies
      const body = ctx.body as { success: boolean; data: { message: string } };
      expect(body.success).toBe(true);
    });
  });

  // ===========================================================================
  // logoutAll
  // ===========================================================================

  describe('logoutAll', () => {
    it('should throw AUTH_REQUIRED if no user', async () => {
      const ctx = createMockContext({ state: {} });
      await expect(logoutAll(ctx)).rejects.toMatchObject({
        code: 'AUTH_REQUIRED',
        statusCode: 401,
      });
    });

    it('should invalidate all sessions and clear cookies', async () => {
      const ctx = createMockContext({ state: { user: { userId: 'user-123' } } });
      vi.mocked(invalidateAllUserSessions).mockResolvedValue(undefined);

      await logoutAll(ctx);

      expect(invalidateAllUserSessions).toHaveBeenCalledWith('user-123');
      expect(ctx.cookies.set).toHaveBeenCalledWith('access_token', '', expect.any(Object));
      expect(ctx.cookies.set).toHaveBeenCalledWith('refresh_token', '', expect.any(Object));
    });

    it('should return success message', async () => {
      const ctx = createMockContext({ state: { user: { userId: 'user-123' } } });
      vi.mocked(invalidateAllUserSessions).mockResolvedValue(undefined);

      await logoutAll(ctx);

      const body = ctx.body as { success: boolean; data: { message: string } };
      expect(body.success).toBe(true);
      expect(body.data.message).toContain('all devices');
    });
  });

  // ===========================================================================
  // me
  // ===========================================================================

  describe('me', () => {
    it('should throw AUTH_REQUIRED if no userId', async () => {
      const ctx = createMockContext({ state: {} });
      await expect(me(ctx)).rejects.toMatchObject({
        code: 'AUTH_REQUIRED',
        statusCode: 401,
      });
    });

    it('should throw USER_NOT_FOUND if user does not exist', async () => {
      const ctx = createMockContext({ state: { user: { userId: 'missing-user' } } });
      vi.mocked(User.findByPk).mockResolvedValue(null as never);

      await expect(me(ctx)).rejects.toMatchObject({
        code: 'USER_NOT_FOUND',
        statusCode: 404,
      });
    });

    it('should return user data without tenant', async () => {
      const mockUser = createMockUser({ tenantId: null });
      const ctx = createMockContext({ state: { user: { userId: 'user-123' } } });
      vi.mocked(User.findByPk).mockResolvedValue(mockUser as never);

      await me(ctx);

      const body = ctx.body as {
        success: boolean;
        data: { user: Record<string, unknown>; tenant: unknown };
      };
      expect(body.success).toBe(true);
      expect(body.data.user.id).toBe('user-123');
      expect(body.data.user.email).toBe('test@example.com');
      expect(body.data.tenant).toBeNull();
      // Should not have called Tenant.findByPk since tenantId is null
      expect(Tenant.findByPk).not.toHaveBeenCalled();
    });

    it('should return user data with tenant', async () => {
      const mockUser = createMockUser({ tenantId: 'tenant-123' });
      const mockTenant = createMockTenant();
      const ctx = createMockContext({ state: { user: { userId: 'user-123' } } });
      vi.mocked(User.findByPk).mockResolvedValue(mockUser as never);
      vi.mocked(Tenant.findByPk).mockResolvedValue(mockTenant as never);

      await me(ctx);

      const body = ctx.body as {
        success: boolean;
        data: { user: Record<string, unknown>; tenant: Record<string, unknown> };
      };
      expect(body.success).toBe(true);
      expect(body.data.tenant).toMatchObject({
        id: 'tenant-123',
        name: 'Test Org',
        slug: 'test-org',
      });
    });
  });

  // ===========================================================================
  // updateLocale
  // ===========================================================================

  describe('updateLocale', () => {
    it('should throw AUTH_REQUIRED if no userId', async () => {
      const ctx = createMockContext({ state: {}, body: { locale: 'fr' } });
      await expect(updateLocale(ctx)).rejects.toMatchObject({
        code: 'AUTH_REQUIRED',
        statusCode: 401,
      });
    });

    it('should throw VALIDATION_ERROR if no locale', async () => {
      const ctx = createMockContext({
        state: { user: { userId: 'user-123' } },
        body: {},
      });
      await expect(updateLocale(ctx)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      });
    });

    it('should throw INVALID_LOCALE on unsupported locale', async () => {
      const ctx = createMockContext({
        state: { user: { userId: 'user-123' } },
        body: { locale: 'zh' },
      });
      await expect(updateLocale(ctx)).rejects.toMatchObject({
        code: 'INVALID_LOCALE',
        statusCode: 400,
      });
    });

    it('should throw USER_NOT_FOUND', async () => {
      const ctx = createMockContext({
        state: { user: { userId: 'user-123' } },
        body: { locale: 'fr' },
      });
      vi.mocked(User.findByPk).mockResolvedValue(null as never);

      await expect(updateLocale(ctx)).rejects.toMatchObject({
        code: 'USER_NOT_FOUND',
        statusCode: 404,
      });
    });

    it('should update locale and return it on success', async () => {
      const mockUser = createMockUser({ locale: SupportedLocale.FR });
      const ctx = createMockContext({
        state: { user: { userId: 'user-123' } },
        body: { locale: 'fr' },
      });
      vi.mocked(User.findByPk).mockResolvedValue(mockUser as never);

      await updateLocale(ctx);

      expect(mockUser.update).toHaveBeenCalledWith({ locale: 'fr' });
      const body = ctx.body as { success: boolean; data: { locale: string } };
      expect(body.success).toBe(true);
      expect(body.data.locale).toBe(SupportedLocale.FR);
    });
  });

  // ===========================================================================
  // changePassword
  // ===========================================================================

  describe('changePassword', () => {
    it('should throw AUTH_REQUIRED if no userId', async () => {
      const ctx = createMockContext({
        state: {},
        body: { currentPassword: 'old', newPassword: 'new' },
      });
      await expect(changePassword(ctx)).rejects.toMatchObject({
        code: 'AUTH_REQUIRED',
        statusCode: 401,
      });
    });

    it('should throw VALIDATION_ERROR on missing fields', async () => {
      const ctx = createMockContext({
        state: { user: { userId: 'user-123' } },
        body: { currentPassword: 'old' },
      });
      await expect(changePassword(ctx)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      });
    });

    it('should throw WEAK_PASSWORD on weak new password', async () => {
      const ctx = createMockContext({
        state: { user: { userId: 'user-123' } },
        body: { currentPassword: 'old', newPassword: 'weak' },
      });
      vi.mocked(validatePasswordStrength).mockReturnValue({
        valid: false,
        errors: ['too short'],
      });

      await expect(changePassword(ctx)).rejects.toMatchObject({
        code: 'WEAK_PASSWORD',
        statusCode: 400,
      });
    });

    it('should throw USER_NOT_FOUND', async () => {
      const ctx = createMockContext({
        state: { user: { userId: 'user-123' } },
        body: { currentPassword: 'old', newPassword: 'NewStrong1!' },
      });
      vi.mocked(validatePasswordStrength).mockReturnValue({ valid: true, errors: [] });
      vi.mocked(User.findByPk).mockResolvedValue(null as never);

      await expect(changePassword(ctx)).rejects.toMatchObject({
        code: 'USER_NOT_FOUND',
        statusCode: 404,
      });
    });

    it('should throw INVALID_PASSWORD on wrong current password', async () => {
      const mockUser = createMockUser();
      const ctx = createMockContext({
        state: { user: { userId: 'user-123' } },
        body: { currentPassword: 'wrong', newPassword: 'NewStrong1!' },
      });
      vi.mocked(validatePasswordStrength).mockReturnValue({ valid: true, errors: [] });
      vi.mocked(User.findByPk).mockResolvedValue(mockUser as never);
      vi.mocked(verifyPassword).mockResolvedValue(false);

      await expect(changePassword(ctx)).rejects.toMatchObject({
        code: 'INVALID_PASSWORD',
        statusCode: 401,
      });
    });

    it('should hash new password, invalidate sessions, and generate new tokens on success', async () => {
      const mockUser = createMockUser();
      const ctx = createMockContext({
        state: { user: { userId: 'user-123' } },
        body: { currentPassword: 'OldPass1!', newPassword: 'NewStrong1!' },
      });
      vi.mocked(validatePasswordStrength).mockReturnValue({ valid: true, errors: [] });
      vi.mocked(User.findByPk).mockResolvedValue(mockUser as never);
      vi.mocked(verifyPassword).mockResolvedValue(true);
      vi.mocked(hashPassword).mockResolvedValue('new-hash');
      vi.mocked(invalidateAllUserSessions).mockResolvedValue(undefined);
      vi.mocked(generateTokenPair).mockReturnValue({
        accessToken: 'new-at',
        refreshToken: 'new-rt',
        tokenFamily: 'new-fam',
      });
      vi.mocked(storeRefreshTokenFamily).mockResolvedValue(undefined);

      await changePassword(ctx);

      expect(mockUser.update).toHaveBeenCalledWith({ passwordHash: 'new-hash' });
      expect(invalidateAllUserSessions).toHaveBeenCalledWith('user-123');
      expect(storeRefreshTokenFamily).toHaveBeenCalledWith('user-123', 'new-fam', 'new-rt');
    });

    it('should set cookies and return accessToken', async () => {
      const mockUser = createMockUser();
      const ctx = createMockContext({
        state: { user: { userId: 'user-123' } },
        body: { currentPassword: 'OldPass1!', newPassword: 'NewStrong1!' },
      });
      vi.mocked(validatePasswordStrength).mockReturnValue({ valid: true, errors: [] });
      vi.mocked(User.findByPk).mockResolvedValue(mockUser as never);
      vi.mocked(verifyPassword).mockResolvedValue(true);
      vi.mocked(hashPassword).mockResolvedValue('new-hash');
      vi.mocked(invalidateAllUserSessions).mockResolvedValue(undefined);
      vi.mocked(generateTokenPair).mockReturnValue({
        accessToken: 'new-at',
        refreshToken: 'new-rt',
        tokenFamily: 'new-fam',
      });
      vi.mocked(storeRefreshTokenFamily).mockResolvedValue(undefined);

      await changePassword(ctx);

      expect(ctx.cookies.set).toHaveBeenCalledWith('access_token', 'new-at', expect.any(Object));
      const body = ctx.body as { success: boolean; data: { accessToken: string } };
      expect(body.data.accessToken).toBe('new-at');
    });
  });

  // ===========================================================================
  // forgotPassword
  // ===========================================================================

  describe('forgotPassword', () => {
    it('should throw VALIDATION_ERROR if no email', async () => {
      const ctx = createMockContext({ body: {} });
      await expect(forgotPassword(ctx)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      });
    });

    it('should return success even if user not found (no enumeration)', async () => {
      const ctx = createMockContext({ body: { email: 'nonexist@test.com' } });
      vi.mocked(User.findOne).mockResolvedValue(null as never);

      await forgotPassword(ctx);

      const body = ctx.body as { success: boolean };
      expect(body.success).toBe(true);
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should return success if user not ACTIVE', async () => {
      const ctx = createMockContext({ body: { email: 'test@test.com' } });
      vi.mocked(User.findOne).mockResolvedValue(
        createMockUser({ status: UserStatus.PENDING }) as never
      );

      await forgotPassword(ctx);

      const body = ctx.body as { success: boolean };
      expect(body.success).toBe(true);
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should generate token, store in redis, and send email on success', async () => {
      const mockUser = createMockUser();
      const ctx = createMockContext({ body: { email: 'test@example.com' } });
      vi.mocked(User.findOne).mockResolvedValue(mockUser as never);
      vi.mocked(generatePasswordResetToken).mockReturnValue('reset-token-abc');
      vi.mocked(storePasswordResetToken).mockResolvedValue(undefined);

      await forgotPassword(ctx);

      expect(storePasswordResetToken).toHaveBeenCalledWith(
        'user-123',
        'test@example.com',
        'reset-token-abc'
      );
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          firstName: 'John',
          resetUrl: expect.stringContaining('reset-token-abc'),
        })
      );
    });
  });

  // ===========================================================================
  // resetPassword
  // ===========================================================================

  describe('resetPassword', () => {
    it('should throw VALIDATION_ERROR on missing fields', async () => {
      const ctx = createMockContext({ body: { token: 'abc' } });
      await expect(resetPassword(ctx)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      });
    });

    it('should throw WEAK_PASSWORD on weak password', async () => {
      const ctx = createMockContext({ body: { token: 'abc', newPassword: 'weak' } });
      vi.mocked(validatePasswordStrength).mockReturnValue({
        valid: false,
        errors: ['too short'],
      });

      await expect(resetPassword(ctx)).rejects.toMatchObject({
        code: 'WEAK_PASSWORD',
        statusCode: 400,
      });
    });

    it('should throw INVALID_RESET_TOKEN on bad/expired token', async () => {
      const ctx = createMockContext({ body: { token: 'bad', newPassword: 'Strong1!' } });
      vi.mocked(validatePasswordStrength).mockReturnValue({ valid: true, errors: [] });
      vi.mocked(getPasswordResetToken).mockResolvedValue(null);

      await expect(resetPassword(ctx)).rejects.toMatchObject({
        code: 'INVALID_RESET_TOKEN',
        statusCode: 400,
      });
    });

    it('should throw USER_NOT_FOUND', async () => {
      const ctx = createMockContext({ body: { token: 'valid', newPassword: 'Strong1!' } });
      vi.mocked(validatePasswordStrength).mockReturnValue({ valid: true, errors: [] });
      vi.mocked(getPasswordResetToken).mockResolvedValue({
        userId: 'missing-user',
        email: 'test@test.com',
        createdAt: Date.now(),
      });
      vi.mocked(User.findByPk).mockResolvedValue(null as never);

      await expect(resetPassword(ctx)).rejects.toMatchObject({
        code: 'USER_NOT_FOUND',
        statusCode: 404,
      });
    });

    it('should throw ACCOUNT_INACTIVE on non-active user', async () => {
      const ctx = createMockContext({ body: { token: 'valid', newPassword: 'Strong1!' } });
      vi.mocked(validatePasswordStrength).mockReturnValue({ valid: true, errors: [] });
      vi.mocked(getPasswordResetToken).mockResolvedValue({
        userId: 'user-123',
        email: 'test@test.com',
        createdAt: Date.now(),
      });
      vi.mocked(User.findByPk).mockResolvedValue(
        createMockUser({ status: UserStatus.SUSPENDED }) as never
      );

      await expect(resetPassword(ctx)).rejects.toMatchObject({
        code: 'ACCOUNT_INACTIVE',
        statusCode: 403,
      });
    });

    it('should hash password, delete token, and invalidate sessions on success', async () => {
      const mockUser = createMockUser();
      const ctx = createMockContext({ body: { token: 'valid-token', newPassword: 'Strong1!' } });
      vi.mocked(validatePasswordStrength).mockReturnValue({ valid: true, errors: [] });
      vi.mocked(getPasswordResetToken).mockResolvedValue({
        userId: 'user-123',
        email: 'test@example.com',
        createdAt: Date.now(),
      });
      vi.mocked(User.findByPk).mockResolvedValue(mockUser as never);
      vi.mocked(hashPassword).mockResolvedValue('new-hash');
      vi.mocked(deletePasswordResetToken).mockResolvedValue(undefined);
      vi.mocked(invalidateAllUserSessions).mockResolvedValue(undefined);

      await resetPassword(ctx);

      expect(mockUser.update).toHaveBeenCalledWith({ passwordHash: 'new-hash' });
      expect(deletePasswordResetToken).toHaveBeenCalledWith('valid-token');
      expect(invalidateAllUserSessions).toHaveBeenCalledWith('user-123');
      const body = ctx.body as { success: boolean };
      expect(body.success).toBe(true);
    });
  });

  // ===========================================================================
  // verifyEmail
  // ===========================================================================

  describe('verifyEmail', () => {
    it('should throw VALIDATION_ERROR if no token', async () => {
      const ctx = createMockContext({ body: {} });
      await expect(verifyEmail(ctx)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      });
    });

    it('should throw INVALID_VERIFICATION_TOKEN on bad token', async () => {
      const ctx = createMockContext({ body: { token: 'bad' } });
      vi.mocked(getEmailVerificationToken).mockResolvedValue(null);

      await expect(verifyEmail(ctx)).rejects.toMatchObject({
        code: 'INVALID_VERIFICATION_TOKEN',
        statusCode: 400,
      });
    });

    it('should throw USER_NOT_FOUND', async () => {
      const ctx = createMockContext({ body: { token: 'valid' } });
      vi.mocked(getEmailVerificationToken).mockResolvedValue({
        userId: 'missing-user',
        email: 'test@test.com',
        createdAt: Date.now(),
      });
      vi.mocked(User.findByPk).mockResolvedValue(null as never);

      await expect(verifyEmail(ctx)).rejects.toMatchObject({
        code: 'USER_NOT_FOUND',
        statusCode: 404,
      });
    });

    it('should return success if already ACTIVE (idempotent)', async () => {
      const mockUser = createMockUser({ status: UserStatus.ACTIVE });
      const ctx = createMockContext({ body: { token: 'valid' } });
      vi.mocked(getEmailVerificationToken).mockResolvedValue({
        userId: 'user-123',
        email: 'test@test.com',
        createdAt: Date.now(),
      });
      vi.mocked(User.findByPk).mockResolvedValue(mockUser as never);
      vi.mocked(deleteEmailVerificationToken).mockResolvedValue(undefined);

      await verifyEmail(ctx);

      expect(deleteEmailVerificationToken).toHaveBeenCalledWith('valid');
      const body = ctx.body as { success: boolean; data: { message: string } };
      expect(body.success).toBe(true);
      expect(body.data.message).toContain('already verified');
    });

    it('should throw ACCOUNT_INACTIVE on non-PENDING/non-ACTIVE user', async () => {
      const mockUser = createMockUser({ status: UserStatus.SUSPENDED });
      const ctx = createMockContext({ body: { token: 'valid' } });
      vi.mocked(getEmailVerificationToken).mockResolvedValue({
        userId: 'user-123',
        email: 'test@test.com',
        createdAt: Date.now(),
      });
      vi.mocked(User.findByPk).mockResolvedValue(mockUser as never);

      await expect(verifyEmail(ctx)).rejects.toMatchObject({
        code: 'ACCOUNT_INACTIVE',
        statusCode: 403,
      });
    });

    it('should activate user, delete token, and auto-login with tokens on success', async () => {
      const mockUser = createMockUser({ status: UserStatus.PENDING });
      const ctx = createMockContext({ body: { token: 'valid-token' } });
      vi.mocked(getEmailVerificationToken).mockResolvedValue({
        userId: 'user-123',
        email: 'test@test.com',
        createdAt: Date.now(),
      });
      vi.mocked(User.findByPk).mockResolvedValue(mockUser as never);
      vi.mocked(deleteEmailVerificationToken).mockResolvedValue(undefined);
      vi.mocked(generateTokenPair).mockReturnValue({
        accessToken: 'at-new',
        refreshToken: 'rt-new',
        tokenFamily: 'fam-new',
      });
      vi.mocked(storeRefreshTokenFamily).mockResolvedValue(undefined);

      await verifyEmail(ctx);

      expect(mockUser.update).toHaveBeenCalledWith({ status: UserStatus.ACTIVE });
      expect(deleteEmailVerificationToken).toHaveBeenCalledWith('valid-token');
      expect(storeRefreshTokenFamily).toHaveBeenCalledWith('user-123', 'fam-new', 'rt-new');
      expect(ctx.cookies.set).toHaveBeenCalledWith('access_token', 'at-new', expect.any(Object));
      const body = ctx.body as {
        success: boolean;
        data: { accessToken: string; user: Record<string, unknown> };
      };
      expect(body.data.accessToken).toBe('at-new');
      expect(body.data.user.id).toBe('user-123');
    });
  });

  // ===========================================================================
  // resendVerification
  // ===========================================================================

  describe('resendVerification', () => {
    it('should throw VALIDATION_ERROR if no email', async () => {
      const ctx = createMockContext({ body: {} });
      await expect(resendVerification(ctx)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      });
    });

    it('should return success if user not found (no enumeration)', async () => {
      const ctx = createMockContext({ body: { email: 'nonexist@test.com' } });
      vi.mocked(User.findOne).mockResolvedValue(null as never);

      await resendVerification(ctx);

      const body = ctx.body as { success: boolean };
      expect(body.success).toBe(true);
      expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('should return success if user not PENDING', async () => {
      const ctx = createMockContext({ body: { email: 'test@test.com' } });
      vi.mocked(User.findOne).mockResolvedValue(
        createMockUser({ status: UserStatus.ACTIVE }) as never
      );

      await resendVerification(ctx);

      const body = ctx.body as { success: boolean };
      expect(body.success).toBe(true);
      expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('should generate token and send email on success', async () => {
      const mockUser = createMockUser({ status: UserStatus.PENDING });
      const ctx = createMockContext({ body: { email: 'test@example.com' } });
      vi.mocked(User.findOne).mockResolvedValue(mockUser as never);
      vi.mocked(generateEmailVerificationToken).mockReturnValue('new-verify-token');
      vi.mocked(storeEmailVerificationToken).mockResolvedValue(undefined);

      await resendVerification(ctx);

      expect(storeEmailVerificationToken).toHaveBeenCalledWith(
        'user-123',
        'test@example.com',
        'new-verify-token'
      );
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          firstName: 'John',
          verificationUrl: expect.stringContaining('new-verify-token'),
        })
      );
      const body = ctx.body as { success: boolean };
      expect(body.success).toBe(true);
    });
  });
});
