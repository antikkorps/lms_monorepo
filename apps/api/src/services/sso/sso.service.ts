/**
 * SSO Service
 * Orchestrates OAuth2/OpenID Connect authentication flows
 */

import crypto from 'node:crypto';
import type {
  SSOProvider,
  SSOProviderConfig,
  SSOProviderType,
  SSOStateData,
  SSOAuthResult,
  SSOUserInfo,
} from './sso.types.js';
import { SSOError, SSOErrorCodes } from './sso.types.js';
import { createSSOCircuitBreaker } from './circuit-breaker.js';
import {
  createGoogleProvider,
  createMicrosoftProvider,
  createOIDCProvider,
} from './providers/index.js';
import { getRedisClient } from '../../utils/redis.js';
import { User } from '../../database/models/User.js';
import { Tenant } from '../../database/models/Tenant.js';
import { UserRole, UserStatus } from '../../database/models/enums.js';
import { generateTokenPair } from '../../auth/jwt.js';
import { storeRefreshTokenFamily } from '../../auth/session.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

const SSO_STATE_PREFIX = 'sso:state:';
const SSO_STATE_TTL = 5 * 60; // 5 minutes

/**
 * Generate a secure random state parameter
 */
function generateState(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate a secure nonce for ID token validation
 */
function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

class SSOService {
  /**
   * Create an SSO provider based on type and configuration
   */
  createProvider(
    providerType: SSOProviderType,
    providerConfig: SSOProviderConfig
  ): SSOProvider {
    let baseProvider: SSOProvider;

    switch (providerType) {
      case 'google':
        baseProvider = createGoogleProvider(providerConfig);
        break;
      case 'microsoft':
        baseProvider = createMicrosoftProvider(providerConfig);
        break;
      case 'oidc':
        baseProvider = createOIDCProvider(providerConfig);
        break;
      default:
        throw new SSOError(
          `Unknown SSO provider type: ${providerType}`,
          SSOErrorCodes.PROVIDER_NOT_CONFIGURED
        );
    }

    // Wrap with circuit breaker for resilience
    return createSSOCircuitBreaker(baseProvider);
  }

  /**
   * Get SSO configuration for a tenant (or global config if no tenant)
   */
  async getProviderConfig(
    tenantId: string | null,
    providerType: SSOProviderType
  ): Promise<{ config: SSOProviderConfig; provider: SSOProviderType } | null> {
    // If tenant specified, check tenant-specific SSO config
    if (tenantId) {
      const tenant = await Tenant.findByPk(tenantId);
      if (tenant?.settings?.ssoEnabled && tenant.settings.ssoConfig) {
        const ssoConfig = tenant.settings.ssoConfig as {
          provider: SSOProviderType;
          clientId: string;
          clientSecret: string;
          issuer?: string;
          tenantId?: string;
        };

        // Tenant has custom SSO config
        return {
          provider: ssoConfig.provider,
          config: {
            clientId: ssoConfig.clientId,
            clientSecret: ssoConfig.clientSecret,
            redirectUri: config.sso.callbackUrl,
            issuer: ssoConfig.issuer,
            tenantId: ssoConfig.tenantId,
          },
        };
      }
    }

    // Fall back to global config
    if (providerType === 'google' && config.sso.google.clientId) {
      return {
        provider: 'google',
        config: {
          clientId: config.sso.google.clientId,
          clientSecret: config.sso.google.clientSecret,
          redirectUri: config.sso.callbackUrl,
        },
      };
    }

    if (providerType === 'microsoft' && config.sso.microsoft.clientId) {
      return {
        provider: 'microsoft',
        config: {
          clientId: config.sso.microsoft.clientId,
          clientSecret: config.sso.microsoft.clientSecret,
          redirectUri: config.sso.callbackUrl,
          tenantId: config.sso.microsoft.tenantId,
        },
      };
    }

    return null;
  }

  /**
   * Initiate SSO authentication flow
   * Returns the authorization URL to redirect the user to
   */
  async initiateAuth(
    providerType: SSOProviderType,
    tenantId: string | null,
    frontendRedirectUri: string
  ): Promise<string> {
    // Get provider configuration
    const providerData = await this.getProviderConfig(tenantId, providerType);

    if (!providerData) {
      throw new SSOError(
        `SSO provider ${providerType} is not configured`,
        SSOErrorCodes.PROVIDER_NOT_CONFIGURED,
        providerType
      );
    }

    const provider = this.createProvider(providerData.provider, providerData.config);

    // Generate state and nonce
    const state = generateState();
    const nonce = generateNonce();

    // Store state in Redis
    const stateData: SSOStateData = {
      tenantId,
      provider: providerData.provider,
      nonce,
      redirectUri: frontendRedirectUri,
      createdAt: Date.now(),
    };

    const redis = getRedisClient();
    await redis.setex(
      `${SSO_STATE_PREFIX}${state}`,
      SSO_STATE_TTL,
      JSON.stringify(stateData)
    );

    // Generate authorization URL (may be async for OIDC discovery)
    const authUrl = await Promise.resolve(provider.getAuthorizationUrl(state, nonce));

    logger.info(
      { provider: providerType, tenantId, state: state.substring(0, 8) },
      'SSO authentication initiated'
    );

    return authUrl;
  }

  /**
   * Handle OAuth callback
   * Exchanges code for tokens, creates/links user, returns auth result
   */
  async handleCallback(
    code: string,
    state: string
  ): Promise<SSOAuthResult & { redirectUri: string }> {
    const redis = getRedisClient();

    // Retrieve and validate state
    const stateKey = `${SSO_STATE_PREFIX}${state}`;
    const stateJson = await redis.get(stateKey);

    if (!stateJson) {
      throw new SSOError(
        'Invalid or expired SSO state',
        SSOErrorCodes.INVALID_STATE
      );
    }

    // Delete state immediately (one-time use)
    await redis.del(stateKey);

    const stateData = JSON.parse(stateJson) as SSOStateData;

    // Check if state has expired (extra safety)
    if (Date.now() - stateData.createdAt > SSO_STATE_TTL * 1000) {
      throw new SSOError(
        'SSO state has expired',
        SSOErrorCodes.STATE_EXPIRED
      );
    }

    // Get provider configuration
    const providerData = await this.getProviderConfig(
      stateData.tenantId,
      stateData.provider
    );

    if (!providerData) {
      throw new SSOError(
        `SSO provider ${stateData.provider} is no longer configured`,
        SSOErrorCodes.PROVIDER_NOT_CONFIGURED,
        stateData.provider
      );
    }

    const provider = this.createProvider(providerData.provider, providerData.config);

    // Exchange code for tokens
    const tokens = await provider.exchangeCodeForTokens(code);

    // Get user info
    const userInfo = await provider.getUserInfo(tokens);

    // Validate email is verified (security requirement)
    if (!userInfo.emailVerified) {
      throw new SSOError(
        'Email address is not verified by the provider',
        SSOErrorCodes.EMAIL_NOT_VERIFIED,
        stateData.provider
      );
    }

    // Find or create user
    const { user, isNewUser } = await this.findOrCreateUser(
      userInfo,
      stateData.provider,
      stateData.tenantId
    );

    // Generate JWT tokens
    const { accessToken, refreshToken, tokenFamily } = generateTokenPair({
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    });

    // Store refresh token family
    await storeRefreshTokenFamily(user.id, tokenFamily, refreshToken);

    // Update last login
    await user.update({ lastLoginAt: new Date() });

    logger.info(
      {
        userId: user.id,
        email: user.email,
        provider: stateData.provider,
        isNewUser,
        tenantId: user.tenantId,
      },
      'SSO authentication successful'
    );

    return {
      isNewUser,
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      accessToken,
      refreshToken,
      redirectUri: stateData.redirectUri,
    };
  }

  /**
   * Find existing user or create new one
   * Implements auto-link by email strategy
   */
  private async findOrCreateUser(
    userInfo: SSOUserInfo,
    provider: SSOProviderType,
    tenantId: string | null
  ): Promise<{ user: User; isNewUser: boolean }> {
    // First, try to find by SSO provider ID (exact match)
    let user = await User.findOne({
      where: {
        ssoProvider: provider,
        ssoProviderId: userInfo.providerId,
      },
    });

    if (user) {
      // Update SSO metadata on each login
      await user.update({
        ssoMetadata: userInfo.rawClaims,
        // Update profile info if available
        ...(userInfo.avatarUrl && { avatarUrl: userInfo.avatarUrl }),
      });

      return { user, isNewUser: false };
    }

    // Try to find by email (auto-link)
    user = await User.findOne({
      where: { email: userInfo.email },
    });

    if (user) {
      // Link existing account to SSO
      await user.update({
        ssoProvider: provider,
        ssoProviderId: userInfo.providerId,
        ssoMetadata: userInfo.rawClaims,
        // Ensure user is active (SSO email is verified)
        status: UserStatus.ACTIVE,
        ...(userInfo.avatarUrl && !user.avatarUrl && { avatarUrl: userInfo.avatarUrl }),
      });

      logger.info(
        { userId: user.id, email: user.email, provider },
        'Existing account linked to SSO'
      );

      return { user, isNewUser: false };
    }

    // Create new user
    // Check tenant seat availability if B2B
    if (tenantId) {
      const tenant = await Tenant.findByPk(tenantId);
      if (tenant && tenant.seatsUsed >= tenant.seatsPurchased) {
        throw new SSOError(
          'No available seats in this organization',
          'NO_SEATS_AVAILABLE'
        );
      }

      // Increment seat count
      if (tenant) {
        await Tenant.increment('seatsUsed', { where: { id: tenantId } });
      }
    }

    user = await User.create({
      email: userInfo.email,
      firstName: userInfo.firstName || 'User',
      lastName: userInfo.lastName || '',
      passwordHash: '', // No password for SSO users
      role: tenantId ? UserRole.LEARNER : UserRole.LEARNER,
      status: UserStatus.ACTIVE, // SSO users are pre-verified
      tenantId,
      avatarUrl: userInfo.avatarUrl || null,
      ssoProvider: provider,
      ssoProviderId: userInfo.providerId,
      ssoMetadata: userInfo.rawClaims,
    });

    logger.info(
      { userId: user.id, email: user.email, provider, tenantId },
      'New user created via SSO'
    );

    return { user, isNewUser: true };
  }

  /**
   * Link an existing authenticated user to an SSO provider
   */
  async linkAccount(
    userId: string,
    providerType: SSOProviderType,
    code: string,
    state: string
  ): Promise<void> {
    const redis = getRedisClient();

    // Validate state
    const stateKey = `${SSO_STATE_PREFIX}${state}`;
    const stateJson = await redis.get(stateKey);

    if (!stateJson) {
      throw new SSOError(
        'Invalid or expired SSO state',
        SSOErrorCodes.INVALID_STATE
      );
    }

    await redis.del(stateKey);

    // Parse state data (validated but not used further in link flow)
    JSON.parse(stateJson) as SSOStateData;

    // Get provider configuration
    const providerData = await this.getProviderConfig(null, providerType);

    if (!providerData) {
      throw new SSOError(
        `SSO provider ${providerType} is not configured`,
        SSOErrorCodes.PROVIDER_NOT_CONFIGURED,
        providerType
      );
    }

    const provider = this.createProvider(providerData.provider, providerData.config);

    // Exchange code and get user info
    const tokens = await provider.exchangeCodeForTokens(code);
    const userInfo = await provider.getUserInfo(tokens);

    // Get the user
    const user = await User.findByPk(userId);
    if (!user) {
      throw new SSOError('User not found', 'USER_NOT_FOUND');
    }

    // Check email matches
    if (user.email !== userInfo.email) {
      throw new SSOError(
        'SSO email does not match account email',
        'EMAIL_MISMATCH'
      );
    }

    // Link the account
    await user.update({
      ssoProvider: providerType,
      ssoProviderId: userInfo.providerId,
      ssoMetadata: userInfo.rawClaims,
    });

    logger.info(
      { userId, provider: providerType },
      'Account linked to SSO provider'
    );
  }

  /**
   * Unlink SSO from a user account
   * Requires the user to have a password set
   */
  async unlinkAccount(userId: string): Promise<void> {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new SSOError('User not found', 'USER_NOT_FOUND');
    }

    if (!user.ssoProvider) {
      throw new SSOError('Account is not linked to SSO', 'NOT_LINKED');
    }

    // Ensure user has a password before unlinking
    if (!user.passwordHash) {
      throw new SSOError(
        'Cannot unlink SSO without setting a password first',
        'PASSWORD_REQUIRED'
      );
    }

    await user.update({
      ssoProvider: null,
      ssoProviderId: null,
      ssoMetadata: null,
    });

    logger.info({ userId }, 'SSO unlinked from account');
  }
}

// Export singleton instance
export const ssoService = new SSOService();
