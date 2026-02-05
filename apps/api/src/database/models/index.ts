/**
 * Database Models Index
 *
 * This file imports all models and sets up their associations.
 * Import this file once during application startup to initialize the models.
 */

// Export enums
export * from './enums.js';

// Export models
export { Tenant } from './Tenant.js';
export { User } from './User.js';
export { Group, UserGroup } from './Group.js';
export { Course } from './Course.js';
export { Chapter } from './Chapter.js';
export { Lesson } from './Lesson.js';
export { LessonContent } from './LessonContent.js';
export { QuizQuestion } from './QuizQuestion.js';
export { Purchase } from './Purchase.js';
export { UserProgress } from './UserProgress.js';
export { QuizResult } from './QuizResult.js';
export { Badge, UserBadge } from './Badge.js';
export { Invitation, InvitationGroup } from './Invitation.js';
export { Discussion } from './Discussion.js';
export { DiscussionReply } from './DiscussionReply.js';
export { DiscussionReport } from './DiscussionReport.js';
export { Note } from './Note.js';
export { Notification, type NotificationData } from './Notification.js';
export { NotificationPreference, type NotificationPreferenceFlags } from './NotificationPreference.js';
export { TenantCourseLicense, TenantCourseLicenseAssignment } from './TenantCourseLicense.js';
export { EmailLog, type EmailType, type EmailStatus } from './EmailLog.js';

// Import for associations setup
import { Tenant } from './Tenant.js';
import { User } from './User.js';
import { Group, UserGroup } from './Group.js';
import { Course } from './Course.js';
import { Chapter } from './Chapter.js';
import { Lesson } from './Lesson.js';
import { LessonContent } from './LessonContent.js';
import { QuizQuestion } from './QuizQuestion.js';
import { Purchase } from './Purchase.js';
import { UserProgress } from './UserProgress.js';
import { QuizResult } from './QuizResult.js';
import { Badge, UserBadge } from './Badge.js';
import { Invitation, InvitationGroup } from './Invitation.js';
import { Discussion } from './Discussion.js';
import { DiscussionReply } from './DiscussionReply.js';
import { DiscussionReport } from './DiscussionReport.js';
import { Note } from './Note.js';
import { Notification } from './Notification.js';
import { NotificationPreference } from './NotificationPreference.js';
import { TenantCourseLicense, TenantCourseLicenseAssignment } from './TenantCourseLicense.js';
import { EmailLog } from './EmailLog.js';

/**
 * Setup all model associations
 * Call this function once during application startup
 */
