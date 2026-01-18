/**
 * Generic OpenID Connect Provider
 * Supports any OIDC-compliant identity provider (Okta, Auth0, Keycloak, etc.)
 * Uses automatic discovery via .well-known/openid-configuration
 */

import * as jose from 'jose';
import type {
  SSOProvider,
  SSOProviderConfig,
  SSOTokens,
  SSOUserInfo,
} from '../sso.types.js';
import { SSOError, SSOErrorCodes } from '../sso.types.js';

interface OIDCDiscoveryDocument {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
  jwks_uri: string;
  scopes_supported?: string[];
  response_types_supported?: string[];
  claims_supported?: string[];
}

const DEFAULT_SCOPES = ['openid', 'email', 'profile'];

export class OIDCSSOProvider implements SSOProvider {
  readonly name = 'oidc' as const;
  private config: SSOProviderConfig;
  private discoveryDoc: OIDCDiscoveryDocument | null = null;
  private jwksClient: ReturnType<typeof jose.createRemoteJWKSet> | null = null;
  private discoveryPromise: Promise<OIDCDiscoveryDocument> | null = null;

  constructor(config: SSOProviderConfig) {
    this.config = config;

    if (!config.issuer && !config.authorizationUrl) {
      throw new SSOError(
        'OIDC provider requires either issuer URL or explicit endpoint URLs',
        SSOErrorCodes.PROVIDER_NOT_CONFIGURED,
        'oidc'
      );
    }
  }

  /**
   * Fetch and cache the OIDC discovery document
   */
  private async discover(): Promise<OIDCDiscoveryDocument> {
    // Return cached document
    if (this.discoveryDoc) {
      return this.discoveryDoc;
    }

    // Return in-flight promise to prevent duplicate requests
    if (this.discoveryPromise) {
      return this.discoveryPromise;
    }

    // If explicit URLs provided, build discovery doc manually
    if (this.config.authorizationUrl && this.config.tokenUrl) {
      this.discoveryDoc = {
        issuer: this.config.issuer || '',
        authorization_endpoint: this.config.authorizationUrl,
        token_endpoint: this.config.tokenUrl,
        userinfo_endpoint: this.config.userInfoUrl,
        jwks_uri: this.config.jwksUri || '',
      };
      return this.discoveryDoc;
    }

    // Fetch from well-known endpoint
    this.discoveryPromise = this.fetchDiscoveryDocument();

    try {
      this.discoveryDoc = await this.discoveryPromise;
      return this.discoveryDoc;
    } finally {
      this.discoveryPromise = null;
    }
  }

  private async fetchDiscoveryDocument(): Promise<OIDCDiscoveryDocument> {
    const issuer = this.config.issuer!;
    const discoveryUrl = issuer.endsWith('/')
      ? `${issuer}.well-known/openid-configuration`
      : `${issuer}/.well-known/openid-configuration`;

    try {
      const response = await fetch(discoveryUrl);

      if (!response.ok) {
        throw new SSOError(
          `OIDC discovery failed: ${response.status}`,
          SSOErrorCodes.DISCOVERY_FAILED,
          'oidc'
        );
      }

      return (await response.json()) as OIDCDiscoveryDocument;
    } catch (error) {
      if (error instanceof SSOError) throw error;

      const err = error as Error;
      throw new SSOError(
        `OIDC discovery failed: ${err.message}`,
        SSOErrorCodes.DISCOVERY_FAILED,
        'oidc',
        { issuer, originalError: err.message }
      );
    }
  }

