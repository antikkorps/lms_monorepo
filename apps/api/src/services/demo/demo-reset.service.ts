import { config } from '../../config/index.js';
import { sequelize } from '../../database/sequelize.js';
import {
  User,
  UserProgress,
  QuizResult,
  Note,
  Discussion,
  DiscussionReply,
  UserBadge,
  UserStreak,
  UserActivityLog,
  Notification,
  NotificationPreference,
  CourseReview,
} from '../../database/models/index.js';
import { logger } from '../../utils/logger.js';

/**
 * Reset the shared demo account back to a clean state.
 *
 * Deletes everything the demo user generated while exploring (progress, quiz
 * results, notes, discussions, badges, streak, activity, notifications) but
 * KEEPS its course-access purchases so the demo can still browse courses.
 * The demo user is identified by its configured email.
 */
export async function resetDemoData(): Promise<{ reset: boolean; userId?: string }> {
  if (!config.demo.enabled) {
    logger.debug('Demo reset skipped: demo access disabled');
    return { reset: false };
  }

  const demo = await User.findOne({
    where: { email: config.demo.email },
    attributes: ['id'],
  });

  if (!demo) {
    logger.warn(
      { email: config.demo.email },
      'Demo reset skipped: demo account not found (seed it first)'
    );
    return { reset: false };
  }

  const where = { userId: demo.id };

  await sequelize.transaction(async (transaction) => {
    // Replies before threads to respect the discussions FK.
    await DiscussionReply.destroy({ where, transaction });
    await Discussion.destroy({ where, transaction });
    await UserProgress.destroy({ where, transaction });
    await QuizResult.destroy({ where, transaction });
    await Note.destroy({ where, transaction });
    await UserBadge.destroy({ where, transaction });
    await UserStreak.destroy({ where, transaction });
    await UserActivityLog.destroy({ where, transaction });
    await Notification.destroy({ where, transaction });
    await NotificationPreference.destroy({ where, transaction });
    // CourseReview is paranoid — hard delete so reviews don't pile up.
    await CourseReview.destroy({ where, transaction, force: true });
  });

  logger.info({ userId: demo.id }, 'Demo account data reset');
  return { reset: true, userId: demo.id };
}
