/**
 * Course Access Middleware
 * Middleware functions for protecting course-related routes
 */

import type { Context, Next } from 'koa';
import { AppError } from '../utils/app-error.js';
import {
  checkCourseAccess,
  checkCourseAccessFromLesson,
  checkTenantAccess,
  type AuthenticatedUser,
} from '../utils/course-access.js';
import { TenantStatus, SubscriptionStatus } from '../database/models/enums.js';
import { Tenant } from '../database/models/Tenant.js';

/**
 * Middleware to require course access for routes with :courseId parameter
 * Usage: router.get('/courses/:courseId/content', authenticate, requireCourseAccess, handler)
 */
export function requireCourseAccessMiddleware() {
  return async function courseAccessMiddleware(
    ctx: Context,
    next: Next
  ): Promise<void> {
    const user = ctx.state.user as AuthenticatedUser | undefined;
    const { courseId } = ctx.params;

    if (!courseId) {
      throw new AppError('Course ID is required', 400, 'MISSING_COURSE_ID');
    }

    const accessResult = await checkCourseAccess(user, courseId);

    if (!accessResult.hasAccess) {
      throw new AppError(
        accessResult.reason || 'Access denied to this course',
        403,
        'COURSE_ACCESS_DENIED'
      );
    }

    // Attach access info to context for downstream handlers
    ctx.state.courseAccess = {
      hasAccess: true,
      accessType: accessResult.accessType,
    };

    await next();
  };
}

/**
 * Middleware to require lesson access for routes with :lessonId parameter
 * Also checks course access through the lesson's course
 * Usage: router.get('/lessons/:lessonId', authenticate, requireLessonAccess, handler)
 */
export function requireLessonAccessMiddleware() {
  return async function lessonAccessMiddleware(
    ctx: Context,
    next: Next
  ): Promise<void> {
    const user = ctx.state.user as AuthenticatedUser | undefined;
    const { lessonId } = ctx.params;

    if (!lessonId) {
      throw new AppError('Lesson ID is required', 400, 'MISSING_LESSON_ID');
    }

    const accessResult = await checkCourseAccessFromLesson(user, lessonId);

    if (!accessResult.hasAccess) {
      throw new AppError(
        accessResult.reason || 'Access denied to this lesson',
        403,
        'LESSON_ACCESS_DENIED'
      );
    }

    // Attach access info to context for downstream handlers
    ctx.state.courseAccess = {
      hasAccess: true,
      accessType: accessResult.accessType,
      courseId: accessResult.courseId,
    };

    await next();
  };
}

/**
 * Middleware to require an active tenant subscription (B2B routes)
 * Checks that the user's tenant has an active subscription
 * Usage: router.get('/tenant/dashboard', authenticate, requireActiveTenant, handler)
 */
export function requireActiveTenantMiddleware() {
  return async function activeTenantMiddleware(
    ctx: Context,
    next: Next
  ): Promise<void> {
    const user = ctx.state.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
    }

    if (!user.tenantId) {
      throw new AppError(
        'This resource requires tenant membership',
        403,
        'TENANT_REQUIRED'
      );
    }

    const tenantAccess = await checkTenantAccess(user.tenantId, user.userId);

    if (!tenantAccess.hasAccess) {
      throw new AppError(
        tenantAccess.reason || 'Tenant subscription is not active',
        403,
        'TENANT_INACTIVE'
      );
    }

    await next();
  };
}

/**
 * Middleware to check tenant status and attach tenant info to context
 * Doesn't block access but attaches status for handlers to use
 * Usage: router.get('/tenant/info', authenticate, loadTenantStatus, handler)
 */
export function loadTenantStatusMiddleware() {
  return async function loadTenantStatus(
    ctx: Context,
    next: Next
  ): Promise<void> {
    const user = ctx.state.user as AuthenticatedUser | undefined;

    if (user?.tenantId) {
      const tenant = await Tenant.findByPk(user.tenantId);
      if (tenant) {
        ctx.state.tenantStatus = {
          status: tenant.status,
          subscriptionStatus: tenant.subscriptionStatus,
          isActive:
            (tenant.status === TenantStatus.ACTIVE ||
              tenant.status === TenantStatus.TRIAL) &&
            (tenant.subscriptionStatus === SubscriptionStatus.ACTIVE ||
              tenant.subscriptionStatus === SubscriptionStatus.TRIALING),
          seatsAvailable: tenant.seatsPurchased - tenant.seatsUsed,
        };
      }
    }

    await next();
  };
}
