import { NotificationPreference, type NotificationPreferenceFlags } from '../../database/models/index.js';
import { DigestFrequency, NotificationType } from '../../database/models/enums.js';
import { logger } from '../../utils/logger.js';

export interface UpdatePreferencesInput {
  emailEnabled?: Partial<NotificationPreferenceFlags>;
  inAppEnabled?: Partial<NotificationPreferenceFlags>;
  digestFrequency?: DigestFrequency;
  digestDay?: number;
}

class PreferenceService {
  async getOrCreate(userId: string): Promise<NotificationPreference> {
    const [preference] = await NotificationPreference.findOrCreate({
      where: { userId },
      defaults: { userId },
    });

    return preference;
  }

  async update(userId: string, input: UpdatePreferencesInput): Promise<NotificationPreference> {
    const preference = await this.getOrCreate(userId);

    const updates: Partial<NotificationPreference> = {};

    if (input.emailEnabled) {
      updates.emailEnabled = {
        ...preference.emailEnabled,
        ...input.emailEnabled,
      };
    }

    if (input.inAppEnabled) {
      updates.inAppEnabled = {
        ...preference.inAppEnabled,
        ...input.inAppEnabled,
      };
    }

    if (input.digestFrequency !== undefined) {
      updates.digestFrequency = input.digestFrequency;
    }

    if (input.digestDay !== undefined) {
      if (input.digestDay < 0 || input.digestDay > 6) {
        throw new Error('digestDay must be between 0 (Sunday) and 6 (Saturday)');
      }
      updates.digestDay = input.digestDay;
    }

    await preference.update(updates);

    logger.info({ userId }, 'Notification preferences updated');

    return preference;
  }

  async isEmailEnabled(userId: string, type: NotificationType): Promise<boolean> {
    const preference = await this.getOrCreate(userId);
    return preference.isEmailEnabled(type);
  }

  async isInAppEnabled(userId: string, type: NotificationType): Promise<boolean> {
    const preference = await this.getOrCreate(userId);
    return preference.isInAppEnabled(type);
  }

  async getUsersForDigest(
    frequency: DigestFrequency,
    dayOfWeek?: number
  ): Promise<NotificationPreference[]> {
    const where: { digestFrequency: DigestFrequency; digestDay?: number } = {
      digestFrequency: frequency,
    };

    if (frequency === DigestFrequency.WEEKLY && dayOfWeek !== undefined) {
      where.digestDay = dayOfWeek;
    }

    return NotificationPreference.findAll({ where });
  }
}

export const preferenceService = new PreferenceService();