export function setupAssociations(): void {
  // =============================================================================
  // Tenant Associations
  // =============================================================================
  Tenant.hasMany(User, {
    foreignKey: 'tenantId',
    as: 'users',
  });

  Tenant.hasMany(Group, {
    foreignKey: 'tenantId',
    as: 'groups',
  });

  Tenant.hasMany(Purchase, {
    foreignKey: 'tenantId',
    as: 'purchases',
  });

  // =============================================================================
  // User Associations
  // =============================================================================
  User.belongsTo(Tenant, {
    foreignKey: 'tenantId',
    as: 'tenant',
  });

  User.hasMany(Course, {
    foreignKey: 'instructorId',
    as: 'taughtCourses',
  });

  User.hasMany(Purchase, {
    foreignKey: 'userId',
    as: 'purchases',
  });

  User.hasMany(UserProgress, {
    foreignKey: 'userId',
    as: 'progress',
  });

  User.hasMany(QuizResult, {
    foreignKey: 'userId',
    as: 'quizResults',
  });

  User.hasMany(UserBadge, {
    foreignKey: 'userId',
    as: 'userBadges',
  });

  User.belongsToMany(Badge, {
    through: UserBadge,
    foreignKey: 'userId',
    otherKey: 'badgeId',
    as: 'badges',
  });

  User.belongsToMany(Group, {
    through: UserGroup,
    foreignKey: 'userId',
    otherKey: 'groupId',
    as: 'groups',
  });

  // =============================================================================
  // Group Associations
  // =============================================================================
  Group.belongsTo(Tenant, {
    foreignKey: 'tenantId',
    as: 'tenant',
  });

  Group.belongsToMany(User, {
    through: UserGroup,
    foreignKey: 'groupId',
    otherKey: 'userId',
    as: 'users',
  });

  // =============================================================================
  // Course Associations
  // =============================================================================
  Course.belongsTo(User, {
    foreignKey: 'instructorId',
    as: 'instructor',
  });

  Course.hasMany(Chapter, {
    foreignKey: 'courseId',
    as: 'chapters',
  });

  Course.hasMany(Purchase, {
    foreignKey: 'courseId',
    as: 'purchases',
  });

  Course.hasMany(UserProgress, {
    foreignKey: 'courseId',
    as: 'userProgress',
  });

  Course.hasMany(UserBadge, {
    foreignKey: 'courseId',
    as: 'userBadges',
  });

  // =============================================================================
  // Chapter Associations
  // =============================================================================
  Chapter.belongsTo(Course, {
    foreignKey: 'courseId',
    as: 'course',
  });

  Chapter.hasMany(Lesson, {
    foreignKey: 'chapterId',
    as: 'lessons',
  });

  // =============================================================================
  // Lesson Associations
  // =============================================================================
  Lesson.belongsTo(Chapter, {
    foreignKey: 'chapterId',
    as: 'chapter',
  });

  Lesson.hasMany(QuizQuestion, {
    foreignKey: 'lessonId',
    as: 'quizQuestions',
  });

  Lesson.hasMany(UserProgress, {
    foreignKey: 'lessonId',
    as: 'userProgress',
  });

  Lesson.hasMany(QuizResult, {
    foreignKey: 'lessonId',
    as: 'quizResults',
  });

  Lesson.hasMany(LessonContent, {
    foreignKey: 'lessonId',
    as: 'contents',
  });

  // =============================================================================
  // LessonContent Associations
  // =============================================================================
  LessonContent.belongsTo(Lesson, {
    foreignKey: 'lessonId',
    as: 'lesson',
  });

  // =============================================================================
  // QuizQuestion Associations
  // =============================================================================
  QuizQuestion.belongsTo(Lesson, {
    foreignKey: 'lessonId',
    as: 'lesson',
  });

  // =============================================================================
  // Purchase Associations
  // =============================================================================
  Purchase.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  Purchase.belongsTo(Course, {
    foreignKey: 'courseId',
    as: 'course',
  });

  Purchase.belongsTo(Tenant, {
    foreignKey: 'tenantId',
    as: 'tenant',
  });

  // =============================================================================
  // UserProgress Associations
  // =============================================================================
  UserProgress.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  UserProgress.belongsTo(Course, {
    foreignKey: 'courseId',
    as: 'course',
  });

  UserProgress.belongsTo(Lesson, {
    foreignKey: 'lessonId',
    as: 'lesson',
  });

  // =============================================================================
  // QuizResult Associations
  // =============================================================================
  QuizResult.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  QuizResult.belongsTo(Lesson, {
    foreignKey: 'lessonId',
    as: 'lesson',
  });

  // =============================================================================
  // Badge Associations
  // =============================================================================
  Badge.hasMany(UserBadge, {
    foreignKey: 'badgeId',
    as: 'userBadges',
  });

  Badge.belongsToMany(User, {
    through: UserBadge,
    foreignKey: 'badgeId',
    otherKey: 'userId',
    as: 'users',
  });

  // =============================================================================
  // UserBadge Associations
  // =============================================================================
  UserBadge.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  UserBadge.belongsTo(Badge, {
    foreignKey: 'badgeId',
    as: 'badge',
  });

  UserBadge.belongsTo(Course, {
    foreignKey: 'courseId',
    as: 'course',
  });

  // =============================================================================
  // Invitation Associations
  // =============================================================================
  Invitation.belongsTo(Tenant, {
    foreignKey: 'tenantId',
    as: 'tenant',
  });

  Invitation.belongsTo(User, {
    foreignKey: 'invitedById',
    as: 'invitedBy',
  });

  Invitation.belongsTo(User, {
    foreignKey: 'acceptedById',
    as: 'acceptedBy',
  });

  Invitation.belongsToMany(Group, {
    through: InvitationGroup,
    foreignKey: 'invitationId',
    otherKey: 'groupId',
    as: 'groups',
  });

  Group.belongsToMany(Invitation, {
    through: InvitationGroup,
    foreignKey: 'groupId',
    otherKey: 'invitationId',
    as: 'invitations',
  });

  Tenant.hasMany(Invitation, {
    foreignKey: 'tenantId',
    as: 'invitations',
  });

  // =============================================================================
  // Discussion Associations
  // =============================================================================
  Discussion.belongsTo(Lesson, {
    foreignKey: 'lessonId',
    as: 'lesson',
  });

  Discussion.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  Discussion.belongsTo(Tenant, {
    foreignKey: 'tenantId',
    as: 'tenant',
  });

  Discussion.belongsTo(User, {
    foreignKey: 'deletedById',
    as: 'deletedBy',
  });

  Discussion.hasMany(DiscussionReply, {
    foreignKey: 'discussionId',
    as: 'replies',
  });

  Discussion.hasMany(DiscussionReport, {
    foreignKey: 'discussionId',
    as: 'reports',
  });

  Lesson.hasMany(Discussion, {
    foreignKey: 'lessonId',
    as: 'discussions',
  });

  User.hasMany(Discussion, {
    foreignKey: 'userId',
    as: 'discussions',
  });

  Tenant.hasMany(Discussion, {
    foreignKey: 'tenantId',
    as: 'discussions',
  });

  // =============================================================================
  // DiscussionReply Associations
  // =============================================================================
  DiscussionReply.belongsTo(Discussion, {
    foreignKey: 'discussionId',
    as: 'discussion',
  });

  DiscussionReply.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  DiscussionReply.belongsTo(User, {
    foreignKey: 'deletedById',
    as: 'deletedBy',
  });

  DiscussionReply.hasMany(DiscussionReport, {
    foreignKey: 'replyId',
    as: 'reports',
  });

  User.hasMany(DiscussionReply, {
    foreignKey: 'userId',
    as: 'discussionReplies',
  });

  // =============================================================================
  // DiscussionReport Associations
  // =============================================================================
  DiscussionReport.belongsTo(Discussion, {
    foreignKey: 'discussionId',
    as: 'discussion',
  });

  DiscussionReport.belongsTo(DiscussionReply, {
    foreignKey: 'replyId',
    as: 'reply',
  });

  DiscussionReport.belongsTo(User, {
    foreignKey: 'reportedById',
    as: 'reportedBy',
  });

  DiscussionReport.belongsTo(User, {
    foreignKey: 'reviewedById',
    as: 'reviewedBy',
  });

  // =============================================================================
  // Note Associations
  // =============================================================================
  Note.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  Note.belongsTo(Lesson, {
    foreignKey: 'lessonId',
    as: 'lesson',
  });

  User.hasMany(Note, {
    foreignKey: 'userId',
    as: 'notes',
  });

  Lesson.hasMany(Note, {
    foreignKey: 'lessonId',
    as: 'notes',
  });

  // =============================================================================
  // Notification Associations
  // =============================================================================
  Notification.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  User.hasMany(Notification, {
    foreignKey: 'userId',
    as: 'notifications',
  });

  // =============================================================================
  // NotificationPreference Associations
  // =============================================================================
  NotificationPreference.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  User.hasOne(NotificationPreference, {
    foreignKey: 'userId',
    as: 'notificationPreference',
  });

  // =============================================================================
  // TenantCourseLicense Associations
  // =============================================================================
  TenantCourseLicense.belongsTo(Tenant, {
    foreignKey: 'tenantId',
    as: 'tenant',
  });

  TenantCourseLicense.belongsTo(Course, {
    foreignKey: 'courseId',
    as: 'course',
  });

  TenantCourseLicense.belongsTo(User, {
    foreignKey: 'purchasedById',
    as: 'purchasedBy',
  });

  Tenant.hasMany(TenantCourseLicense, {
    foreignKey: 'tenantId',
    as: 'courseLicenses',
  });

  Course.hasMany(TenantCourseLicense, {
    foreignKey: 'courseId',
    as: 'tenantLicenses',
  });

  // =============================================================================
  // TenantCourseLicenseAssignment Associations
  // =============================================================================
  TenantCourseLicenseAssignment.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  TenantCourseLicenseAssignment.belongsTo(User, {
    foreignKey: 'assignedById',
    as: 'assignedBy',
  });

  User.hasMany(TenantCourseLicenseAssignment, {
    foreignKey: 'userId',
    as: 'licenseAssignments',
  });
}

// All models for easy iteration
export const models = {
  Tenant,
  User,
  Group,
  UserGroup,
  Course,
  Chapter,
  Lesson,
  LessonContent,
  QuizQuestion,
  Purchase,
  UserProgress,
  QuizResult,
  Badge,
  UserBadge,
  Invitation,
  InvitationGroup,
  Discussion,
  DiscussionReply,
  DiscussionReport,
  Note,
  Notification,
  NotificationPreference,
  TenantCourseLicense,
  TenantCourseLicenseAssignment,
  EmailLog,
} as const;
