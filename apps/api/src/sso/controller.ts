/**
 * SSO Controllers
 * Handle OAuth2/OpenID Connect authentication endpoints
 */

import type { Context } from 'koa';
import { ssoService, SSOError } from '../services/sso/index.js';
import type { SSOProviderType } from '../services/sso/index.js';
import { AppError } from '../utils/app-error.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

// Cookie options for auth tokens
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.cookieSecure,
  sameSite: 'lax' as const,
  domain: config.cookieDomain,
};

/**
 * Initiate SSO authentication
 * GET /auth/sso/:provider/authorize
 *
 * Query params:
 * - tenant: Tenant slug (optional, for B2B SSO)
 * - redirect: Frontend URL to redirect after auth (optional)
 */
export async function authorize(ctx: Context): Promise<void> {
  const { provider } = ctx.params as { provider: string };
  const { tenant, redirect } = ctx.query as {
    tenant?: string;
    redirect?: string;
  };

  // Validate provider
  const validProviders: SSOProviderType[] = ['google', 'microsoft', 'oidc'];
  if (!validProviders.includes(provider as SSOProviderType)) {
    throw new AppError(
      `Invalid SSO provider: ${provider}`,
      400,
      'INVALID_PROVIDER'
    );
  }

  // Resolve tenant ID from slug if provided
  let tenantId: string | null = null;
  if (tenant) {
    const { Tenant } = await import('../database/models/Tenant.js');
    const tenantRecord = await Tenant.findOne({ where: { slug: tenant } });
    if (!tenantRecord) {
      throw new AppError('Invalid tenant', 400, 'INVALID_TENANT');
    }
    tenantId = tenantRecord.id;
  }

  // Default redirect to frontend URL
  const frontendRedirect = redirect || config.frontendUrl || 'http://localhost:5173';

  try {
    const authUrl = await ssoService.initiateAuth(
      provider as SSOProviderType,
      tenantId,
      frontendRedirect
    );

    // Redirect user to OAuth provider
    ctx.redirect(authUrl);
  } catch (error) {
    if (error instanceof SSOError) {
      throw new AppError(error.message, 400, error.code, error.details);
    }
    throw error;
  }
}

/**
 * Handle OAuth callback
 * GET /auth/sso/callback
 *
 * Query params (from OAuth provider):
 * - code: Authorization code
 * - state: CSRF protection state
 * - error: OAuth error (if failed)
 * - error_description: Error details
 */
