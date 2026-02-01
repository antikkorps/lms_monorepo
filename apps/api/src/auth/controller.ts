import type { Context } from 'koa';
import { User } from '../database/models/User.js';
import { Tenant } from '../database/models/Tenant.js';
import { UserRole, UserStatus, SupportedLocale } from '../database/models/enums.js';
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
  generatePasswordResetToken,
  storePasswordResetToken,
  getPasswordResetToken,
  deletePasswordResetToken,
  generateEmailVerificationToken,
  storeEmailVerificationToken,
  getEmailVerificationToken,
  deleteEmailVerificationToken,
} from './session.js';
import { AppError } from '../utils/app-error.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { emailService } from '../services/email/index.js';
import { parseLocaleFromRequest } from '../utils/locale.js';

// Cookie options for tokens
const COOKIE_OPTIONS: {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  domain?: string;
  path?: string;
} = {
  httpOnly: true,
  secure: config.cookieSecure,
  sameSite: 'lax',
  path: '/',
};

// Only add domain if explicitly set (undefined domain can cause issues)
if (config.cookieDomain) {
  COOKIE_OPTIONS.domain = config.cookieDomain;
}

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
    status: UserStatus.PENDING, // Requires email verification
    tenantId,
  });

  // Update tenant seat count if B2B
  if (tenantId) {
    await Tenant.increment('seatsUsed', { where: { id: tenantId } });
  }

  // Generate email verification token
  const verificationToken = generateEmailVerificationToken();
  await storeEmailVerificationToken(user.id, user.email, verificationToken);

  // Build verification URL
  const verificationUrl = `${config.frontendUrl}/verify-email?token=${verificationToken}`;

  // Get locale from request header for email
  const locale = parseLocaleFromRequest(ctx.get('Accept-Language'));

  // Send verification email
  await emailService.sendVerificationEmail({
    to: user.email,
    firstName: user.firstName,
    verificationUrl,
    locale,
  });

  ctx.status = 201;
  ctx.body = {
    success: true,
    data: {
      message: 'Registration successful. Please check your email to verify your account.',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        tenantId: user.tenantId,
      },
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
  if (user.status === UserStatus.PENDING) {
    throw new AppError('Please verify your email address before logging in', 403, 'EMAIL_NOT_VERIFIED');
  }
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
    attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'status', 'tenantId', 'avatarUrl', 'locale', 'lastLoginAt', 'createdAt'],
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
        locale: user.locale,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      },
      tenant,
    },
  };
}

/**
 * Update user locale preference
 * PATCH /auth/me/locale
 */
