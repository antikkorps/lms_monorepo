import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context } from 'koa';

// =============================================================================
// Module Mocks - use vi.hoisted for variables used in vi.mock
// =============================================================================

const { mockSsoService, mockSSOError } = vi.hoisted(() => ({
  mockSsoService: {
    initiateAuth: vi.fn(),
    handleCallback: vi.fn(),
    linkAccount: vi.fn(),
    unlinkAccount: vi.fn(),
  },
  mockSSOError: class SSOError extends Error {
    code: string;
    provider?: string;
    details?: Record<string, unknown>;
    constructor(message: string, code: string, provider?: string, details?: Record<string, unknown>) {
      super(message);
      this.code = code;
      this.provider = provider;
      this.details = details;
      this.name = 'SSOError';
    }
  },
}));

vi.mock('../services/sso/index.js', () => ({
  ssoService: mockSsoService,
  SSOError: mockSSOError,
}));

vi.mock('../config/index.js', () => ({
  config: {
    cookieSecure: false,
    cookieDomain: 'localhost',
    frontendUrl: 'http://localhost:5173',
    sso: {
      google: { clientId: 'google-client-id' },
      microsoft: { clientId: 'microsoft-client-id' },
    },
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

vi.mock('../database/models/Tenant.js', () => ({
  Tenant: {
    findOne: vi.fn(),
  },
}));

// Import after mocks
import {
  authorize,
  callback,
  linkAccount,
  unlinkAccount,
  getProviders,
} from './controller.js';
import { Tenant } from '../database/models/Tenant.js';

// =============================================================================
// Test Helpers
// =============================================================================

interface MockContextOptions {
  params?: Record<string, string>;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  state?: Record<string, unknown>;
}

function createMockContext(options: MockContextOptions = {}): Context {
  const cookieStore: Record<string, string> = {};
  return {
    params: options.params || {},
    query: options.query || {},
    request: {
      body: options.body || {},
    },
    state: options.state || {},
    status: 200,
    body: null,
    redirect: vi.fn(),
    cookies: {
      get: vi.fn((name: string) => cookieStore[name]),
      set: vi.fn((name: string, value: string) => {
        cookieStore[name] = value;
      }),
    },
  } as unknown as Context;
}

// =============================================================================
// Test Suite
// =============================================================================

describe('SSO Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // authorize
  // ===========================================================================

  describe('authorize', () => {
    it('should redirect to Google OAuth URL', async () => {
      mockSsoService.initiateAuth.mockResolvedValue('https://accounts.google.com/oauth?...');

      const ctx = createMockContext({
        params: { provider: 'google' },
        query: {},
      });
      await authorize(ctx);

      expect(mockSsoService.initiateAuth).toHaveBeenCalledWith(
        'google',
        null,
        'http://localhost:5173'
      );
      expect(ctx.redirect).toHaveBeenCalledWith('https://accounts.google.com/oauth?...');
    });

    it('should redirect to Microsoft OAuth URL', async () => {
      mockSsoService.initiateAuth.mockResolvedValue('https://login.microsoftonline.com/...');

      const ctx = createMockContext({
        params: { provider: 'microsoft' },
        query: { redirect: 'http://myapp.com/callback' },
      });
      await authorize(ctx);

      expect(mockSsoService.initiateAuth).toHaveBeenCalledWith(
        'microsoft',
        null,
        'http://myapp.com/callback'
      );
    });

    it('should resolve tenant ID from slug', async () => {
      vi.mocked(Tenant.findOne).mockResolvedValue({
        id: 'tenant-123',
        slug: 'acme',
      } as never);
      mockSsoService.initiateAuth.mockResolvedValue('https://accounts.google.com/oauth?...');

      const ctx = createMockContext({
        params: { provider: 'google' },
        query: { tenant: 'acme' },
      });
      await authorize(ctx);

      expect(Tenant.findOne).toHaveBeenCalledWith({ where: { slug: 'acme' } });
      expect(mockSsoService.initiateAuth).toHaveBeenCalledWith(
        'google',
        'tenant-123',
        'http://localhost:5173'
      );
    });

    it('should throw error for invalid provider', async () => {
      const ctx = createMockContext({
        params: { provider: 'invalid' },
        query: {},
      });

      await expect(authorize(ctx)).rejects.toThrow('Invalid SSO provider');
    });

    it('should throw error for invalid tenant', async () => {
      vi.mocked(Tenant.findOne).mockResolvedValue(null as never);

      const ctx = createMockContext({
        params: { provider: 'google' },
        query: { tenant: 'nonexistent' },
      });

      await expect(authorize(ctx)).rejects.toThrow('Invalid tenant');
    });
  });

  // ===========================================================================
  // callback
  // ===========================================================================

  describe('callback', () => {
    it('should handle successful OAuth callback', async () => {
      mockSsoService.handleCallback.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        redirectUri: 'http://localhost:5173/dashboard',
        isNewUser: false,
      });

      const ctx = createMockContext({
        query: { code: 'auth-code', state: 'csrf-state' },
      });
      await callback(ctx);

      expect(mockSsoService.handleCallback).toHaveBeenCalledWith('auth-code', 'csrf-state');
      expect(ctx.cookies.set).toHaveBeenCalledWith(
        'access_token',
        'access-token',
        expect.any(Object)
      );
      expect(ctx.cookies.set).toHaveBeenCalledWith(
        'refresh_token',
        'refresh-token',
        expect.any(Object)
      );
      expect(ctx.redirect).toHaveBeenCalled();
    });

    it('should redirect with isNewUser=true for new users', async () => {
      mockSsoService.handleCallback.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        redirectUri: 'http://localhost:5173',
        isNewUser: true,
      });

      const ctx = createMockContext({
        query: { code: 'auth-code', state: 'csrf-state' },
      });
      await callback(ctx);

      const redirectCall = (ctx.redirect as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(redirectCall).toContain('isNewUser=true');
    });

    it('should redirect to error page on OAuth error', async () => {
      const ctx = createMockContext({
        query: {
          error: 'access_denied',
          error_description: 'User cancelled',
        },
      });
      await callback(ctx);

      const redirectCall = (ctx.redirect as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(redirectCall).toContain('/auth/error');
      expect(redirectCall).toContain('error=access_denied');
    });

    it('should throw error for missing code or state', async () => {
      const ctx = createMockContext({
        query: { code: 'auth-code' }, // Missing state
      });

      await expect(callback(ctx)).rejects.toThrow('Missing code or state');
    });

    it('should redirect to error page on SSO service error', async () => {
      mockSsoService.handleCallback.mockRejectedValue(
        new mockSSOError('Token exchange failed', 'TOKEN_EXCHANGE_FAILED', 'google')
      );

      const ctx = createMockContext({
        query: { code: 'auth-code', state: 'csrf-state' },
      });
      await callback(ctx);

      const redirectCall = (ctx.redirect as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(redirectCall).toContain('/auth/error');
      expect(redirectCall).toContain('TOKEN_EXCHANGE_FAILED');
    });
  });

  // ===========================================================================
  // linkAccount
  // ===========================================================================

  describe('linkAccount', () => {
    it('should link account to SSO provider', async () => {
      mockSsoService.linkAccount.mockResolvedValue(undefined);

      const ctx = createMockContext({
        body: { provider: 'google', code: 'auth-code', state: 'csrf-state' },
        state: { user: { userId: 'user-123' } },
      });
      await linkAccount(ctx);

      expect(mockSsoService.linkAccount).toHaveBeenCalledWith(
        'user-123',
        'google',
        'auth-code',
        'csrf-state'
      );
      expect(ctx.body).toEqual({
        success: true,
        data: { message: 'Account linked to google successfully' },
      });
    });

    it('should throw error for unauthenticated users', async () => {
      const ctx = createMockContext({
        body: { provider: 'google', code: 'auth-code', state: 'csrf-state' },
      });

      await expect(linkAccount(ctx)).rejects.toThrow('Authentication required');
    });

    it('should throw error for missing parameters', async () => {
      const ctx = createMockContext({
        body: { provider: 'google' }, // Missing code and state
        state: { user: { userId: 'user-123' } },
      });

      await expect(linkAccount(ctx)).rejects.toThrow('Missing provider, code, or state');
    });

    it('should throw error for invalid provider', async () => {
      const ctx = createMockContext({
        body: { provider: 'invalid', code: 'auth-code', state: 'csrf-state' },
        state: { user: { userId: 'user-123' } },
      });

      await expect(linkAccount(ctx)).rejects.toThrow('Invalid SSO provider');
    });
  });

  // ===========================================================================
  // unlinkAccount
  // ===========================================================================

  describe('unlinkAccount', () => {
    it('should unlink SSO from account', async () => {
      mockSsoService.unlinkAccount.mockResolvedValue(undefined);

      const ctx = createMockContext({
        state: { user: { userId: 'user-123' } },
      });
      await unlinkAccount(ctx);

      expect(mockSsoService.unlinkAccount).toHaveBeenCalledWith('user-123');
      expect(ctx.body).toEqual({
        success: true,
        data: { message: 'SSO unlinked from account successfully' },
      });
    });

    it('should throw error for unauthenticated users', async () => {
      const ctx = createMockContext({});

      await expect(unlinkAccount(ctx)).rejects.toThrow('Authentication required');
    });
  });

  // ===========================================================================
  // getProviders
  // ===========================================================================

  describe('getProviders', () => {
    it('should return global providers', async () => {
      const ctx = createMockContext({ query: {} });
      await getProviders(ctx);

      expect(ctx.body).toEqual({
        success: true,
        data: {
          providers: [
            { type: 'google', name: 'Google', enabled: true },
            { type: 'microsoft', name: 'Microsoft', enabled: true },
          ],
        },
      });
    });

    it('should include tenant-specific OIDC provider', async () => {
      vi.mocked(Tenant.findOne).mockResolvedValue({
        id: 'tenant-123',
        slug: 'acme',
        settings: {
          ssoEnabled: true,
          ssoConfig: {
            provider: 'oidc',
            clientId: 'tenant-client-id',
          },
        },
      } as never);

      const ctx = createMockContext({ query: { tenant: 'acme' } });
      await getProviders(ctx);

      expect(ctx.body).toEqual({
        success: true,
        data: {
          providers: [
            { type: 'google', name: 'Google', enabled: true },
            { type: 'microsoft', name: 'Microsoft', enabled: true },
            { type: 'oidc', name: 'Enterprise SSO', enabled: true },
          ],
        },
      });
    });

    it('should return global providers for non-existent tenant', async () => {
      vi.mocked(Tenant.findOne).mockResolvedValue(null as never);

      const ctx = createMockContext({ query: { tenant: 'nonexistent' } });
      await getProviders(ctx);

      expect(ctx.body).toEqual({
        success: true,
        data: {
          providers: [
            { type: 'google', name: 'Google', enabled: true },
            { type: 'microsoft', name: 'Microsoft', enabled: true },
          ],
        },
      });
    });
  });
});