export async function callback(ctx: Context): Promise<void> {
  const { code, state, error, error_description } = ctx.query as {
    code?: string;
    state?: string;
    error?: string;
    error_description?: string;
  };

  // Handle OAuth errors
  if (error) {
    logger.warn({ error, error_description }, 'SSO callback received error');

    // Redirect to frontend with error
    const errorUrl = new URL(config.frontendUrl || 'http://localhost:5173');
    errorUrl.pathname = '/auth/error';
    errorUrl.searchParams.set('error', error);
    if (error_description) {
      errorUrl.searchParams.set('message', error_description);
    }

    ctx.redirect(errorUrl.toString());
    return;
  }

  // Validate required params
  if (!code || !state) {
    throw new AppError(
      'Missing code or state parameter',
      400,
      'INVALID_CALLBACK'
    );
  }

  try {
    const result = await ssoService.handleCallback(code, state);

    // Set auth cookies
    ctx.cookies.set('access_token', result.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    ctx.cookies.set('refresh_token', result.refreshToken, {
      ...COOKIE_OPTIONS,
      path: '/api/v1/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Build redirect URL with success info
    const redirectUrl = new URL(result.redirectUri);

    // Add auth info to URL (for frontend to pick up)
    // Note: Access token is also in cookie, this is for SPA convenience
    redirectUrl.searchParams.set('auth', 'success');
    redirectUrl.searchParams.set('isNewUser', String(result.isNewUser));

    // Optionally include token in URL for SPAs that need it
    // (cookie is also set for traditional apps)
    if (ctx.query.include_token === 'true') {
      redirectUrl.searchParams.set('token', result.accessToken);
    }

    ctx.redirect(redirectUrl.toString());
  } catch (error) {
    if (error instanceof SSOError) {
      logger.error(
        { error: error.message, code: error.code, provider: error.provider },
        'SSO callback failed'
      );

      // Redirect to frontend with error
      const errorUrl = new URL(config.frontendUrl || 'http://localhost:5173');
      errorUrl.pathname = '/auth/error';
      errorUrl.searchParams.set('error', error.code);
      errorUrl.searchParams.set('message', error.message);

      ctx.redirect(errorUrl.toString());
      return;
    }

    throw error;
  }
}

/**
 * Link authenticated user to SSO provider
 * POST /auth/sso/link
 *
 * Body:
 * - provider: SSO provider type
 * - code: Authorization code
 * - state: CSRF state
 */
export async function linkAccount(ctx: Context): Promise<void> {
  const userId = ctx.state.user?.userId;

  if (!userId) {
    throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
  }

  const { provider, code, state } = ctx.request.body as {
    provider?: string;
    code?: string;
    state?: string;
  };

  if (!provider || !code || !state) {
    throw new AppError(
      'Missing provider, code, or state',
      400,
      'VALIDATION_ERROR'
    );
  }

  const validProviders: SSOProviderType[] = ['google', 'microsoft', 'oidc'];
  if (!validProviders.includes(provider as SSOProviderType)) {
    throw new AppError(
      `Invalid SSO provider: ${provider}`,
      400,
      'INVALID_PROVIDER'
    );
  }

  try {
    await ssoService.linkAccount(
      userId,
      provider as SSOProviderType,
      code,
      state
    );

    ctx.body = {
      success: true,
      data: {
        message: `Account linked to ${provider} successfully`,
      },
    };
  } catch (error) {
    if (error instanceof SSOError) {
      throw new AppError(error.message, 400, error.code, error.details);
    }
    throw error;
  }
}

/**
 * Unlink SSO from authenticated user
 * DELETE /auth/sso/unlink
 */
export async function unlinkAccount(ctx: Context): Promise<void> {
  const userId = ctx.state.user?.userId;

  if (!userId) {
    throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
  }

  try {
    await ssoService.unlinkAccount(userId);

    ctx.body = {
      success: true,
      data: {
        message: 'SSO unlinked from account successfully',
      },
    };
  } catch (error) {
    if (error instanceof SSOError) {
      throw new AppError(error.message, 400, error.code, error.details);
    }
    throw error;
  }
}

/**
 * Get available SSO providers for a tenant
 * GET /auth/sso/providers
 *
 * Query params:
 * - tenant: Tenant slug (optional)
 */
export async function getProviders(ctx: Context): Promise<void> {
  const { tenant } = ctx.query as { tenant?: string };

  const providers: Array<{
    type: SSOProviderType;
    name: string;
    enabled: boolean;
  }> = [];

  // Check global providers
  if (config.sso.google.clientId) {
    providers.push({ type: 'google', name: 'Google', enabled: true });
  }

  if (config.sso.microsoft.clientId) {
    providers.push({ type: 'microsoft', name: 'Microsoft', enabled: true });
  }

  // Check tenant-specific provider
  if (tenant) {
    const { Tenant } = await import('../database/models/Tenant.js');
    const tenantRecord = await Tenant.findOne({ where: { slug: tenant } });

    if (tenantRecord?.settings?.ssoEnabled && tenantRecord.settings.ssoConfig) {
      const ssoConfig = tenantRecord.settings.ssoConfig as {
        provider: SSOProviderType;
      };

      // Add or update tenant's custom provider
      const existingIndex = providers.findIndex(
        (p) => p.type === ssoConfig.provider
      );
      if (existingIndex === -1) {
        providers.push({
          type: ssoConfig.provider,
          name: ssoConfig.provider === 'oidc' ? 'Enterprise SSO' : ssoConfig.provider,
          enabled: true,
        });
      }
    }
  }

  ctx.body = {
    success: true,
    data: {
      providers,
    },
  };
}
