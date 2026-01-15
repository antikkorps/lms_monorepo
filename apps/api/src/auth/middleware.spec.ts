import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context } from 'koa';
import { UserRole } from '../database/models/enums.js';
import { createMockContext, createMockNext } from '../test/mocks/koa.mock.js';

// =============================================================================
// Module Mocks
// =============================================================================

vi.mock('../config/index.js', () => ({
  config: {
    jwtSecret: 'test-secret',
    jwtRefreshSecret: 'test-refresh-secret',
    jwtAccessExpiresIn: '15m',
    jwtRefreshExpiresIn: '7d',
  },
}));

vi.mock('./session.js', () => ({
  isTokenBlacklisted: vi.fn().mockResolvedValue(false),
}));

vi.mock('../database/models/User.js', () => ({
  User: {
    findByPk: vi.fn(),
  },
}));

vi.mock('../database/models/Tenant.js', () => ({
  Tenant: {
    findByPk: vi.fn(),
  },
}));

vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import after mocks
import {
  authenticate,
  optionalAuthenticate,
  requireRole,
  requireTenant,
  requireSuperAdmin,
  loadFullUser,
} from './middleware.js';
import { generateAccessToken } from './jwt.js';
import { isTokenBlacklisted } from './session.js';
import { User } from '../database/models/User.js';
import { Tenant } from '../database/models/Tenant.js';

// =============================================================================
// Test Suite
// =============================================================================

