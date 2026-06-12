import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/index.js', () => ({
  config: {
    demo: { enabled: true, email: 'demo@iqon-ia.com' },
  },
}));

vi.mock('../../database/sequelize.js', () => ({
  sequelize: {
    transaction: vi.fn(async (cb: (t: object) => Promise<unknown>) => cb({})),
  },
}));

const destroy = vi.fn().mockResolvedValue(0);
const model = () => ({ destroy });

vi.mock('../../database/models/index.js', () => ({
  User: { findOne: vi.fn() },
  UserProgress: model(),
  QuizResult: model(),
  Note: model(),
  Discussion: model(),
  DiscussionReply: model(),
  UserBadge: model(),
  UserStreak: model(),
  UserActivityLog: model(),
  Notification: model(),
  NotificationPreference: model(),
  CourseReview: model(),
}));

vi.mock('../../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

import { config } from '../../config/index.js';
import { resetDemoData } from './demo-reset.service.js';
import { User, UserProgress, CourseReview } from '../../database/models/index.js';

const demoConfig = config.demo as { enabled: boolean; email: string };

describe('resetDemoData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    demoConfig.enabled = true;
  });

  it('does nothing when demo is disabled', async () => {
    demoConfig.enabled = false;

    const result = await resetDemoData();

    expect(result).toEqual({ reset: false });
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it('does nothing when the demo account is missing', async () => {
    vi.mocked(User.findOne).mockResolvedValue(null as never);

    const result = await resetDemoData();

    expect(result).toEqual({ reset: false });
    expect(UserProgress.destroy).not.toHaveBeenCalled();
  });

  it('wipes generated data scoped to the demo user, keeping purchases', async () => {
    vi.mocked(User.findOne).mockResolvedValue({ id: 'demo-1' } as never);

    const result = await resetDemoData();

    expect(result).toEqual({ reset: true, userId: 'demo-1' });
    expect(UserProgress.destroy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'demo-1' } })
    );
    // Paranoid model is hard-deleted.
    expect(CourseReview.destroy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'demo-1' }, force: true })
    );
  });
});
