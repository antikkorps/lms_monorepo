import type { Context } from 'koa';
import { User } from '../database/models/User.js';
import { Tenant } from '../database/models/Tenant.js';
import { UserRole, UserStatus } from '../database/models/enums.js';
import { hashPassword, verifyPassword, validatePasswordStrength } from './password.js';
import {
  generateTokenPair,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from './jwt.js';
import {
  storeRefreshTokenFamily,
  invalidateRefreshTokenFamily,
  invalidateAllUserSessions,
  detectTokenReuse,
  getRefreshTokenFamily,
} from './session.js';
import { AppError } from '../utils/app-error.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

// Cookie options for tokens
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.cookieSecure,
  sameSite: 'lax' as const,
  domain: config.cookieDomain,
};

/**
 * Set auth cookies on the response
 */
function setAuthCookies(
  ctx: Context,
  accessToken: string,
  refreshToken: string
): void {
  // Access token: short-lived
  ctx.cookies.set('access_token', accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  // Refresh token: long-lived
  ctx.cookies.set('refresh_token', refreshToken, {
    ...COOKIE_OPTIONS,
    path: '/api/v1/auth/refresh', // Only sent to refresh endpoint
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

/**
 * Clear auth cookies
 */
function clearAuthCookies(ctx: Context): void {
  ctx.cookies.set('access_token', '', { ...COOKIE_OPTIONS, maxAge: 0 });
  ctx.cookies.set('refresh_token', '', {
    ...COOKIE_OPTIONS,
    path: '/api/v1/auth/refresh',
    maxAge: 0,
  });
}

/**
 * Register a new user
 * POST /auth/register
 */
export async function register(ctx: Context): Promise<void> {
  const { email, password, firstName, lastName, tenantSlug } = ctx.request.body as {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    tenantSlug?: string;
  };

  // Validate required fields
  if (!email || !password || !firstName || !lastName) {
    throw new AppError('Missing required fields', 400, 'VALIDATION_ERROR');
  }

  // Validate password strength
  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.valid) {
    throw new AppError('Password does not meet requirements', 400, 'WEAK_PASSWORD', {
      errors: passwordValidation.errors,
    });
  }

  // Check if user already exists
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');
  }

  // If tenant slug provided, validate and link user to tenant
  let tenantId: string | null = null;
  if (tenantSlug) {
    const tenant = await Tenant.findOne({ where: { slug: tenantSlug } });
    if (!tenant) {
      throw new AppError('Invalid tenant', 400, 'INVALID_TENANT');
    }

    // Check seat availability
    if (tenant.seatsUsed >= tenant.seatsPurchased) {
      throw new AppError('No available seats in this organization', 403, 'NO_SEATS_AVAILABLE');
    }

    tenantId = tenant.id;
  }

  // Hash password and create user
  const passwordHash = await hashPassword(password);
  const user = await User.create({
    email,
    passwordHash,
    firstName,
    lastName,
    role: tenantId ? UserRole.LEARNER : UserRole.LEARNER,
    status: UserStatus.ACTIVE, // In production, you might want PENDING for email verification
    tenantId,
  });

  // Update tenant seat count if B2B
  if (tenantId) {
    await Tenant.increment('seatsUsed', { where: { id: tenantId } });
  }

  // Generate tokens
  const { accessToken, refreshToken, tokenFamily } = generateTokenPair({
    id: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
  });

  // Store refresh token family
  await storeRefreshTokenFamily(user.id, tokenFamily, refreshToken);

  // Set cookies
  setAuthCookies(ctx, accessToken, refreshToken);

  logger.info({ userId: user.id, email: user.email }, 'User registered');

  ctx.status = 201;
  ctx.body = {
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
      },
      accessToken, // Also return in body for non-cookie clients
    },
  };
}

/**
 * Login with email and password
 * POST /auth/login
 */
export async function login(ctx: Context): Promise<void> {
  const { email, password } = ctx.request.body as {
    email: string;
    password: string;
  };

  if (!email || !password) {
    throw new AppError('Email and password are required', 400, 'VALIDATION_ERROR');
  }

  // Find user
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  // Check password
  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  // Check user status
  if (user.status !== UserStatus.ACTIVE) {
    throw new AppError('Account is not active', 403, 'ACCOUNT_INACTIVE', {
      status: user.status,
    });
  }

  // Generate tokens
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

  // Set cookies
  setAuthCookies(ctx, accessToken, refreshToken);

  logger.info({ userId: user.id, email: user.email }, 'User logged in');

  ctx.body = {
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
      },
      accessToken,
    },
  };
}

/**
 * Refresh access token using refresh token
 * POST /auth/refresh
 */
