import type { Context, Next } from 'koa';
import { getRedisClient } from '../utils/redis.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/app-error.js';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

// Rate limit tiers based on client type (using config values)
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // B2C: Standard users
  b2c: config.rateLimit.b2c,
  // B2B: Tenant users
  b2b: config.rateLimit.b2b,
  // B2B Premium: Higher tier
  b2b_premium: config.rateLimit.b2bPremium,
  // Auth endpoints: Stricter limits
  auth: config.rateLimit.auth,
};

type RateLimitTier = keyof typeof RATE_LIMITS;

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  total: number;
}

/**
 * Get rate limit key identifier based on IP or tenant
 */
function getRateLimitKey(ctx: Context, tier: RateLimitTier): string {
  const ip = ctx.ip || ctx.request.ip || 'unknown';
  // If user is authenticated and has tenant, use tenant-based key
  const tenantId = ctx.state?.user?.tenantId;

  if (tenantId && (tier === 'b2b' || tier === 'b2b_premium')) {
    return `rate_limit:${tier}:tenant:${tenantId}`;
  }

  return `rate_limit:${tier}:ip:${ip}`;
}

/**
 * Determine rate limit tier based on context
 */
function determineTier(ctx: Context): RateLimitTier {
  const path = ctx.path;

  // Auth endpoints have stricter limits
  if (path.startsWith('/api/v1/auth/')) {
    return 'auth';
  }

  // Check if user is authenticated and belongs to a tenant
  const user = ctx.state?.user;
  if (user?.tenantId) {
    // Check tenant subscription status for premium tier
    const tenant = ctx.state?.tenant;
    if (tenant?.subscriptionStatus === 'active' && tenant?.isolationStrategy === 'DEDICATED') {
      return 'b2b_premium';
    }
    return 'b2b';
  }

  return 'b2c';
}

/**
 * Sliding window rate limiter using Redis sorted sets
 * More accurate than fixed window, prevents burst at window boundaries
 */
async function checkRateLimit(
  key: string,
  limits: RateLimitConfig
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  const now = Date.now();
  const windowStart = now - limits.windowMs;

  // Use Redis transaction for atomicity
  const pipeline = redis.pipeline();

  // Remove old entries outside the window
  pipeline.zremrangebyscore(key, 0, windowStart);

  // Count requests in current window
  pipeline.zcard(key);

  // Add current request with timestamp as score
  pipeline.zadd(key, now, `${now}-${Math.random().toString(36).substring(7)}`);

  // Set key expiration to window duration
  pipeline.pexpire(key, limits.windowMs);

  const results = await pipeline.exec();

  if (!results) {
    // Redis error, fail open (allow request)
    logger.warn('Rate limiter: Redis pipeline returned null');
    return {
      allowed: true,
      remaining: limits.maxRequests,
      resetAt: now + limits.windowMs,
      total: limits.maxRequests,
    };
  }

  // zcard result is at index 1 (after zremrangebyscore)
  const [, zcardResult] = results;
  const currentCount = (zcardResult?.[1] as number) || 0;

  const allowed = currentCount < limits.maxRequests;
  const remaining = Math.max(0, limits.maxRequests - currentCount - 1);
  const resetAt = now + limits.windowMs;

  return {
    allowed,
    remaining,
    resetAt,
    total: limits.maxRequests,
  };
}

/**
 * Rate limiting middleware factory
 * Supports skip patterns and custom tier override
 */
export function rateLimiter(options?: {
  skip?: (ctx: Context) => boolean;
  tierOverride?: RateLimitTier;
}) {
  return async function rateLimiterMiddleware(ctx: Context, next: Next): Promise<void> {
    // Skip rate limiting for certain paths (e.g., health checks)
    if (options?.skip?.(ctx)) {
      return next();
    }

    const tier = options?.tierOverride || determineTier(ctx);
    const limits = RATE_LIMITS[tier] || RATE_LIMITS.b2c;
    const key = getRateLimitKey(ctx, tier);

    const result = await checkRateLimit(key, limits);

    // Set rate limit headers
    ctx.set('X-RateLimit-Limit', String(result.total));
    ctx.set('X-RateLimit-Remaining', String(result.remaining));
    ctx.set('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));
    ctx.set('X-RateLimit-Tier', tier);

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
      ctx.set('Retry-After', String(retryAfter));

      logger.warn(
        { key, tier, ip: ctx.ip, path: ctx.path, retryAfter },
        'Rate limit exceeded'
      );

      throw new AppError('Too many requests. Please try again later.', 429, 'RATE_LIMIT_EXCEEDED');
    }

    await next();
  };
}

/**
 * Specific rate limiter for auth endpoints
 */
export const authRateLimiter = rateLimiter({
  tierOverride: 'auth',
});

/**
 * Default rate limiter that auto-detects tier
 */
export const defaultRateLimiter = rateLimiter({
  skip: (ctx) => {
    // Skip health checks and metrics
    return ctx.path === '/health' || ctx.path === '/health/ready' || ctx.path === '/metrics';
  },
});
