import jwt, { type SignOptions } from 'jsonwebtoken';
import { config } from '../config/index.js';
import { UserRole } from '../database/models/enums.js';

export interface AccessTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  tenantId: string | null;
  type: 'access';
}

export interface RefreshTokenPayload {
  userId: string;
  tokenFamily: string;
  type: 'refresh';
}

export type TokenPayload = AccessTokenPayload | RefreshTokenPayload;

/**
 * Generate an access token
 * Contains user identity for API authorization
 */
export function generateAccessToken(payload: Omit<AccessTokenPayload, 'type'>): string {
  const tokenPayload: AccessTokenPayload = {
    ...payload,
    type: 'access',
  };

  return jwt.sign(tokenPayload, config.jwtSecret, {
    expiresIn: config.jwtAccessExpiresIn,
  } as SignOptions);
}

/**
 * Generate a refresh token
 * Used to obtain new access tokens without re-authentication
 */
export function generateRefreshToken(
  userId: string,
  tokenFamily: string
): string {
  const payload: RefreshTokenPayload = {
    userId,
    tokenFamily,
    type: 'refresh',
  };

  return jwt.sign(payload, config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpiresIn,
  } as SignOptions);
}

/**
 * Verify and decode an access token
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, config.jwtSecret) as TokenPayload;

  if (payload.type !== 'access') {
    throw new Error('Invalid token type');
  }

  return payload as AccessTokenPayload;
}

/**
 * Verify and decode a refresh token
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const payload = jwt.verify(token, config.jwtRefreshSecret) as TokenPayload;

  if (payload.type !== 'refresh') {
    throw new Error('Invalid token type');
  }

  return payload as RefreshTokenPayload;
}

/**
 * Decode a token without verification (for debugging/logging)
 */
export function decodeToken(token: string): TokenPayload | null {
  return jwt.decode(token) as TokenPayload | null;
}

/**
 * Generate a random token family ID for refresh token rotation
 */
export function generateTokenFamily(): string {
  return crypto.randomUUID();
}

/**
 * Generate both access and refresh tokens for a user
 */
export function generateTokenPair(user: {
  id: string;
  email: string;
  role: UserRole;
  tenantId: string | null;
}): { accessToken: string; refreshToken: string; tokenFamily: string } {
  const tokenFamily = generateTokenFamily();

  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
  });

  const refreshToken = generateRefreshToken(user.id, tokenFamily);

  return {
    accessToken,
    refreshToken,
    tokenFamily,
  };
}
