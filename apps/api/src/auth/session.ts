import { getRedisClient } from '../utils/redis.js';
import { logger } from '../utils/logger.js';

// Redis key prefixes
const BLACKLIST_PREFIX = 'auth:blacklist:';
const REFRESH_TOKEN_PREFIX = 'auth:refresh:';
const USER_SESSIONS_PREFIX = 'auth:sessions:';

// TTL in seconds
const BLACKLIST_TTL = 60 * 60 * 24 * 7; // 7 days (match refresh token expiry)
const REFRESH_TOKEN_TTL = 60 * 60 * 24 * 7; // 7 days

/**
 * Add a token to the blacklist (for logout/revocation)
 */
export async function blacklistToken(
  tokenId: string,
  expiresInSeconds?: number
): Promise<void> {
  const redis = getRedisClient();
  const key = `${BLACKLIST_PREFIX}${tokenId}`;
  const ttl = expiresInSeconds || BLACKLIST_TTL;

  await redis.setex(key, ttl, '1');
  logger.debug({ tokenId }, 'Token blacklisted');
}

/**
 * Check if a token is blacklisted
 */
export async function isTokenBlacklisted(tokenId: string): Promise<boolean> {
  const redis = getRedisClient();
  const key = `${BLACKLIST_PREFIX}${tokenId}`;
  const result = await redis.get(key);
  return result !== null;
}

/**
 * Store a refresh token family for rotation tracking
 */
export async function storeRefreshTokenFamily(
  userId: string,
  tokenFamily: string,
  refreshToken: string
): Promise<void> {
  const redis = getRedisClient();
  const key = `${REFRESH_TOKEN_PREFIX}${tokenFamily}`;

  await redis.setex(
    key,
    REFRESH_TOKEN_TTL,
    JSON.stringify({
      userId,
      refreshToken,
      createdAt: Date.now(),
    })
  );

  // Also track user sessions for "logout all devices" feature
  const userSessionsKey = `${USER_SESSIONS_PREFIX}${userId}`;
  await redis.sadd(userSessionsKey, tokenFamily);
  await redis.expire(userSessionsKey, REFRESH_TOKEN_TTL);
}

/**
 * Get refresh token family data
 */
export async function getRefreshTokenFamily(
  tokenFamily: string
): Promise<{ userId: string; refreshToken: string; createdAt: number } | null> {
  const redis = getRedisClient();
  const key = `${REFRESH_TOKEN_PREFIX}${tokenFamily}`;
  const data = await redis.get(key);

  if (!data) {
    return null;
  }

  return JSON.parse(data);
}

/**
 * Invalidate a refresh token family (used in rotation)
 */
export async function invalidateRefreshTokenFamily(
  tokenFamily: string
): Promise<void> {
  const redis = getRedisClient();
  const key = `${REFRESH_TOKEN_PREFIX}${tokenFamily}`;

  // Get the data first to remove from user sessions
  const data = await getRefreshTokenFamily(tokenFamily);
  if (data) {
    const userSessionsKey = `${USER_SESSIONS_PREFIX}${data.userId}`;
    await redis.srem(userSessionsKey, tokenFamily);
  }

  await redis.del(key);
  logger.debug({ tokenFamily }, 'Refresh token family invalidated');
}

/**
 * Invalidate all sessions for a user (logout from all devices)
 */
export async function invalidateAllUserSessions(userId: string): Promise<void> {
  const redis = getRedisClient();
  const userSessionsKey = `${USER_SESSIONS_PREFIX}${userId}`;

  // Get all token families for this user
  const tokenFamilies = await redis.smembers(userSessionsKey);

  // Delete each refresh token family
  const pipeline = redis.pipeline();
  for (const tokenFamily of tokenFamilies) {
    pipeline.del(`${REFRESH_TOKEN_PREFIX}${tokenFamily}`);
  }
  pipeline.del(userSessionsKey);

  await pipeline.exec();
  logger.info({ userId, sessionCount: tokenFamilies.length }, 'All user sessions invalidated');
}

/**
 * Get active session count for a user
 */
export async function getUserSessionCount(userId: string): Promise<number> {
  const redis = getRedisClient();
  const userSessionsKey = `${USER_SESSIONS_PREFIX}${userId}`;
  return redis.scard(userSessionsKey);
}

/**
 * Detect refresh token reuse (potential theft)
 * If a token family is used but the stored token doesn't match,
 * it means the token was already rotated - possible theft
 */
export async function detectTokenReuse(
  tokenFamily: string,
  presentedToken: string
): Promise<boolean> {
  const data = await getRefreshTokenFamily(tokenFamily);

  if (!data) {
    // Token family doesn't exist - either expired or never existed
    return false;
  }

  // If the presented token doesn't match the stored one,
  // it means an old token is being reused
  return data.refreshToken !== presentedToken;
}
