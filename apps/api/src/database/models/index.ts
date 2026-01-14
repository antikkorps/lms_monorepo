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
export { QuizQuestion } from './QuizQuestion.js';
export { Purchase } from './Purchase.js';
export { UserProgress } from './UserProgress.js';
export { QuizResult } from './QuizResult.js';
export { Badge, UserBadge } from './Badge.js';

// Import for associations setup
import { Tenant } from './Tenant.js';
import { User } from './User.js';
import { Group, UserGroup } from './Group.js';
import { Course } from './Course.js';
import { Chapter } from './Chapter.js';
import { Lesson } from './Lesson.js';
import { QuizQuestion } from './QuizQuestion.js';
import { Purchase } from './Purchase.js';
import { UserProgress } from './UserProgress.js';
import { QuizResult } from './QuizResult.js';
import { Badge, UserBadge } from './Badge.js';

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
  QuizQuestion,
  Purchase,
  UserProgress,
  QuizResult,
  Badge,
  UserBadge,
} as const;
