import { NotificationType } from '../database/models/enums.js';
import type { UserProgress } from '../database/models/UserProgress.js';
import type { UserBadge } from '../database/models/Badge.js';
import type { Purchase } from '../database/models/Purchase.js';
import type { DiscussionReply } from '../database/models/DiscussionReply.js';
import type { Discussion } from '../database/models/Discussion.js';
import { notificationService } from '../services/notifications/index.js';
import { logger } from '../utils/logger.js';

export async function onLessonCompleted(progress: UserProgress): Promise<void> {
  try {
    await notificationService.send({
      userId: progress.userId,
      type: NotificationType.LESSON_COMPLETED,
      data: {
        lessonId: progress.lessonId,
        courseId: progress.courseId,
      },
    });
  } catch (error) {
    logger.error(
      { userId: progress.userId, lessonId: progress.lessonId, error: error instanceof Error ? error.message : 'Unknown' },
      'Failed to send lesson completed notification'
    );
  }
}

export async function onCourseCompleted(
  userId: string,
  courseId: string,
  courseName?: string
): Promise<void> {
  try {
    await notificationService.send({
      userId,
      type: NotificationType.COURSE_COMPLETED,
      data: {
        courseId,
        courseName,
      },
    });
  } catch (error) {
    logger.error(
      { userId, courseId, error: error instanceof Error ? error.message : 'Unknown' },
      'Failed to send course completed notification'
    );
  }
}

export async function onQuizPassed(
  userId: string,
  lessonId: string,
  courseId: string,
  score: number
): Promise<void> {
  try {
    await notificationService.send({
      userId,
      type: NotificationType.QUIZ_PASSED,
      data: {
        lessonId,
        courseId,
        score,
      },
    });
  } catch (error) {
    logger.error(
      { userId, lessonId, error: error instanceof Error ? error.message : 'Unknown' },
      'Failed to send quiz passed notification'
    );
  }
}

export async function onBadgeEarned(userBadge: UserBadge): Promise<void> {
  try {
    await notificationService.send({
      userId: userBadge.userId,
      type: NotificationType.BADGE_EARNED,
      data: {
        badgeId: userBadge.badgeId,
        courseId: userBadge.courseId || undefined,
      },
    });
  } catch (error) {
    logger.error(
      { userId: userBadge.userId, badgeId: userBadge.badgeId, error: error instanceof Error ? error.message : 'Unknown' },
      'Failed to send badge earned notification'
    );
  }
}

export async function onPurchaseConfirmed(purchase: Purchase): Promise<void> {
  try {
    await notificationService.send({
      userId: purchase.userId,
      type: NotificationType.PURCHASE_CONFIRMED,
      data: {
        purchaseId: purchase.id,
        courseId: purchase.courseId,
        amount: Number(purchase.amount),
      },
    });
  } catch (error) {
    logger.error(
      { userId: purchase.userId, purchaseId: purchase.id, error: error instanceof Error ? error.message : 'Unknown' },
      'Failed to send purchase confirmed notification'
    );
  }
}

export async function onDiscussionReply(
  reply: DiscussionReply,
  discussion: Discussion,
  replyAuthorName: string
): Promise<void> {
  // Don't notify if user is replying to their own discussion
  if (discussion.userId === reply.userId) {
    return;
  }

  try {
    await notificationService.send({
      userId: discussion.userId,
      type: NotificationType.DISCUSSION_REPLY,
      data: {
        discussionId: discussion.id,
        replyId: reply.id,
        authorName: replyAuthorName,
      },
    });
  } catch (error) {
    logger.error(
      { userId: discussion.userId, discussionId: discussion.id, error: error instanceof Error ? error.message : 'Unknown' },
      'Failed to send discussion reply notification'
    );
  }
}
