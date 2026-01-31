/**
 * Notification Preferences Composable
 * Manages user notification preferences
 */

import { ref } from 'vue';
import { useApi } from './useApi';

export type NotificationType =
  | 'lesson_completed'
  | 'course_completed'
  | 'quiz_passed'
  | 'badge_earned'
  | 'discussion_reply'
  | 'purchase_confirmed';

export type DigestFrequency = 'never' | 'daily' | 'weekly';

export interface NotificationPreferences {
  emailEnabled: Record<NotificationType, boolean>;
  inAppEnabled: Record<NotificationType, boolean>;
  digestFrequency: DigestFrequency;
  digestDay: number; // 0 = Sunday, 6 = Saturday
}

const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  lesson_completed: 'Lesson completed',
  course_completed: 'Course completed',
  quiz_passed: 'Quiz passed',
  badge_earned: 'Badge earned',
  discussion_reply: 'Discussion replies',
  purchase_confirmed: 'Purchase confirmations',
};

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function useNotificationPreferences() {
  const api = useApi();

  const preferences = ref<NotificationPreferences | null>(null);
  const isLoading = ref(false);
  const isSaving = ref(false);
  const error = ref<string | null>(null);

  async function fetchPreferences(): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      preferences.value = await api.get<NotificationPreferences>('/notifications/preferences');
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load preferences';
    } finally {
      isLoading.value = false;
    }
  }

  async function updatePreferences(updates: Partial<NotificationPreferences>): Promise<void> {
    isSaving.value = true;
    error.value = null;

    try {
      preferences.value = await api.patch<NotificationPreferences>(
        '/notifications/preferences',
        updates
      );
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to save preferences';
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  async function toggleEmailEnabled(type: NotificationType): Promise<void> {
    if (!preferences.value) return;

    const currentValue = preferences.value.emailEnabled[type];
    await updatePreferences({
      emailEnabled: {
        ...preferences.value.emailEnabled,
        [type]: !currentValue,
      },
    });
  }

  async function toggleInAppEnabled(type: NotificationType): Promise<void> {
    if (!preferences.value) return;

    const currentValue = preferences.value.inAppEnabled[type];
    await updatePreferences({
      inAppEnabled: {
        ...preferences.value.inAppEnabled,
        [type]: !currentValue,
      },
    });
  }

  async function setDigestFrequency(frequency: DigestFrequency): Promise<void> {
    await updatePreferences({ digestFrequency: frequency });
  }

  async function setDigestDay(day: number): Promise<void> {
    if (day < 0 || day > 6) {
      throw new Error('Invalid day of week');
    }
    await updatePreferences({ digestDay: day });
  }

  function getTypeLabel(type: NotificationType): string {
    return NOTIFICATION_TYPE_LABELS[type];
  }

  function getDayLabel(day: number): string {
    return DAY_LABELS[day] || 'Unknown';
  }

  function getFrequencyLabel(frequency: DigestFrequency): string {
    switch (frequency) {
      case 'never':
        return 'Never';
      case 'daily':
        return 'Daily';
      case 'weekly':
        return 'Weekly';
      default:
        return frequency;
    }
  }

  return {
    // State
    preferences,
    isLoading,
    isSaving,
    error,

    // Methods
    fetchPreferences,
    updatePreferences,
    toggleEmailEnabled,
    toggleInAppEnabled,
    setDigestFrequency,
    setDigestDay,
    getTypeLabel,
    getDayLabel,
    getFrequencyLabel,

    // Constants
    NOTIFICATION_TYPES: Object.keys(NOTIFICATION_TYPE_LABELS) as NotificationType[],
    DAY_OPTIONS: DAY_LABELS.map((label, index) => ({ value: index, label })),
    FREQUENCY_OPTIONS: [
      { value: 'never' as const, label: 'Never' },
      { value: 'daily' as const, label: 'Daily' },
      { value: 'weekly' as const, label: 'Weekly' },
    ],
  };
}
