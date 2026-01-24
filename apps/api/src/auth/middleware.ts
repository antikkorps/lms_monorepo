import type { Context, Next } from 'koa';
import { verifyAccessToken, type AccessTokenPayload } from './jwt.js';
import { isTokenBlacklisted } from './session.js';
import { AppError } from '../utils/app-error.js';
import { UserRole } from '../database/models/enums.js';
import { User } from '../database/models/User.js';
import { Tenant } from '../database/models/Tenant.js';
import { logger } from '../utils/logger.js';

// Extend Koa context state with auth info
declare module 'koa' {
  interface DefaultState {
    user?: AccessTokenPayload & { fullUser?: User };
    tenant?: Tenant;
  }
}

/**
 * Extract token from Authorization header or cookie
 */
function extractToken(ctx: Context): string | null {
  // Try Authorization header first (Bearer token)
  const authHeader = ctx.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Try HTTP-only cookie
  const cookieToken = ctx.cookies.get('access_token');
  if (cookieToken) {
    return cookieToken;
  }

  return null;
}

/**
 * Authentication middleware
 * Verifies JWT and populates ctx.state.user
 */
export async function authenticate(ctx: Context, next: Next): Promise<void> {
  const token = extractToken(ctx);

  // Debug logging for auth issues
  logger.debug({
    path: ctx.path,
    hasToken: !!token,
    hasCookieHeader: !!ctx.headers.cookie,
    cookieHeader: ctx.headers.cookie?.substring(0, 100) + '...',
  }, 'Auth middleware: extracting token');

  if (!token) {
    logger.warn({ path: ctx.path, headers: Object.keys(ctx.headers) }, 'Auth middleware: no token found');
    throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
  }

  try {
    logger.debug({ path: ctx.path }, 'Auth middleware: verifying token...');
    const payload = verifyAccessToken(token);
    logger.debug({ path: ctx.path, userId: payload.userId, role: payload.role }, 'Auth middleware: token verified');

    // Check if token is blacklisted
    const blacklisted = await isTokenBlacklisted(payload.userId);
    logger.debug({ path: ctx.path, blacklisted }, 'Auth middleware: blacklist check');
    if (blacklisted) {
      throw new AppError('Token has been revoked', 401, 'TOKEN_REVOKED');
    }

    // Attach user info to context
    ctx.state.user = payload;

    // If user has tenant, load tenant info for rate limiting and feature checks
    if (payload.tenantId) {
      const tenant = await Tenant.findByPk(payload.tenantId);
      if (tenant) {
        ctx.state.tenant = tenant;
      }
    }

    logger.debug({ path: ctx.path }, 'Auth middleware: calling next()');
    await next();
  } catch (error) {
    logger.warn({ path: ctx.path, error: (error as Error).message, errorName: (error as Error).name }, 'Auth middleware: error');
    if (error instanceof AppError) {
      throw error;
    }

    // JWT verification errors
    const err = error as Error;
    if (err.name === 'TokenExpiredError') {
      throw new AppError('Token has expired', 401, 'TOKEN_EXPIRED');
    }
    if (err.name === 'JsonWebTokenError') {
      throw new AppError('Invalid token', 401, 'TOKEN_INVALID');
    }

    throw new AppError('Authentication failed', 401, 'AUTH_FAILED');
  }
}

/**
 * Optional authentication middleware
 * Populates ctx.state.user if token is present, but doesn't require it
 */
export async function optionalAuthenticate(
  ctx: Context,
  next: Next
): Promise<void> {
  const token = extractToken(ctx);

  if (token) {
    try {
      const payload = verifyAccessToken(token);
      const blacklisted = await isTokenBlacklisted(payload.userId);

      if (!blacklisted) {
        ctx.state.user = payload;

        if (payload.tenantId) {
          const tenant = await Tenant.findByPk(payload.tenantId);
          if (tenant) {
            ctx.state.tenant = tenant;
          }
        }
      }
    } catch {
      // Ignore token errors in optional auth
    }
  }

  await next();
}

/**
 * Role-based access control middleware factory
 * Requires authentication and checks if user has required role
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return async function roleMiddleware(ctx: Context, next: Next): Promise<void> {
    // First ensure user is authenticated
    if (!ctx.state.user) {
      throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
    }

    const userRole = ctx.state.user.role;

    // SuperAdmin has access to everything
    if (userRole === UserRole.SUPER_ADMIN) {
      return next();
    }

    // Check if user's role is in allowed roles
    if (!allowedRoles.includes(userRole)) {
      throw new AppError(
        'Insufficient permissions',
        403,
        'FORBIDDEN',
        { requiredRoles: allowedRoles, userRole }
      );
    }

    await next();
  };
}

/**
 * Require user to belong to a tenant (B2B only)
 */
export async function requireTenant(ctx: Context, next: Next): Promise<void> {
  if (!ctx.state.user) {
    throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
  }

  if (!ctx.state.user.tenantId) {
    throw new AppError(
      'This resource requires tenant membership',
      403,
      'TENANT_REQUIRED'
    );
  }

  await next();
}

/**
 * Require user to be a SuperAdmin
 */
export async function requireSuperAdmin(ctx: Context, next: Next): Promise<void> {
  if (!ctx.state.user) {
    throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
  }

  if (ctx.state.user.role !== UserRole.SUPER_ADMIN) {
    throw new AppError('SuperAdmin access required', 403, 'SUPER_ADMIN_REQUIRED');
  }

  await next();
}

/**
 * Load full user model if needed
 * Use this sparingly as it adds a database query
 */
export async function loadFullUser(ctx: Context, next: Next): Promise<void> {
  if (!ctx.state.user) {
    throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
  }

  const user = await User.findByPk(ctx.state.user.userId);
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  if (user.status !== 'active') {
    throw new AppError('User account is not active', 403, 'USER_INACTIVE');
  }

  ctx.state.user.fullUser = user;
  await next();
}