  async getAuthorizationUrl(state: string, nonce: string): Promise<string> {
    const doc = await this.discover();
    const scopes = [...DEFAULT_SCOPES, ...(this.config.additionalScopes || [])];

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: this.config.redirectUri,
      scope: scopes.join(' '),
      state,
      nonce,
    });

    return `${doc.authorization_endpoint}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<SSOTokens> {
    const doc = await this.discover();

    try {
      const params = new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: this.config.redirectUri,
        grant_type: 'authorization_code',
      });

      const response = await fetch(doc.token_endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new SSOError(
          `OIDC token exchange failed: ${response.status}`,
          SSOErrorCodes.TOKEN_EXCHANGE_FAILED,
          'oidc',
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
        `OIDC token exchange failed: ${err.message}`,
        SSOErrorCodes.TOKEN_EXCHANGE_FAILED,
        'oidc',
        { originalError: err.message }
      );
    }
  }

  async getUserInfo(tokens: SSOTokens): Promise<SSOUserInfo> {
    const doc = await this.discover();

    try {
      // Prefer ID token for user info
      if (tokens.idToken && doc.jwks_uri) {
        return this.parseIdToken(tokens.idToken, doc);
      }

      // Fallback to userinfo endpoint
      if (doc.userinfo_endpoint) {
        return this.fetchUserInfo(tokens.accessToken, doc.userinfo_endpoint);
      }

      // If no userinfo endpoint, try parsing ID token without validation
      if (tokens.idToken) {
        return this.parseIdTokenUnsafe(tokens.idToken);
      }

      throw new SSOError(
        'No method available to get user info',
        SSOErrorCodes.USER_INFO_FAILED,
        'oidc'
      );
    } catch (error) {
      if (error instanceof SSOError) throw error;

      const err = error as Error;
      throw new SSOError(
        `OIDC user info failed: ${err.message}`,
        SSOErrorCodes.USER_INFO_FAILED,
        'oidc',
        { originalError: err.message }
      );
    }
  }

  private async parseIdToken(
    idToken: string,
    doc: OIDCDiscoveryDocument
  ): Promise<SSOUserInfo> {
    // Initialize JWKS client if not done
    if (!this.jwksClient) {
      this.jwksClient = jose.createRemoteJWKSet(new URL(doc.jwks_uri));
    }

    const { payload } = await jose.jwtVerify(idToken, this.jwksClient, {
      audience: this.config.clientId,
      issuer: doc.issuer,
    });

    return this.extractUserInfo(payload);
  }

  private parseIdTokenUnsafe(idToken: string): SSOUserInfo {
    // Decode without verification (use only as fallback)
    const payload = jose.decodeJwt(idToken);
    return this.extractUserInfo(payload);
  }

  private extractUserInfo(payload: jose.JWTPayload): SSOUserInfo {
    const email =
      (payload.email as string) ||
      (payload.preferred_username as string) ||
      (payload.upn as string);

    if (!email) {
      throw new SSOError(
        'No email in OIDC token',
        SSOErrorCodes.USER_INFO_FAILED,
        'oidc'
      );
    }

    // Try various claim names for first/last name
    const firstName =
      (payload.given_name as string) ||
      (payload.first_name as string) ||
      (payload.firstName as string);

    const lastName =
      (payload.family_name as string) ||
      (payload.last_name as string) ||
      (payload.lastName as string);

    return {
      providerId: payload.sub as string,
      email,
      emailVerified: (payload.email_verified as boolean) ?? false,
      firstName,
      lastName,
      avatarUrl: (payload.picture as string) || undefined,
      rawClaims: payload as Record<string, unknown>,
    };
  }

  private async fetchUserInfo(
    accessToken: string,
    userInfoUrl: string
  ): Promise<SSOUserInfo> {
    const response = await fetch(userInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new SSOError(
        `OIDC userinfo request failed: ${response.status}`,
        SSOErrorCodes.USER_INFO_FAILED,
        'oidc'
      );
    }

    const data = (await response.json()) as Record<string, unknown>;

    const email =
      (data.email as string) ||
      (data.preferred_username as string) ||
      (data.upn as string);

    if (!email) {
      throw new SSOError(
        'No email in OIDC userinfo response',
        SSOErrorCodes.USER_INFO_FAILED,
        'oidc'
      );
    }

    return {
      providerId: data.sub as string,
      email,
      emailVerified: (data.email_verified as boolean) ?? false,
      firstName:
        (data.given_name as string) ||
        (data.first_name as string) ||
        undefined,
      lastName:
        (data.family_name as string) ||
        (data.last_name as string) ||
        undefined,
      avatarUrl: (data.picture as string) || undefined,
      rawClaims: data,
    };
  }
}

/**
 * Factory function for creating generic OIDC SSO provider
 */
export function createOIDCProvider(config: SSOProviderConfig): SSOProvider {
  if (!config.clientId || !config.clientSecret) {
    throw new SSOError(
      'OIDC provider requires clientId and clientSecret',
      SSOErrorCodes.PROVIDER_NOT_CONFIGURED,
      'oidc'
    );
  }

  return new OIDCSSOProvider(config);
}
