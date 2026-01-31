import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationType, DigestFrequency } from '../../database/models/enums.js';

// =============================================================================
// Module Mocks
// =============================================================================

const mockPreference = {
  id: 'pref-123',
  userId: 'user-123',
  emailEnabled: {
    lesson_completed: true,
    course_completed: true,
    quiz_passed: true,
    badge_earned: true,
    discussion_reply: true,
    purchase_confirmed: true,
  },
  inAppEnabled: {
    lesson_completed: true,
    course_completed: true,
    quiz_passed: true,
    badge_earned: true,
    discussion_reply: true,
    purchase_confirmed: true,
  },
  digestFrequency: DigestFrequency.WEEKLY,
  digestDay: 1,
  update: vi.fn().mockResolvedValue(undefined),
  isEmailEnabled: vi.fn().mockReturnValue(true),
  isInAppEnabled: vi.fn().mockReturnValue(true),
};

const mockNotificationPreferenceModel = {
  findOrCreate: vi.fn().mockResolvedValue([mockPreference, false]),
  findAll: vi.fn().mockResolvedValue([mockPreference]),
};

vi.mock('../../database/models/index.js', () => ({
  NotificationPreference: mockNotificationPreferenceModel,
}));

vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// =============================================================================
// Tests
// =============================================================================

describe('PreferenceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock preference to default state
    mockPreference.emailEnabled = {
      lesson_completed: true,
      course_completed: true,
      quiz_passed: true,
      badge_earned: true,
      discussion_reply: true,
      purchase_confirmed: true,
    };
    mockPreference.inAppEnabled = {
      lesson_completed: true,
      course_completed: true,
      quiz_passed: true,
      badge_earned: true,
      discussion_reply: true,
      purchase_confirmed: true,
    };
    mockPreference.digestFrequency = DigestFrequency.WEEKLY;
    mockPreference.digestDay = 1;
  });

  describe('getOrCreate', () => {
    it('should return existing preferences', async () => {
      const { preferenceService } = await import('./preference.service.js');

      const result = await preferenceService.getOrCreate('user-123');

      expect(mockNotificationPreferenceModel.findOrCreate).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        defaults: { userId: 'user-123' },
      });

      expect(result).toBe(mockPreference);
    });

    it('should create new preferences if not found', async () => {
      const newPreference = { ...mockPreference, id: 'new-pref' };
      mockNotificationPreferenceModel.findOrCreate.mockResolvedValueOnce([newPreference, true]);

      const { preferenceService } = await import('./preference.service.js');

      const result = await preferenceService.getOrCreate('new-user');

      expect(result).toBe(newPreference);
    });
  });

  describe('update', () => {
    it('should update email preferences', async () => {
      const { preferenceService } = await import('./preference.service.js');

      await preferenceService.update('user-123', {
        emailEnabled: { lesson_completed: false },
      });

      expect(mockPreference.update).toHaveBeenCalledWith(
        expect.objectContaining({
          emailEnabled: expect.objectContaining({
            lesson_completed: false,
            course_completed: true,
          }),
        })
      );
    });

    it('should update in-app preferences', async () => {
      const { preferenceService } = await import('./preference.service.js');

      await preferenceService.update('user-123', {
        inAppEnabled: { badge_earned: false, discussion_reply: false },
      });

      expect(mockPreference.update).toHaveBeenCalledWith(
        expect.objectContaining({
          inAppEnabled: expect.objectContaining({
            badge_earned: false,
            discussion_reply: false,
            lesson_completed: true,
          }),
        })
      );
    });

    it('should update digest frequency', async () => {
      const { preferenceService } = await import('./preference.service.js');

      await preferenceService.update('user-123', {
        digestFrequency: DigestFrequency.DAILY,
      });

      expect(mockPreference.update).toHaveBeenCalledWith(
        expect.objectContaining({
          digestFrequency: DigestFrequency.DAILY,
        })
      );
    });

    it('should update digest day', async () => {
      const { preferenceService } = await import('./preference.service.js');

      await preferenceService.update('user-123', {
        digestDay: 5,
      });

      expect(mockPreference.update).toHaveBeenCalledWith(
        expect.objectContaining({
          digestDay: 5,
        })
      );
    });

    it('should throw error for invalid digest day', async () => {
      const { preferenceService } = await import('./preference.service.js');

      await expect(
        preferenceService.update('user-123', { digestDay: 7 })
      ).rejects.toThrow('digestDay must be between 0 (Sunday) and 6 (Saturday)');

      await expect(
        preferenceService.update('user-123', { digestDay: -1 })
      ).rejects.toThrow('digestDay must be between 0 (Sunday) and 6 (Saturday)');
    });
  });

  describe('isEmailEnabled', () => {
    it('should return true when email is enabled for type', async () => {
      mockPreference.isEmailEnabled.mockReturnValueOnce(true);

      const { preferenceService } = await import('./preference.service.js');

      const result = await preferenceService.isEmailEnabled(
        'user-123',
        NotificationType.LESSON_COMPLETED
      );

      expect(result).toBe(true);
    });

    it('should return false when email is disabled for type', async () => {
      mockPreference.isEmailEnabled.mockReturnValueOnce(false);

      const { preferenceService } = await import('./preference.service.js');

      const result = await preferenceService.isEmailEnabled(
        'user-123',
        NotificationType.BADGE_EARNED
      );

      expect(result).toBe(false);
    });
  });

  describe('isInAppEnabled', () => {
    it('should return true when in-app is enabled for type', async () => {
      mockPreference.isInAppEnabled.mockReturnValueOnce(true);

      const { preferenceService } = await import('./preference.service.js');

      const result = await preferenceService.isInAppEnabled(
        'user-123',
        NotificationType.COURSE_COMPLETED
      );

      expect(result).toBe(true);
    });

    it('should return false when in-app is disabled for type', async () => {
      mockPreference.isInAppEnabled.mockReturnValueOnce(false);

      const { preferenceService } = await import('./preference.service.js');

      const result = await preferenceService.isInAppEnabled(
        'user-123',
        NotificationType.QUIZ_PASSED
      );

      expect(result).toBe(false);
    });
  });

  describe('getUsersForDigest', () => {
    it('should return users with daily digest enabled', async () => {
      const { preferenceService } = await import('./preference.service.js');

      const result = await preferenceService.getUsersForDigest(DigestFrequency.DAILY);

      expect(mockNotificationPreferenceModel.findAll).toHaveBeenCalledWith({
        where: { digestFrequency: DigestFrequency.DAILY },
      });

      expect(result).toEqual([mockPreference]);
    });

    it('should filter weekly digest by day of week', async () => {
      const { preferenceService } = await import('./preference.service.js');

      await preferenceService.getUsersForDigest(DigestFrequency.WEEKLY, 1);

      expect(mockNotificationPreferenceModel.findAll).toHaveBeenCalledWith({
        where: {
          digestFrequency: DigestFrequency.WEEKLY,
          digestDay: 1,
        },
      });
    });

    it('should not filter by day for non-weekly digest', async () => {
      const { preferenceService } = await import('./preference.service.js');

      await preferenceService.getUsersForDigest(DigestFrequency.DAILY, 1);

      expect(mockNotificationPreferenceModel.findAll).toHaveBeenCalledWith({
        where: { digestFrequency: DigestFrequency.DAILY },
      });
    });
  });
});
