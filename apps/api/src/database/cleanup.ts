/**
 * Production Cleanup Script
 *
 * Purges all seed/test data and creates a real super admin.
 *
 * Required environment variables:
 *   ADMIN_EMAIL       - Super admin email
 *   ADMIN_PASSWORD    - Super admin password (min 12 chars)
 *   ADMIN_FIRST_NAME  - Super admin first name
 *   ADMIN_LAST_NAME   - Super admin last name
 *
 * Usage: npm run db:cleanup
 */

import { sequelize } from './sequelize.js';
import { setupAssociations } from './models/index.js';
import { User } from './models/User.js';
import { Tenant } from './models/Tenant.js';
import { Course, Chapter, Lesson, LessonContent, QuizQuestion } from './models/index.js';
import { Purchase, UserProgress, QuizResult } from './models/index.js';
import { Badge, UserBadge } from './models/index.js';
import { Invitation, InvitationGroup } from './models/index.js';
import { Discussion, DiscussionReply, DiscussionReport, Note } from './models/index.js';
import { Notification, NotificationPreference } from './models/index.js';
import { TenantCourseLicense, TenantCourseLicenseAssignment } from './models/index.js';
import { EmailLog } from './models/index.js';
import { CourseReview, UserStreak, UserActivityLog, LeaderboardEntry } from './models/index.js';
import { UserRole, UserStatus } from './models/enums.js';
import { hashPassword } from '../auth/password.js';
import { logger } from '../utils/logger.js';

async function cleanup(): Promise<void> {
  // Validate required env vars
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminFirstName = process.env.ADMIN_FIRST_NAME || 'Admin';
  const adminLastName = process.env.ADMIN_LAST_NAME || 'IQON-IA';

  if (!adminEmail || !adminPassword) {
    logger.error('ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required');
    logger.info('Usage: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=securepassword npm run db:cleanup');
    process.exit(1);
  }

  if (adminPassword.length < 12) {
    logger.error('ADMIN_PASSWORD must be at least 12 characters');
    process.exit(1);
  }

  try {
    await sequelize.authenticate();
    setupAssociations();
    logger.info('Connected to database');

    // Confirm production safety
    const userCount = await User.count();
    if (userCount > 20) {
      logger.warn(
        { userCount },
        'Database has more than 20 users. This looks like production data. Aborting cleanup to be safe.'
      );
      logger.info('If you really want to proceed, manually truncate the tables first.');
      process.exit(1);
    }

    logger.info('Purging all seed data...');

    await sequelize.transaction(async (t) => {
      await sequelize.query('SET CONSTRAINTS ALL DEFERRED', { transaction: t });

      // Clear all tables in reverse dependency order
      await LeaderboardEntry.destroy({ where: {}, force: true, transaction: t });
      await UserActivityLog.destroy({ where: {}, force: true, transaction: t });
      await UserStreak.destroy({ where: {}, force: true, transaction: t });
      await CourseReview.destroy({ where: {}, force: true, transaction: t });
      await EmailLog.destroy({ where: {}, force: true, transaction: t });
      await TenantCourseLicenseAssignment.destroy({ where: {}, force: true, transaction: t });
      await TenantCourseLicense.destroy({ where: {}, force: true, transaction: t });
      await NotificationPreference.destroy({ where: {}, force: true, transaction: t });
      await Notification.destroy({ where: {}, force: true, transaction: t });
      await Note.destroy({ where: {}, force: true, transaction: t });
      await DiscussionReport.destroy({ where: {}, force: true, transaction: t });
      await DiscussionReply.destroy({ where: {}, force: true, transaction: t });
      await Discussion.destroy({ where: {}, force: true, transaction: t });
      await InvitationGroup.destroy({ where: {}, force: true, transaction: t });
      await Invitation.destroy({ where: {}, force: true, transaction: t });
      await UserBadge.destroy({ where: {}, force: true, transaction: t });
      await Badge.destroy({ where: {}, force: true, transaction: t });
      await QuizResult.destroy({ where: {}, force: true, transaction: t });
      await UserProgress.destroy({ where: {}, force: true, transaction: t });
      await Purchase.destroy({ where: {}, force: true, transaction: t });
      await QuizQuestion.destroy({ where: {}, force: true, transaction: t });
      await LessonContent.destroy({ where: {}, force: true, transaction: t });
      await Lesson.destroy({ where: {}, force: true, transaction: t });
      await Chapter.destroy({ where: {}, force: true, transaction: t });
      await Course.destroy({ where: {}, force: true, transaction: t });
      await User.destroy({ where: {}, force: true, transaction: t });
      await Tenant.destroy({ where: {}, force: true, transaction: t });
    });

    logger.info('All seed data purged');

    // Create production super admin
    const passwordHash = await hashPassword(adminPassword);

    await User.create({
      email: adminEmail,
      passwordHash,
      firstName: adminFirstName,
      lastName: adminLastName,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      tenantId: null,
    });

    logger.info({ email: adminEmail }, 'Production super admin created');
    logger.info('Cleanup complete. Database is ready for production.');
  } catch (error) {
    if (error instanceof Error) {
      logger.error({ message: error.message, stack: error.stack }, 'Cleanup failed');
    } else {
      logger.error({ error: String(error) }, 'Cleanup failed');
    }
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

cleanup();