export async function updateLocale(ctx: Context): Promise<void> {
  const userId = ctx.state.user?.userId;
  const { locale } = ctx.request.body as { locale: string };

  if (!userId) {
    throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
  }

  if (!locale) {
    throw new AppError('Locale is required', 400, 'VALIDATION_ERROR');
  }

  // Validate locale is a supported value
  const supportedLocales = Object.values(SupportedLocale);
  if (!supportedLocales.includes(locale as SupportedLocale)) {
    throw new AppError(`Invalid locale. Supported: ${supportedLocales.join(', ')}`, 400, 'INVALID_LOCALE');
  }

  const user = await User.findByPk(userId);
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  await user.update({ locale: locale as SupportedLocale });

  logger.info({ userId, locale }, 'User locale updated');

  ctx.body = {
    success: true,
    data: {
      locale: user.locale,
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

/**
 * Request password reset (forgot password)
 * POST /auth/forgot-password
 */
export async function forgotPassword(ctx: Context): Promise<void> {
  const { email } = ctx.request.body as { email: string };

  if (!email) {
    throw new AppError('Email is required', 400, 'VALIDATION_ERROR');
  }

  // Always return success to prevent email enumeration
  const successResponse = {
    success: true,
    data: {
      message: 'If an account exists with this email, a password reset link has been sent.',
    },
  };

  // Find user by email
  const user = await User.findOne({ where: { email } });
  if (!user) {
    // Don't reveal that the user doesn't exist
    ctx.body = successResponse;
    return;
  }

  // Check if user is active
  if (user.status !== UserStatus.ACTIVE) {
    ctx.body = successResponse;
    return;
  }

  // Generate reset token
  const resetToken = generatePasswordResetToken();

  // Store token in Redis
  await storePasswordResetToken(user.id, user.email, resetToken);

  // Build reset URL
  const resetUrl = `${config.frontendUrl || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

  // Send password reset email (use user's stored locale preference)
  await emailService.sendPasswordResetEmail({
    to: user.email,
    firstName: user.firstName,
    resetUrl,
    locale: user.locale,
  });

  ctx.body = successResponse;
}

/**
 * Reset password with token
 * POST /auth/reset-password
 */
export async function resetPassword(ctx: Context): Promise<void> {
  const { token, newPassword } = ctx.request.body as {
    token: string;
    newPassword: string;
  };

  if (!token || !newPassword) {
    throw new AppError('Token and new password are required', 400, 'VALIDATION_ERROR');
  }

  // Validate password strength
  const passwordValidation = validatePasswordStrength(newPassword);
  if (!passwordValidation.valid) {
    throw new AppError('Password does not meet requirements', 400, 'WEAK_PASSWORD', {
      errors: passwordValidation.errors,
    });
  }

  // Verify reset token
  const tokenData = await getPasswordResetToken(token);
  if (!tokenData) {
    throw new AppError('Invalid or expired reset token', 400, 'INVALID_RESET_TOKEN');
  }

  // Find user
  const user = await User.findByPk(tokenData.userId);
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Check user status
  if (user.status !== UserStatus.ACTIVE) {
    throw new AppError('Account is not active', 403, 'ACCOUNT_INACTIVE');
  }

  // Hash and update password
  const passwordHash = await hashPassword(newPassword);
  await user.update({ passwordHash });

  // Delete the reset token (one-time use)
  await deletePasswordResetToken(token);

  // Invalidate all existing sessions for security
  await invalidateAllUserSessions(user.id);

  logger.info({ userId: user.id, email: user.email }, 'Password reset successfully');

  ctx.body = {
    success: true,
    data: {
      message: 'Password has been reset successfully. Please log in with your new password.',
    },
  };
}

/**
 * Verify email address with token
 * POST /auth/verify-email
 */
export async function verifyEmail(ctx: Context): Promise<void> {
  const { token } = ctx.request.body as { token: string };

  if (!token) {
    throw new AppError('Verification token is required', 400, 'VALIDATION_ERROR');
  }

  // Verify token
  const tokenData = await getEmailVerificationToken(token);
  if (!tokenData) {
    throw new AppError('Invalid or expired verification token', 400, 'INVALID_VERIFICATION_TOKEN');
  }

  // Find user
  const user = await User.findByPk(tokenData.userId);
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Check if already verified
  if (user.status === UserStatus.ACTIVE) {
    // Delete token and return success
    await deleteEmailVerificationToken(token);
    ctx.body = {
      success: true,
      data: {
        message: 'Email already verified. You can log in.',
      },
    };
    return;
  }

  // Check if user is in PENDING status
  if (user.status !== UserStatus.PENDING) {
    throw new AppError('Account cannot be verified', 403, 'ACCOUNT_INACTIVE', {
      status: user.status,
    });
  }

  // Activate user
  await user.update({ status: UserStatus.ACTIVE });

  // Delete the verification token (one-time use)
  await deleteEmailVerificationToken(token);

  logger.info({ userId: user.id, email: user.email }, 'Email verified successfully');

  // Generate tokens for automatic login after verification
  const { accessToken, refreshToken, tokenFamily } = generateTokenPair({
    id: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
  });

  await storeRefreshTokenFamily(user.id, tokenFamily, refreshToken);
  setAuthCookies(ctx, accessToken, refreshToken);

  ctx.body = {
    success: true,
    data: {
      message: 'Email verified successfully. You are now logged in.',
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
 * Resend email verification
 * POST /auth/resend-verification
 */
export async function resendVerification(ctx: Context): Promise<void> {
  const { email } = ctx.request.body as { email: string };

  if (!email) {
    throw new AppError('Email is required', 400, 'VALIDATION_ERROR');
  }

  // Always return success to prevent email enumeration
  const successResponse = {
    success: true,
    data: {
      message: 'If an account exists with this email and requires verification, a new link has been sent.',
    },
  };

  // Find user by email
  const user = await User.findOne({ where: { email } });
  if (!user) {
    ctx.body = successResponse;
    return;
  }

  // Only send if user is PENDING
  if (user.status !== UserStatus.PENDING) {
    ctx.body = successResponse;
    return;
  }

  // Generate new verification token
  const verificationToken = generateEmailVerificationToken();
  await storeEmailVerificationToken(user.id, user.email, verificationToken);

  // Build verification URL
  const verificationUrl = `${config.frontendUrl}/verify-email?token=${verificationToken}`;

  // Send verification email (use user's stored locale preference)
  await emailService.sendVerificationEmail({
    to: user.email,
    firstName: user.firstName,
    verificationUrl,
    locale: user.locale,
  });

  ctx.body = successResponse;
}
