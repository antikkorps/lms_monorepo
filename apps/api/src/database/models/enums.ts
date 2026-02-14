/**
 * Database Enums
 * Must match PostgreSQL enum types defined in init.sql
 */

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  TENANT_ADMIN = 'tenant_admin',
  MANAGER = 'manager',
  INSTRUCTOR = 'instructor',
  LEARNER = 'learner',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

export enum TenantStatus {
  ACTIVE = 'active',
  TRIAL = 'trial',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELLED = 'cancelled',
  TRIALING = 'trialing',
}

export enum IsolationStrategy {
  SHARED = 'SHARED',
  ISOLATED = 'ISOLATED',
  DEDICATED = 'DEDICATED',
}

export enum CourseStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum Currency {
  EUR = 'EUR',
  USD = 'USD',
}

export enum LessonType {
  VIDEO = 'video',
  QUIZ = 'quiz',
  DOCUMENT = 'document',
  ASSIGNMENT = 'assignment',
}

export enum QuizQuestionType {
  SINGLE_CHOICE = 'single_choice',
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
}

export enum PurchaseStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  REFUNDED = 'refunded',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

export enum ReportReason {
  SPAM = 'spam',
  INAPPROPRIATE = 'inappropriate',
  HARASSMENT = 'harassment',
  OFF_TOPIC = 'off_topic',
  OTHER = 'other',
}

export enum ReportStatus {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  DISMISSED = 'dismissed',
}

export enum DiscussionVisibility {
  TENANT_ONLY = 'tenant_only',
  PUBLIC_POOL = 'public_pool',
}

export enum SupportedLocale {
  EN = 'en',
  FR = 'fr',
}

export enum NotificationType {
  LESSON_COMPLETED = 'lesson_completed',
  COURSE_COMPLETED = 'course_completed',
  QUIZ_PASSED = 'quiz_passed',
  BADGE_EARNED = 'badge_earned',
  DISCUSSION_REPLY = 'discussion_reply',
  PURCHASE_CONFIRMED = 'purchase_confirmed',
  REVIEW_APPROVED = 'review_approved',
  STREAK_MILESTONE = 'streak_milestone',
  LICENSE_EXPIRING_SOON = 'license_expiring_soon',
  LICENSE_EXPIRED = 'license_expired',
}

export enum ReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum LeaderboardMetric {
  COURSES_COMPLETED = 'courses_completed',
  AVG_QUIZ_SCORE = 'avg_quiz_score',
  CURRENT_STREAK = 'current_streak',
  TOTAL_LEARNING_TIME = 'total_learning_time',
}

export enum LeaderboardPeriod {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  ALL_TIME = 'all_time',
}

export enum DigestFrequency {
  NEVER = 'never',
  DAILY = 'daily',
  WEEKLY = 'weekly',
}

export enum RefundRequestStatus {
  NONE = 'none',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  AUTO_APPROVED = 'auto_approved',
}

export enum TranscodingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  READY = 'ready',
  ERROR = 'error',
}

export enum CourseCategory {
  DEVELOPMENT = 'development',
  DESIGN = 'design',
  BUSINESS = 'business',
  MARKETING = 'marketing',
  DATA_SCIENCE = 'data_science',
  LANGUAGE = 'language',
  PERSONAL_DEVELOPMENT = 'personal_development',
  OTHER = 'other',
}

export enum CourseLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  ALL_LEVELS = 'all_levels',
}

// B2B Course Licensing
export enum LicenseType {
  UNLIMITED = 'unlimited', // All tenant members have access
  SEATS = 'seats', // Limited seats, assigned to specific members
}
