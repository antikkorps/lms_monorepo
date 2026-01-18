/**
 * SSO Types & Interfaces
 * Extensible provider pattern for OAuth2/OpenID Connect authentication
 */

// ============================================================================
// Provider Types
// ============================================================================

export type SSOProviderType = 'google' | 'microsoft' | 'oidc';

// ============================================================================
// Token Interfaces
// ============================================================================

export interface SSOTokens {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  scope?: string;
}

// ============================================================================
// User Info Interface
// ============================================================================

export interface SSOUserInfo {
  /** Unique identifier from the provider */
  providerId: string;
  /** User's email address */
  email: string;
  /** Whether the email has been verified by the provider */
  emailVerified: boolean;
  /** User's first name (if available) */
  firstName?: string;
  /** User's last name (if available) */
  lastName?: string;
  /** URL to the user's avatar/profile picture */
  avatarUrl?: string;
  /** Raw claims from the ID token or userinfo endpoint */
  rawClaims: Record<string, unknown>;
}

// ============================================================================
// Provider Configuration
// ============================================================================

export interface SSOProviderConfig {
  /** OAuth2 client ID */
  clientId: string;
  /** OAuth2 client secret */
  clientSecret: string;
  /** Redirect URI for OAuth callback */
  redirectUri: string;
  /** For OIDC: issuer URL (e.g., https://accounts.google.com) */
  issuer?: string;
  /** For custom OIDC: authorization endpoint URL */
  authorizationUrl?: string;
  /** For custom OIDC: token endpoint URL */
  tokenUrl?: string;
  /** For custom OIDC: userinfo endpoint URL */
  userInfoUrl?: string;
  /** For custom OIDC: JWKS URI for token validation */
  jwksUri?: string;
  /** For Microsoft: Azure AD tenant ID (common, organizations, or specific tenant) */
  tenantId?: string;
  /** Additional scopes to request */
  additionalScopes?: string[];
}

// ============================================================================
// Provider Interface (must be implemented by all providers)
// ============================================================================

export interface SSOProvider {
  /** Provider name for identification */
  readonly name: SSOProviderType;

  /**
   * Generate the authorization URL to redirect the user to
   * @param state - CSRF protection state parameter
   * @param nonce - ID token replay protection nonce
   * @returns Full authorization URL (may be async for OIDC discovery)
   */
  getAuthorizationUrl(state: string, nonce: string): string | Promise<string>;

  /**
   * Exchange authorization code for tokens
   * @param code - Authorization code from callback
   * @returns Token response
   */
  exchangeCodeForTokens(code: string): Promise<SSOTokens>;

  /**
   * Get user information from tokens
   * @param tokens - Tokens from exchangeCodeForTokens
   * @returns User information
   */
  getUserInfo(tokens: SSOTokens): Promise<SSOUserInfo>;
}

// ============================================================================
// Service Types
// ============================================================================

export interface SSOStateData {
  /** Tenant ID (null for global/B2C SSO) */
  tenantId: string | null;
  /** Provider type */
  provider: SSOProviderType;
  /** Nonce for ID token validation */
  nonce: string;
  /** Original redirect URI after auth */
  redirectUri: string;
  /** Timestamp for expiration check */
  createdAt: number;
}

export interface SSOAuthResult {
  /** Whether this is a new user */
  isNewUser: boolean;
  /** The authenticated/created user ID */
  userId: string;
  /** User's email */
  email: string;
  /** User's role */
  role: string;
  /** Tenant ID if B2B user */
  tenantId: string | null;
  /** Access token for the API */
  accessToken: string;
  /** Refresh token for token rotation */
  refreshToken: string;
}

// ============================================================================
// Error Types
// ============================================================================

export class SSOError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly provider?: SSOProviderType,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SSOError';
  }
}

export const SSOErrorCodes = {
  INVALID_STATE: 'SSO_INVALID_STATE',
  STATE_EXPIRED: 'SSO_STATE_EXPIRED',
  TOKEN_EXCHANGE_FAILED: 'SSO_TOKEN_EXCHANGE_FAILED',
  USER_INFO_FAILED: 'SSO_USER_INFO_FAILED',
  EMAIL_NOT_VERIFIED: 'SSO_EMAIL_NOT_VERIFIED',
  PROVIDER_NOT_CONFIGURED: 'SSO_PROVIDER_NOT_CONFIGURED',
  INVALID_ID_TOKEN: 'SSO_INVALID_ID_TOKEN',
  DISCOVERY_FAILED: 'SSO_DISCOVERY_FAILED',
} as const;
