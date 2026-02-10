/**
 * Tenant SSO Configuration Controller
 * Allows tenant admins to configure their own SSO provider
 */

import type { Context } from 'koa';
import {
  updateTenantSSOSchema,
  tenantSSOConfigSchema,
} from '@shared/schemas';
import { Tenant, type TenantSSOConfig } from '../database/models/Tenant.js';
import { AppError } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

/**
 * Get current SSO configuration for the tenant
 * GET /tenant/sso
 *
 * Returns SSO config with secret masked
 */
export async function getTenantSSO(ctx: Context): Promise<void> {
  const tenantId = ctx.state.user?.tenantId;

  if (!tenantId) {
    throw new AppError('Tenant context required', 400, 'TENANT_REQUIRED');
  }

  const tenant = await Tenant.findByPk(tenantId);

  if (!tenant) {
    throw new AppError('Tenant not found', 404, 'TENANT_NOT_FOUND');
  }

  const settings = tenant.settings || {};
  const ssoConfig = settings.ssoConfig as TenantSSOConfig | undefined;

  ctx.body = {
    success: true,
    data: {
      enabled: settings.ssoEnabled || false,
      provider: ssoConfig?.provider,
      clientId: ssoConfig?.clientId,
      issuer: ssoConfig?.issuer,
      tenantId: ssoConfig?.tenantId,
      // Note: clientSecret is never returned for security
      loginUrl: settings.ssoEnabled
        ? `${config.frontendUrl}/login?tenant=${tenant.slug}`
        : null,
      // OAuth redirect URI for IdP configuration
      redirectUri: config.sso.callbackUrl,
    },
  };
}

/**
 * Update SSO configuration for the tenant
 * PUT /tenant/sso
 *
 * Body:
 * - enabled: boolean
 * - config: { provider, clientId, clientSecret, issuer?, tenantId? }
 */
export async function updateTenantSSO(ctx: Context): Promise<void> {
  const tenantId = ctx.state.user?.tenantId;

  if (!tenantId) {
    throw new AppError('Tenant context required', 400, 'TENANT_REQUIRED');
  }

  // Validate request body
  const parseResult = updateTenantSSOSchema.safeParse(ctx.request.body);

  if (!parseResult.success) {
    throw new AppError(
      'Validation error',
      400,
      'VALIDATION_ERROR',
      { errors: parseResult.error.flatten().fieldErrors }
    );
  }

  const { enabled, config } = parseResult.data;

  const tenant = await Tenant.findByPk(tenantId);

  if (!tenant) {
    throw new AppError('Tenant not found', 404, 'TENANT_NOT_FOUND');
  }

  // Update tenant settings
  const currentSettings = tenant.settings || {};

  if (enabled && config) {
    // Store SSO configuration
    const ssoConfig: TenantSSOConfig = {
      provider: config.provider,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      ...(config.issuer && { issuer: config.issuer }),
      ...(config.tenantId && { tenantId: config.tenantId }),
    };

    await tenant.update({
      settings: {
        ...currentSettings,
        ssoEnabled: true,
        ssoConfig,
      },
    });

    logger.info(
      { tenantId, provider: config.provider },
      'Tenant SSO configuration updated'
    );
  } else {
    // Disable SSO (keep config for potential re-enable)
    await tenant.update({
      settings: {
        ...currentSettings,
        ssoEnabled: false,
      },
    });

    logger.info({ tenantId }, 'Tenant SSO disabled');
  }

  ctx.body = {
    success: true,
    data: {
      enabled: enabled && !!config,
      provider: config?.provider,
      clientId: config?.clientId,
      issuer: config?.issuer,
      tenantId: config?.tenantId,
      loginUrl: enabled && config
        ? `${ctx.origin}/login?tenant=${tenant.slug}`
        : null,
    },
  };
}

/**
 * Delete/disable SSO configuration for the tenant
 * DELETE /tenant/sso
 *
 * Completely removes SSO config (not just disable)
 */
