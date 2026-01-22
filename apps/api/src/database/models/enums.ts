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
