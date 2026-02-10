/**
 * Backend i18n for notifications and emails
 */
import { SupportedLocale, NotificationType } from '../database/models/enums.js';
import type { NotificationData } from '../database/models/Notification.js';

import { notifications as notificationsEn, emails as emailsEn } from './translations/en/index.js';
import { notifications as notificationsFr, emails as emailsFr } from './translations/fr/index.js';

// Type definitions
type NotificationTranslations = typeof notificationsEn;
type EmailTranslations = typeof emailsEn;

interface Translations {
  notifications: NotificationTranslations;
  emails: EmailTranslations;
}

// All translations indexed by locale
const translations: Record<SupportedLocale, Translations> = {
  [SupportedLocale.EN]: {
    notifications: notificationsEn,
    emails: emailsEn,
  },
  [SupportedLocale.FR]: {
    notifications: notificationsFr,
    emails: emailsFr,
  },
};

/**
 * Interpolate template string with parameters
 * Replaces {key} with params[key]
 */
export function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return params[key]?.toString() ?? `{${key}}`;
  });
}

/**
 * Get translations for a specific locale
 * Falls back to English if locale not found
 */
export function getTranslations(locale: SupportedLocale): Translations {
  return translations[locale] || translations[SupportedLocale.EN];
}

/**
 * Get notification text (title and message) for a notification type
 * Interpolates data into the message template
 */
export function getNotificationText(
  locale: SupportedLocale,
  type: NotificationType,
  data: NotificationData
): { title: string; message: string } {
  const t = getTranslations(locale).notifications;
  const fallbacks = t.fallbacks;

  // Map notification type to translation key
  const typeKeyMap: Record<NotificationType, keyof NotificationTranslations> = {
    [NotificationType.LESSON_COMPLETED]: 'lesson_completed',
    [NotificationType.COURSE_COMPLETED]: 'course_completed',
    [NotificationType.QUIZ_PASSED]: 'quiz_passed',
    [NotificationType.BADGE_EARNED]: 'badge_earned',
    [NotificationType.DISCUSSION_REPLY]: 'discussion_reply',
    [NotificationType.PURCHASE_CONFIRMED]: 'purchase_confirmed',
    [NotificationType.REVIEW_APPROVED]: 'default',
    [NotificationType.STREAK_MILESTONE]: 'default',
  };

  const translationKey = typeKeyMap[type];
  const translation = translationKey ? t[translationKey] : t.default;

  // Handle edge case where translation might be fallbacks object
  if (!translation || typeof translation !== 'object' || !('title' in translation)) {
    return { title: t.default.title, message: t.default.message };
  }

  // Build interpolation params based on notification type
  const params: Record<string, string> = {};

  switch (type) {
    case NotificationType.LESSON_COMPLETED:
      params.lessonName = data.lessonName || fallbacks.lesson;
      break;
    case NotificationType.COURSE_COMPLETED:
      params.courseName = data.courseName || fallbacks.course;
      break;
    case NotificationType.QUIZ_PASSED:
      params.quizName = data.lessonName || fallbacks.quiz;
      break;
    case NotificationType.BADGE_EARNED:
      params.badgeName = data.badgeName || fallbacks.badge;
      break;
    case NotificationType.DISCUSSION_REPLY:
      params.authorName = data.authorName || fallbacks.someone;
      break;
    case NotificationType.PURCHASE_CONFIRMED:
      params.courseName = data.courseName || fallbacks.course;
      break;
  }

  return {
    title: translation.title,
    message: interpolate(translation.message, params),
  };
}

/**
 * Get email translations for a specific locale
 */
export function getEmailTranslations(locale: SupportedLocale): EmailTranslations {
  return getTranslations(locale).emails;
}

/**
 * Format date for a specific locale
 */
export function formatDateForLocale(date: Date, locale: SupportedLocale): string {
  const localeMap: Record<SupportedLocale, string> = {
    [SupportedLocale.EN]: 'en-US',
    [SupportedLocale.FR]: 'fr-FR',
  };

  return date.toLocaleDateString(localeMap[locale], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// Re-export for convenience
export { SupportedLocale } from '../database/models/enums.js';