export async function refresh(ctx: Context): Promise<void> {
  // Get refresh token from cookie or body
  const refreshTokenInput =
    ctx.cookies.get('refresh_token') ||
    (ctx.request.body as { refreshToken?: string })?.refreshToken;

  if (!refreshTokenInput) {
    throw new AppError('Refresh token required', 401, 'REFRESH_TOKEN_REQUIRED');
  }

  try {
    // Verify refresh token
    const payload = verifyRefreshToken(refreshTokenInput);

    // Check for token reuse (potential theft)
    const isReuse = await detectTokenReuse(payload.tokenFamily, refreshTokenInput);
    if (isReuse) {
      // Token reuse detected - invalidate all sessions for this user
      logger.warn(
        { userId: payload.userId, tokenFamily: payload.tokenFamily },
        'Refresh token reuse detected - potential theft'
      );
      await invalidateAllUserSessions(payload.userId);
      throw new AppError('Token reuse detected. All sessions invalidated.', 401, 'TOKEN_REUSE');
    }

    // Get token family data
    const familyData = await getRefreshTokenFamily(payload.tokenFamily);
    if (!familyData) {
      throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }

    // Get user
    const user = await User.findByPk(payload.userId);
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new AppError('User not found or inactive', 401, 'USER_INVALID');
    }

    // Rotate refresh token (generate new one with same family)
    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    });

    const newRefreshToken = generateRefreshToken(user.id, payload.tokenFamily);

    // Update stored refresh token
    await storeRefreshTokenFamily(user.id, payload.tokenFamily, newRefreshToken);

    // Set new cookies
    setAuthCookies(ctx, newAccessToken, newRefreshToken);

    ctx.body = {
      success: true,
      data: {
        accessToken: newAccessToken,
      },
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    const err = error as Error;
    if (err.name === 'TokenExpiredError') {
      throw new AppError('Refresh token has expired', 401, 'REFRESH_TOKEN_EXPIRED');
    }

    throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }
}

/**
 * Logout - invalidate current session
 * POST /auth/logout
 */
export async function logout(ctx: Context): Promise<void> {
  const refreshTokenInput = ctx.cookies.get('refresh_token');

  if (refreshTokenInput) {
    try {
      const payload = verifyRefreshToken(refreshTokenInput);
      await invalidateRefreshTokenFamily(payload.tokenFamily);
    } catch {
      // Ignore errors - just clear cookies
    }
  }

  clearAuthCookies(ctx);

  logger.info({ userId: ctx.state.user?.userId }, 'User logged out');

  ctx.body = {
    success: true,
    data: {
      message: 'Logged out successfully',
    },
  };
}

/**
 * Logout from all devices
 * POST /auth/logout-all
 */
export async function logoutAll(ctx: Context): Promise<void> {
  const userId = ctx.state.user?.userId;

  if (!userId) {
    throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
  }

  await invalidateAllUserSessions(userId);
  clearAuthCookies(ctx);

  logger.info({ userId }, 'User logged out from all devices');

  ctx.body = {
    success: true,
    data: {
      message: 'Logged out from all devices',
    },
  };
}

/**
 * Get current user info
 * GET /auth/me
 */
export async function me(ctx: Context): Promise<void> {
  const userId = ctx.state.user?.userId;

  if (!userId) {
    throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
  }

  const user = await User.findByPk(userId, {
    attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'status', 'tenantId', 'avatarUrl', 'lastLoginAt', 'createdAt'],
  });

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  let tenant = null;
  if (user.tenantId) {
    tenant = await Tenant.findByPk(user.tenantId, {
      attributes: ['id', 'name', 'slug', 'logoUrl'],
    });
  }

  ctx.body = {
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        tenantId: user.tenantId,
        avatarUrl: user.avatarUrl,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      },
      tenant,
    },
  };
}

/**
 * Change password
 * POST /auth/change-password
 */
export async function changePassword(ctx: Context): Promise<void> {
  const userId = ctx.state.user?.userId;
  const { currentPassword, newPassword } = ctx.request.body as {
    currentPassword: string;
    newPassword: string;
  };

  if (!userId) {
    throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
  }

  if (!currentPassword || !newPassword) {
    throw new AppError('Current and new passwords are required', 400, 'VALIDATION_ERROR');
  }

  // Validate new password strength
  const passwordValidation = validatePasswordStrength(newPassword);
  if (!passwordValidation.valid) {
    throw new AppError('New password does not meet requirements', 400, 'WEAK_PASSWORD', {
      errors: passwordValidation.errors,
    });
  }

  const user = await User.findByPk(userId);
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Verify current password
  const isValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isValid) {
    throw new AppError('Current password is incorrect', 401, 'INVALID_PASSWORD');
  }

  // Hash and update new password
  const newPasswordHash = await hashPassword(newPassword);
  await user.update({ passwordHash: newPasswordHash });

  // Invalidate all other sessions (security measure)
  await invalidateAllUserSessions(userId);

  // Generate new tokens for current session
  const { accessToken, refreshToken, tokenFamily } = generateTokenPair({
    id: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
  });

  await storeRefreshTokenFamily(user.id, tokenFamily, refreshToken);
  setAuthCookies(ctx, accessToken, refreshToken);

  logger.info({ userId }, 'Password changed');

  ctx.body = {
    success: true,
    data: {
      message: 'Password changed successfully',
      accessToken,
    },
  };
}