export async function deleteTenantSSO(ctx: Context): Promise<void> {
  const tenantId = ctx.state.user?.tenantId;

  if (!tenantId) {
    throw new AppError('Tenant context required', 400, 'TENANT_REQUIRED');
  }

  const tenant = await Tenant.findByPk(tenantId);

  if (!tenant) {
    throw new AppError('Tenant not found', 404, 'TENANT_NOT_FOUND');
  }

  const currentSettings = tenant.settings || {};

  // Remove SSO config entirely
  const { ssoEnabled, ssoConfig, ...restSettings } = currentSettings;

  await tenant.update({
    settings: restSettings,
  });

  logger.info({ tenantId }, 'Tenant SSO configuration deleted');

  ctx.body = {
    success: true,
    data: {
      message: 'SSO configuration deleted successfully',
    },
  };
}

/**
 * Test SSO configuration without saving
 * POST /tenant/sso/test
 *
 * Validates OIDC discovery for the given configuration
 */
export async function testTenantSSO(ctx: Context): Promise<void> {
  const tenantId = ctx.state.user?.tenantId;

  if (!tenantId) {
    throw new AppError('Tenant context required', 400, 'TENANT_REQUIRED');
  }

  // Validate request body
  const parseResult = tenantSSOConfigSchema.safeParse(ctx.request.body);

  if (!parseResult.success) {
    throw new AppError(
      'Validation error',
      400,
      'VALIDATION_ERROR',
      { errors: parseResult.error.flatten().fieldErrors }
    );
  }

  const config = parseResult.data;

  // Test the configuration
  const testResults: {
    discovery: { success: boolean; error?: string; endpoints?: Record<string, string> };
    overall: boolean;
  } = {
    discovery: { success: false },
    overall: false,
  };

  try {
    // For OIDC providers, test discovery endpoint
    if (config.provider === 'oidc' && config.issuer) {
      const discoveryUrl = config.issuer.endsWith('/')
        ? `${config.issuer}.well-known/openid-configuration`
        : `${config.issuer}/.well-known/openid-configuration`;

      const response = await fetch(discoveryUrl, {
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        testResults.discovery = {
          success: false,
          error: `Discovery endpoint returned ${response.status}: ${response.statusText}`,
        };
      } else {
        const discoveryDoc = await response.json() as {
          issuer: string;
          authorization_endpoint: string;
          token_endpoint: string;
          userinfo_endpoint?: string;
        };

        // Validate required endpoints exist
        if (!discoveryDoc.authorization_endpoint || !discoveryDoc.token_endpoint) {
          testResults.discovery = {
            success: false,
            error: 'Discovery document missing required endpoints (authorization_endpoint, token_endpoint)',
          };
        } else {
          testResults.discovery = {
            success: true,
            endpoints: {
              authorization: discoveryDoc.authorization_endpoint,
              token: discoveryDoc.token_endpoint,
              userinfo: discoveryDoc.userinfo_endpoint || 'Not available',
            },
          };
        }
      }
    } else if (config.provider === 'google') {
      // Google doesn't need discovery test, just validate client ID format
      testResults.discovery = {
        success: config.clientId.endsWith('.apps.googleusercontent.com'),
        error: !config.clientId.endsWith('.apps.googleusercontent.com')
          ? 'Google Client ID should end with .apps.googleusercontent.com'
          : undefined,
      };
    } else if (config.provider === 'microsoft') {
      // Microsoft: test the tenant-specific discovery
      const tenantIdOrCommon = config.tenantId || 'common';
      const discoveryUrl = `https://login.microsoftonline.com/${tenantIdOrCommon}/v2.0/.well-known/openid-configuration`;

      const response = await fetch(discoveryUrl, {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        testResults.discovery = {
          success: false,
          error: `Microsoft discovery failed: ${response.status}. Check tenant ID.`,
        };
      } else {
        const discoveryDoc = await response.json() as {
          authorization_endpoint: string;
          token_endpoint: string;
        };

        testResults.discovery = {
          success: true,
          endpoints: {
            authorization: discoveryDoc.authorization_endpoint,
            token: discoveryDoc.token_endpoint,
          },
        };
      }
    }

    testResults.overall = testResults.discovery.success;
  } catch (error) {
    const err = error as Error;
    testResults.discovery = {
      success: false,
      error: `Connection failed: ${err.message}`,
    };
    testResults.overall = false;
  }

  logger.info(
    { tenantId, provider: config.provider, success: testResults.overall },
    'Tenant SSO configuration tested'
  );

  ctx.body = {
    success: true,
    data: testResults,
  };
}
