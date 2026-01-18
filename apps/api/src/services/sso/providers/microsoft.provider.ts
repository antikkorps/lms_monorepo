/**
 * Microsoft Entra ID (Azure AD) OAuth2/OpenID Connect Provider
 * Implements SSO via Microsoft accounts and Azure AD tenants
 */

import * as jose from 'jose';
import type {
  SSOProvider,
  SSOProviderConfig,
  SSOTokens,
  SSOUserInfo,
} from '../sso.types.js';
import { SSOError, SSOErrorCodes } from '../sso.types.js';

const MICROSOFT_SCOPES = ['openid', 'email', 'profile', 'User.Read'];

export class MicrosoftSSOProvider implements SSOProvider {
  readonly name = 'microsoft' as const;
  private config: SSOProviderConfig;
  private tenantId: string;
  private jwksClient: ReturnType<typeof jose.createRemoteJWKSet> | null = null;

  constructor(config: SSOProviderConfig) {
    this.config = config;
    // Default to 'common' for multi-tenant, or use specific tenant
    this.tenantId = config.tenantId || 'common';
  }

  private get authorizationUrl(): string {
    return `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/authorize`;
  }

  private get tokenUrl(): string {
    return `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
  }

  private get jwksUri(): string {
    return `https://login.microsoftonline.com/${this.tenantId}/discovery/v2.0/keys`;
  }

  private get issuer(): string {
    // For 'common' tenant, issuer varies per user
    if (this.tenantId === 'common' || this.tenantId === 'organizations') {
      return `https://login.microsoftonline.com/{tenantid}/v2.0`;
    }
    return `https://login.microsoftonline.com/${this.tenantId}/v2.0`;
  }

  getAuthorizationUrl(state: string, nonce: string): string {
    const scopes = [...MICROSOFT_SCOPES, ...(this.config.additionalScopes || [])];

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: this.config.redirectUri,
      scope: scopes.join(' '),
      state,
      nonce,
      response_mode: 'query',
      prompt: 'select_account', // Allow account selection
    });

    return `${this.authorizationUrl}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<SSOTokens> {
    try {
      const params = new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: this.config.redirectUri,
        grant_type: 'authorization_code',
      });

      const response = await fetch(this.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new SSOError(
          `Microsoft token exchange failed: ${response.status}`,
          SSOErrorCodes.TOKEN_EXCHANGE_FAILED,
          'microsoft',
          errorData as Record<string, unknown>
        );
      }

      const data = (await response.json()) as {
        access_token: string;
        id_token?: string;
        refresh_token?: string;
        expires_in: number;
        token_type: string;
        scope?: string;
      };

      return {
        accessToken: data.access_token,
        idToken: data.id_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        tokenType: data.token_type,
        scope: data.scope,
      };
    } catch (error) {
      if (error instanceof SSOError) throw error;

      const err = error as Error;
      throw new SSOError(
        `Microsoft token exchange failed: ${err.message}`,
        SSOErrorCodes.TOKEN_EXCHANGE_FAILED,
        'microsoft',
        { originalError: err.message }
      );
    }
  }

  async getUserInfo(tokens: SSOTokens): Promise<SSOUserInfo> {
    try {
      // Parse ID token for user info
      if (tokens.idToken) {
        return this.parseIdToken(tokens.idToken);
      }

      // Fallback to Microsoft Graph API
      return this.fetchUserInfo(tokens.accessToken);
    } catch (error) {
      if (error instanceof SSOError) throw error;

      const err = error as Error;
      throw new SSOError(
        `Microsoft user info failed: ${err.message}`,
        SSOErrorCodes.USER_INFO_FAILED,
        'microsoft',
        { originalError: err.message }
      );
    }
  }

  private async parseIdToken(idToken: string): Promise<SSOUserInfo> {
    // Initialize JWKS client if not done
    if (!this.jwksClient) {
      this.jwksClient = jose.createRemoteJWKSet(new URL(this.jwksUri));
    }

    try {
      // Verify the token
      const { payload } = await jose.jwtVerify(idToken, this.jwksClient, {
        audience: this.config.clientId,
        // Skip issuer check for 'common' tenant (issuer varies)
        ...(this.tenantId !== 'common' &&
          this.tenantId !== 'organizations' && {
            issuer: this.issuer,
          }),
      });

      const email =
        (payload.email as string) ||
        (payload.preferred_username as string) ||
        (payload.upn as string);

      if (!email) {
        throw new SSOError(
          'No email in Microsoft ID token',
          SSOErrorCodes.USER_INFO_FAILED,
          'microsoft'
        );
      }

      return {
        providerId: payload.sub as string,
        email,
        emailVerified: true, // Microsoft emails are verified
        firstName: payload.given_name as string | undefined,
        lastName: payload.family_name as string | undefined,
        avatarUrl: undefined, // Not in ID token, would need Graph API
        rawClaims: payload as Record<string, unknown>,
      };
    } catch (error) {
      if (error instanceof SSOError) throw error;

      const err = error as Error;
      throw new SSOError(
        `Microsoft ID token validation failed: ${err.message}`,
        SSOErrorCodes.INVALID_ID_TOKEN,
        'microsoft',
        { originalError: err.message }
      );
    }
  }

  private async fetchUserInfo(accessToken: string): Promise<SSOUserInfo> {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new SSOError(
        `Microsoft Graph request failed: ${response.status}`,
        SSOErrorCodes.USER_INFO_FAILED,
        'microsoft'
      );
    }

    const data = (await response.json()) as {
      id: string;
      mail?: string;
      userPrincipalName?: string;
      givenName?: string;
      surname?: string;
      displayName?: string;
    };

    const email = data.mail || data.userPrincipalName;

    if (!email) {
      throw new SSOError(
        'No email in Microsoft Graph response',
        SSOErrorCodes.USER_INFO_FAILED,
        'microsoft'
      );
    }

    return {
      providerId: data.id,
      email,
      emailVerified: true, // Microsoft emails are verified
      firstName: data.givenName,
      lastName: data.surname,
      avatarUrl: undefined, // Would need separate Graph call for photo
      rawClaims: data as Record<string, unknown>,
    };
  }
}

/**
 * Factory function for creating Microsoft SSO provider
 */
export function createMicrosoftProvider(config: SSOProviderConfig): SSOProvider {
  if (!config.clientId || !config.clientSecret) {
    throw new SSOError(
      'Microsoft SSO requires clientId and clientSecret',
      SSOErrorCodes.PROVIDER_NOT_CONFIGURED,
      'microsoft'
    );
  }

  return new MicrosoftSSOProvider(config);
}