describe('Auth Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // authenticate
  // ===========================================================================

  describe('authenticate', () => {
    it('should authenticate with valid Bearer token', async () => {
      const token = generateAccessToken({
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.LEARNER,
        tenantId: null,
      });

      const ctx = createMockContext({
        headers: { authorization: `Bearer ${token}` },
      });
      const next = createMockNext();

      await authenticate(ctx as unknown as Context, next);

      expect(ctx.state.user).toBeDefined();
      expect(ctx.state.user?.userId).toBe('user-123');
      expect(next).toHaveBeenCalled();
    });

    it('should authenticate with valid cookie token', async () => {
      const token = generateAccessToken({
        userId: 'user-456',
        email: 'cookie@example.com',
        role: UserRole.INSTRUCTOR,
        tenantId: 'tenant-123',
      });

      const mockTenant = { id: 'tenant-123', name: 'Test Tenant' };
      vi.mocked(Tenant.findByPk).mockResolvedValue(mockTenant as never);

      const ctx = createMockContext();
      ctx.cookies.get = vi.fn().mockReturnValue(token);
      const next = createMockNext();

      await authenticate(ctx as unknown as Context, next);

      expect(ctx.state.user?.userId).toBe('user-456');
      expect(ctx.state.tenant).toEqual(mockTenant);
      expect(next).toHaveBeenCalled();
    });

    it('should throw error when no token provided', async () => {
      const ctx = createMockContext();
      const next = createMockNext();

      await expect(authenticate(ctx as unknown as Context, next)).rejects.toThrow(
        'Authentication required'
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should throw error for invalid token', async () => {
      const ctx = createMockContext({
        headers: { authorization: 'Bearer invalid-token' },
      });
      const next = createMockNext();

      await expect(authenticate(ctx as unknown as Context, next)).rejects.toThrow();
      expect(next).not.toHaveBeenCalled();
    });

    it('should throw error for blacklisted token', async () => {
      const token = generateAccessToken({
        userId: 'user-789',
        email: 'blacklisted@example.com',
        role: UserRole.LEARNER,
        tenantId: null,
      });

      vi.mocked(isTokenBlacklisted).mockResolvedValue(true);

      const ctx = createMockContext({
        headers: { authorization: `Bearer ${token}` },
      });
      const next = createMockNext();

      await expect(authenticate(ctx as unknown as Context, next)).rejects.toThrow(
        'Token has been revoked'
      );
    });
  });

  // ===========================================================================
  // optionalAuthenticate
  // ===========================================================================

  describe('optionalAuthenticate', () => {
    it('should populate user state with valid token', async () => {
      // Reset mock to ensure it returns false (not blacklisted)
      vi.mocked(isTokenBlacklisted).mockResolvedValue(false);

      const token = generateAccessToken({
        userId: 'user-optional',
        email: 'optional@example.com',
        role: UserRole.LEARNER,
        tenantId: null,
      });

      const ctx = createMockContext({
        headers: { authorization: `Bearer ${token}` },
      });
      const next = createMockNext();

      await optionalAuthenticate(ctx as unknown as Context, next);

      expect(ctx.state.user).toBeDefined();
      expect(ctx.state.user?.userId).toBe('user-optional');
      expect(next).toHaveBeenCalled();
    });

    it('should continue without error when no token', async () => {
      const ctx = createMockContext();
      const next = createMockNext();

      await optionalAuthenticate(ctx as unknown as Context, next);

      expect(ctx.state.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('should continue without error for invalid token', async () => {
      const ctx = createMockContext({
        headers: { authorization: 'Bearer invalid-token' },
      });
      const next = createMockNext();

      await optionalAuthenticate(ctx as unknown as Context, next);

      expect(ctx.state.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('should not populate user for blacklisted token', async () => {
      const token = generateAccessToken({
        userId: 'user-blacklisted',
        email: 'blacklisted@example.com',
        role: UserRole.LEARNER,
        tenantId: null,
      });

      vi.mocked(isTokenBlacklisted).mockResolvedValue(true);

      const ctx = createMockContext({
        headers: { authorization: `Bearer ${token}` },
      });
      const next = createMockNext();

      await optionalAuthenticate(ctx as unknown as Context, next);

      expect(ctx.state.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // requireRole
  // ===========================================================================

  describe('requireRole', () => {
    it('should allow access for matching role', async () => {
      const ctx = createMockContext({
        state: {
          user: {
            userId: 'user-123',
            role: UserRole.INSTRUCTOR,
          },
        },
      });
      const next = createMockNext();

      const middleware = requireRole(UserRole.INSTRUCTOR, UserRole.MANAGER);
      await middleware(ctx as unknown as Context, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow SuperAdmin for any role requirement', async () => {
      const ctx = createMockContext({
        state: {
          user: {
            userId: 'admin-123',
            role: UserRole.SUPER_ADMIN,
          },
        },
      });
      const next = createMockNext();

      const middleware = requireRole(UserRole.LEARNER);
      await middleware(ctx as unknown as Context, next);

      expect(next).toHaveBeenCalled();
    });

    it('should throw error for non-matching role', async () => {
      const ctx = createMockContext({
        state: {
          user: {
            userId: 'user-123',
            role: UserRole.LEARNER,
          },
        },
      });
      const next = createMockNext();

      const middleware = requireRole(UserRole.INSTRUCTOR, UserRole.MANAGER);

      await expect(middleware(ctx as unknown as Context, next)).rejects.toThrow(
        'Insufficient permissions'
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should throw error when not authenticated', async () => {
      const ctx = createMockContext();
      const next = createMockNext();

      const middleware = requireRole(UserRole.LEARNER);

      await expect(middleware(ctx as unknown as Context, next)).rejects.toThrow(
        'Authentication required'
      );
    });
  });

  // ===========================================================================
  // requireTenant
  // ===========================================================================

  describe('requireTenant', () => {
    it('should allow access for user with tenant', async () => {
      const ctx = createMockContext({
        state: {
          user: {
            userId: 'user-123',
            tenantId: 'tenant-456',
          },
        },
      });
      const next = createMockNext();

      await requireTenant(ctx as unknown as Context, next);

      expect(next).toHaveBeenCalled();
    });

    it('should throw error for user without tenant', async () => {
      const ctx = createMockContext({
        state: {
          user: {
            userId: 'user-solo',
            tenantId: null,
          },
        },
      });
      const next = createMockNext();

      await expect(requireTenant(ctx as unknown as Context, next)).rejects.toThrow(
        'This resource requires tenant membership'
      );
    });

    it('should throw error when not authenticated', async () => {
      const ctx = createMockContext();
      const next = createMockNext();

      await expect(requireTenant(ctx as unknown as Context, next)).rejects.toThrow(
        'Authentication required'
      );
    });
  });

  // ===========================================================================
  // requireSuperAdmin
  // ===========================================================================

  describe('requireSuperAdmin', () => {
    it('should allow access for SuperAdmin', async () => {
      const ctx = createMockContext({
        state: {
          user: {
            userId: 'admin-123',
            role: UserRole.SUPER_ADMIN,
          },
        },
      });
      const next = createMockNext();

      await requireSuperAdmin(ctx as unknown as Context, next);

      expect(next).toHaveBeenCalled();
    });

    it('should throw error for non-SuperAdmin', async () => {
      const ctx = createMockContext({
        state: {
          user: {
            userId: 'user-123',
            role: UserRole.TENANT_ADMIN,
          },
        },
      });
      const next = createMockNext();

      await expect(requireSuperAdmin(ctx as unknown as Context, next)).rejects.toThrow(
        'SuperAdmin access required'
      );
    });

    it('should throw error when not authenticated', async () => {
      const ctx = createMockContext();
      const next = createMockNext();

      await expect(requireSuperAdmin(ctx as unknown as Context, next)).rejects.toThrow(
        'Authentication required'
      );
    });
  });

  // ===========================================================================
  // loadFullUser
  // ===========================================================================

  describe('loadFullUser', () => {
    it('should load full user model', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'full@example.com',
        status: 'active',
      };

      vi.mocked(User.findByPk).mockResolvedValue(mockUser as never);

      const ctx = createMockContext({
        state: {
          user: {
            userId: 'user-123',
          },
        },
      });
      const next = createMockNext();

      await loadFullUser(ctx as unknown as Context, next);

      expect(User.findByPk).toHaveBeenCalledWith('user-123');
      expect(ctx.state.user?.fullUser).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
    });

    it('should throw error if user not found', async () => {
      vi.mocked(User.findByPk).mockResolvedValue(null as never);

      const ctx = createMockContext({
        state: {
          user: {
            userId: 'nonexistent',
          },
        },
      });
      const next = createMockNext();

      await expect(loadFullUser(ctx as unknown as Context, next)).rejects.toThrow(
        'User not found'
      );
    });

    it('should throw error if user is not active', async () => {
      const inactiveUser = {
        id: 'user-inactive',
        status: 'suspended',
      };

      vi.mocked(User.findByPk).mockResolvedValue(inactiveUser as never);

      const ctx = createMockContext({
        state: {
          user: {
            userId: 'user-inactive',
          },
        },
      });
      const next = createMockNext();

      await expect(loadFullUser(ctx as unknown as Context, next)).rejects.toThrow(
        'User account is not active'
      );
    });

    it('should throw error when not authenticated', async () => {
      const ctx = createMockContext();
      const next = createMockNext();

      await expect(loadFullUser(ctx as unknown as Context, next)).rejects.toThrow(
        'Authentication required'
      );
    });
  });
});
