/**
 * Course Access Utility
 * Centralized access control logic for courses
 */

import { Course, Purchase, Lesson, Chapter, Tenant, TenantCourseLicense, TenantCourseLicenseAssignment } from '../database/models/index.js';
import { PurchaseStatus, UserRole, TenantStatus, SubscriptionStatus, LicenseType } from '../database/models/enums.js';

export type AccessType = 'purchase' | 'tenant' | 'free' | 'instructor' | 'admin';

export interface CourseAccessResult {
  hasAccess: boolean;
  accessType?: AccessType;
  reason?: string;
}

export interface TenantAccessResult {
  hasAccess: boolean;
  reason?: string;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: UserRole;
  tenantId?: string | null;
}

/**
 * Check if a user has access to a specific course
 * Logic order:
 * 1. SuperAdmin → access (admin)
 * 2. Instructor of the course → access (instructor)
 * 3. Free course → access (free)
 * 4. B2B: Tenant subscription active and seats available → access (tenant)
 * 5. B2C: At least one COMPLETED purchase exists → access (purchase)
 */
export async function checkCourseAccess(
  user: AuthenticatedUser | undefined,
  courseId: string
): Promise<CourseAccessResult> {
  // Get the course
  const course = await Course.findByPk(courseId);
  if (!course) {
    return { hasAccess: false, reason: 'Course not found' };
  }

  // 1. SuperAdmin has access to everything
  if (user?.role === UserRole.SUPER_ADMIN) {
    return { hasAccess: true, accessType: 'admin' };
  }

  // 2. Instructor of the course has access
  if (user && course.instructorId === user.userId) {
    return { hasAccess: true, accessType: 'instructor' };
  }

  // 3. Free course - everyone has access (if authenticated)
  if (course.isFree) {
    if (!user) {
      return { hasAccess: false, reason: 'Authentication required for free course access' };
    }
    return { hasAccess: true, accessType: 'free' };
  }

  // At this point, user must be authenticated
  if (!user) {
    return { hasAccess: false, reason: 'Authentication required' };
  }

  // 4. B2B: Check tenant course license
  if (user.tenantId) {
    const tenantAccess = await checkTenantCourseAccess(user.tenantId, user.userId, courseId);
    if (tenantAccess.hasAccess) {
      return { hasAccess: true, accessType: 'tenant' };
    }
    // Don't return failure yet - user might also have B2C purchase
  }

  // 5. B2C: Check for a COMPLETED purchase
  // A user can have multiple purchases (e.g., one REFUNDED, one COMPLETED)
  // Access is granted if at least one is COMPLETED
  const completedPurchase = await Purchase.findOne({
    where: {
      userId: user.userId,
      courseId,
      status: PurchaseStatus.COMPLETED,
    },
  });

  if (completedPurchase) {
    return { hasAccess: true, accessType: 'purchase' };
  }

  // No access
  return {
    hasAccess: false,
    reason: 'No active purchase or subscription found for this course',
  };
}

/**
 * Check if a user has access to a course via their tenant
 * This checks for:
 * 1. Active tenant subscription (seats)
 * 2. Active course license (unlimited or assigned seat)
 */
export async function checkTenantCourseAccess(
  tenantId: string,
  userId: string,
  courseId: string
): Promise<TenantAccessResult> {
  const tenant = await Tenant.findByPk(tenantId);

  if (!tenant) {
    return { hasAccess: false, reason: 'Tenant not found' };
  }

  // Check tenant status
  if (tenant.status !== TenantStatus.ACTIVE && tenant.status !== TenantStatus.TRIAL) {
    return {
      hasAccess: false,
      reason: `Tenant subscription is ${tenant.status}`,
    };
  }

  // Check subscription status (tenant must have an active subscription)
  if (
    tenant.subscriptionStatus !== SubscriptionStatus.ACTIVE &&
    tenant.subscriptionStatus !== SubscriptionStatus.TRIALING
  ) {
    return {
      hasAccess: false,
      reason: `Subscription status is ${tenant.subscriptionStatus}`,
    };
  }

  // Check seats (user must be within seat allocation)
  if (tenant.seatsUsed > tenant.seatsPurchased) {
    return {
      hasAccess: false,
      reason: 'No available seats in tenant subscription',
    };
  }

  // Check for course license
  const license = await TenantCourseLicense.findOne({
    where: {
      tenantId,
      courseId,
      status: PurchaseStatus.COMPLETED,
    },
  });

  if (!license) {
    return {
      hasAccess: false,
      reason: 'No active license for this course',
    };
  }

  // Unlimited license: all tenant members have access
  if (license.licenseType === LicenseType.UNLIMITED) {
    return { hasAccess: true };
  }

  // Seats license: check if user is assigned
  const assignment = await TenantCourseLicenseAssignment.findOne({
    where: {
      licenseId: license.id,
      userId,
    },
  });

  if (!assignment) {
    return {
      hasAccess: false,
      reason: 'User is not assigned to this course license',
    };
  }

  return { hasAccess: true };
}

/**
 * Check if a user has access via their tenant subscription (legacy - for backward compatibility)
 * @deprecated Use checkTenantCourseAccess instead
 */
export async function checkTenantAccess(
  tenantId: string,
  _userId: string
): Promise<TenantAccessResult> {
  const tenant = await Tenant.findByPk(tenantId);

  if (!tenant) {
    return { hasAccess: false, reason: 'Tenant not found' };
  }

  // Check tenant status
  if (tenant.status !== TenantStatus.ACTIVE && tenant.status !== TenantStatus.TRIAL) {
    return {
      hasAccess: false,
      reason: `Tenant subscription is ${tenant.status}`,
    };
  }

  // Check subscription status
  if (
    tenant.subscriptionStatus !== SubscriptionStatus.ACTIVE &&
    tenant.subscriptionStatus !== SubscriptionStatus.TRIALING
  ) {
    return {
      hasAccess: false,
      reason: `Subscription status is ${tenant.subscriptionStatus}`,
    };
  }

  // Check seats
  if (tenant.seatsUsed > tenant.seatsPurchased) {
    return {
      hasAccess: false,
      reason: 'No available seats in tenant subscription',
    };
  }

  return { hasAccess: true };
}

/**
 * Check course access from a lesson ID
 * Useful when you have a lessonId but need to verify course access
 */
export async function checkCourseAccessFromLesson(
  user: AuthenticatedUser | undefined,
  lessonId: string
): Promise<CourseAccessResult & { courseId?: string }> {
  const lesson = await Lesson.findByPk(lessonId, {
    include: [
      {
        model: Chapter,
        as: 'chapter',
        include: [{ model: Course, as: 'course' }],
      },
    ],
  });

  if (!lesson) {
    return { hasAccess: false, reason: 'Lesson not found' };
  }

  const course = lesson.chapter?.course;
  if (!course) {
    return { hasAccess: false, reason: 'Course not found' };
  }

  // If lesson is free, grant access
  if (lesson.isFree) {
    return { hasAccess: true, accessType: 'free', courseId: course.id };
  }

  const accessResult = await checkCourseAccess(user, course.id);
  return { ...accessResult, courseId: course.id };
}

/**
 * Check if a user can edit a course (for instructor/admin operations)
 */
export function canEditCourse(user: AuthenticatedUser, course: Course): boolean {
  return (
    user.role === UserRole.SUPER_ADMIN ||
    user.role === UserRole.TENANT_ADMIN ||
    course.instructorId === user.userId
  );
}
