/**
 * Google OAuth2/OpenID Connect Provider
 * Implements SSO via Google accounts
 */

import { OAuth2Client } from 'google-auth-library';
import type {
  SSOProvider,
  SSOProviderConfig,
  SSOTokens,
  SSOUserInfo,
} from '../sso.types.js';
import { SSOError, SSOErrorCodes } from '../sso.types.js';

const GOOGLE_SCOPES = ['openid', 'email', 'profile'];

export class GoogleSSOProvider implements SSOProvider {
  readonly name = 'google' as const;
  private client: OAuth2Client;
  private config: SSOProviderConfig;

  constructor(config: SSOProviderConfig) {
    this.config = config;
    this.client = new OAuth2Client(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
  }

  getAuthorizationUrl(state: string, nonce: string): string {
    const scopes = [...GOOGLE_SCOPES, ...(this.config.additionalScopes || [])];

    const url = this.client.generateAuthUrl({
      access_type: 'offline', // Request refresh token
      scope: scopes,
      state,
      prompt: 'consent', // Force consent to get refresh token
      include_granted_scopes: true,
    });

    // Add nonce for ID token validation
    const urlObj = new URL(url);
    urlObj.searchParams.set('nonce', nonce);

    return urlObj.toString();
  }

  async exchangeCodeForTokens(code: string): Promise<SSOTokens> {
    try {
      const { tokens } = await this.client.getToken(code);

      if (!tokens.access_token) {
        throw new SSOError(
          'No access token in response',
          SSOErrorCodes.TOKEN_EXCHANGE_FAILED,
          'google'
        );
      }

      return {
        accessToken: tokens.access_token,
        idToken: tokens.id_token || undefined,
        refreshToken: tokens.refresh_token || undefined,
        expiresIn: tokens.expiry_date
          ? Math.floor((tokens.expiry_date - Date.now()) / 1000)
          : 3600,
        tokenType: tokens.token_type || 'Bearer',
        scope: tokens.scope || undefined,
      };
    } catch (error) {
      if (error instanceof SSOError) throw error;

      const err = error as Error;
      throw new SSOError(
        `Google token exchange failed: ${err.message}`,
        SSOErrorCodes.TOKEN_EXCHANGE_FAILED,
        'google',
        { originalError: err.message }
      );
    }
  }

  async getUserInfo(tokens: SSOTokens): Promise<SSOUserInfo> {
    try {
      // Prefer ID token for user info (more reliable)
      if (tokens.idToken) {
        return this.parseIdToken(tokens.idToken);
      }

      // Fallback to userinfo endpoint
      return this.fetchUserInfo(tokens.accessToken);
    } catch (error) {
      if (error instanceof SSOError) throw error;

      const err = error as Error;
      throw new SSOError(
        `Google user info failed: ${err.message}`,
        SSOErrorCodes.USER_INFO_FAILED,
        'google',
        { originalError: err.message }
      );
    }
  }

  private async parseIdToken(idToken: string): Promise<SSOUserInfo> {
    const ticket = await this.client.verifyIdToken({
      idToken,
      audience: this.config.clientId,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new SSOError(
        'Invalid ID token payload',
        SSOErrorCodes.INVALID_ID_TOKEN,
        'google'
      );
    }

    if (!payload.email) {
      throw new SSOError(
        'No email in ID token',
        SSOErrorCodes.USER_INFO_FAILED,
        'google'
      );
    }

    return {
      providerId: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified ?? false,
      firstName: payload.given_name,
      lastName: payload.family_name,
      avatarUrl: payload.picture,
      rawClaims: payload as unknown as Record<string, unknown>,
    };
  }

  private async fetchUserInfo(accessToken: string): Promise<SSOUserInfo> {
    const response = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new SSOError(
        `Google userinfo request failed: ${response.status}`,
        SSOErrorCodes.USER_INFO_FAILED,
        'google'
      );
    }

    const data = (await response.json()) as {
      sub: string;
      email?: string;
      email_verified?: boolean;
      given_name?: string;
      family_name?: string;
      picture?: string;
    };

    if (!data.email) {
      throw new SSOError(
        'No email in userinfo response',
        SSOErrorCodes.USER_INFO_FAILED,
        'google'
      );
    }

    return {
      providerId: data.sub,
      email: data.email,
      emailVerified: data.email_verified ?? false,
      firstName: data.given_name,
      lastName: data.family_name,
      avatarUrl: data.picture,
      rawClaims: data as Record<string, unknown>,
    };
  }
}

/**
 * Factory function for creating Google SSO provider
 */
export function createGoogleProvider(config: SSOProviderConfig): SSOProvider {
  if (!config.clientId || !config.clientSecret) {
    throw new SSOError(
      'Google SSO requires clientId and clientSecret',
      SSOErrorCodes.PROVIDER_NOT_CONFIGURED,
      'google'
    );
  }

  return new GoogleSSOProvider(config);
}
