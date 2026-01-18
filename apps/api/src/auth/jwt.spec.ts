import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { UserRole } from '../database/models/enums.js';

// Mock config
vi.mock('../config/index.js', () => ({
  config: {
    jwtSecret: 'test-access-secret',
    jwtRefreshSecret: 'test-refresh-secret',
    jwtAccessExpiresIn: '15m',
    jwtRefreshExpiresIn: '7d',
  },
}));

import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  generateTokenFamily,
  generateTokenPair,
} from './jwt.js';

describe('JWT Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // generateAccessToken & verifyAccessToken
  // ===========================================================================

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.LEARNER,
        tenantId: 'tenant-123',
      };

      const token = generateAccessToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format
    });

    it('should include type: access in payload', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.LEARNER,
        tenantId: null,
      };

      const token = generateAccessToken(payload);
      const decoded = jwt.decode(token) as Record<string, unknown>;

      expect(decoded.type).toBe('access');
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify and return payload for valid token', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.TENANT_ADMIN,
        tenantId: 'tenant-456',
      };

      const token = generateAccessToken(payload);
      const result = verifyAccessToken(token);

      expect(result.userId).toBe(payload.userId);
      expect(result.email).toBe(payload.email);
      expect(result.role).toBe(payload.role);
      expect(result.tenantId).toBe(payload.tenantId);
      expect(result.type).toBe('access');
    });

    it('should throw error for invalid token', () => {
      expect(() => verifyAccessToken('invalid-token')).toThrow();
    });

    it('should throw error for token with wrong secret', () => {
      const token = jwt.sign({ userId: '123', type: 'access' }, 'wrong-secret');

      expect(() => verifyAccessToken(token)).toThrow();
    });

    it('should throw error for refresh token used as access token', () => {
      const refreshToken = generateRefreshToken('user-123', 'family-123');

      // Different secrets cause signature mismatch before type check
      expect(() => verifyAccessToken(refreshToken)).toThrow();
    });
  });

  // ===========================================================================
  // generateRefreshToken & verifyRefreshToken
  // ===========================================================================

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = generateRefreshToken('user-123', 'family-abc');

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include type: refresh in payload', () => {
      const token = generateRefreshToken('user-123', 'family-abc');
      const decoded = jwt.decode(token) as Record<string, unknown>;

      expect(decoded.type).toBe('refresh');
      expect(decoded.userId).toBe('user-123');
      expect(decoded.tokenFamily).toBe('family-abc');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify and return payload for valid token', () => {
      const token = generateRefreshToken('user-456', 'family-xyz');
      const result = verifyRefreshToken(token);

      expect(result.userId).toBe('user-456');
      expect(result.tokenFamily).toBe('family-xyz');
      expect(result.type).toBe('refresh');
    });

    it('should throw error for invalid token', () => {
      expect(() => verifyRefreshToken('invalid-token')).toThrow();
    });

    it('should throw error for access token used as refresh token', () => {
      const accessToken = generateAccessToken({
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.LEARNER,
        tenantId: null,
      });

      // Different secrets cause signature mismatch before type check
      expect(() => verifyRefreshToken(accessToken)).toThrow();
    });
  });

  // ===========================================================================
  // decodeToken
  // ===========================================================================

  describe('decodeToken', () => {
    it('should decode access token without verification', () => {
      const accessToken = generateAccessToken({
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.LEARNER,
        tenantId: null,
      });

      const decoded = decodeToken(accessToken);

      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe('user-123');
    });

    it('should decode refresh token without verification', () => {
      const refreshToken = generateRefreshToken('user-456', 'family-123');

      const decoded = decodeToken(refreshToken);

      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe('user-456');
    });

    it('should return null for invalid token', () => {
      const result = decodeToken('not-a-jwt');

      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // generateTokenFamily
  // ===========================================================================

  describe('generateTokenFamily', () => {
    it('should generate a UUID', () => {
      const family = generateTokenFamily();

      expect(family).toBeDefined();
      // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      expect(family).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('should generate unique values', () => {
      const family1 = generateTokenFamily();
      const family2 = generateTokenFamily();

      expect(family1).not.toBe(family2);
    });
  });

  // ===========================================================================
  // generateTokenPair
  // ===========================================================================

  describe('generateTokenPair', () => {
    it('should generate both access and refresh tokens', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        role: UserRole.INSTRUCTOR,
        tenantId: 'tenant-789',
      };

      const { accessToken, refreshToken, tokenFamily } = generateTokenPair(user);

      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();
      expect(tokenFamily).toBeDefined();

      // Verify access token contains user info
      const accessPayload = verifyAccessToken(accessToken);
      expect(accessPayload.userId).toBe(user.id);
      expect(accessPayload.email).toBe(user.email);
      expect(accessPayload.role).toBe(user.role);

      // Verify refresh token contains user id and family
      const refreshPayload = verifyRefreshToken(refreshToken);
      expect(refreshPayload.userId).toBe(user.id);
      expect(refreshPayload.tokenFamily).toBe(tokenFamily);
    });

    it('should handle null tenantId', () => {
      const user = {
        id: 'user-solo',
        email: 'solo@example.com',
        role: UserRole.LEARNER,
        tenantId: null,
      };

      const { accessToken } = generateTokenPair(user);
      const payload = verifyAccessToken(accessToken);

      expect(payload.tenantId).toBeNull();
    });
  });
});
