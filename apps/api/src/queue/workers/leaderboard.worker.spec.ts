import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Job } from 'bullmq';
import type { LeaderboardJobData } from '../leaderboard.queue.js';

// =============================================================================
// Module Mocks
// =============================================================================

const mockLeaderboardEntry = {
  upsert: vi.fn(),
};

const mockUserStreak = {
  findAll: vi.fn(),
};

const mockSequelize = {
  query: vi.fn(),
};

const mockLeaderboardQueue = {
  getRepeatableJobs: vi.fn(),
  removeRepeatableByKey: vi.fn(),
  add: vi.fn(),
};

const mockWorkerInstance = {
  on: vi.fn(),
  close: vi.fn().mockResolvedValue(undefined),
};

const workerCalls: Array<{ queueName: string; processor: (...args: unknown[]) => unknown; options: object }> = [];

class MockWorker {
  processor: (...args: unknown[]) => unknown;

  constructor(queueName: string, processor: (...args: unknown[]) => unknown, options: object) {
    workerCalls.push({ queueName, processor, options });
    this.processor = processor;
  }

  on = mockWorkerInstance.on;
  close = mockWorkerInstance.close;
}

vi.mock('bullmq', () => ({
  Worker: MockWorker,
}));

vi.mock('../connection.js', () => ({
  queueConnection: { host: 'localhost', port: 6379 },
}));

vi.mock('../leaderboard.queue.js', () => ({
  LEADERBOARD_QUEUE_NAME: 'leaderboard-refresh',
  leaderboardQueue: mockLeaderboardQueue,
}));

vi.mock('../../database/models/index.js', () => ({
  LeaderboardEntry: mockLeaderboardEntry,
  UserStreak: mockUserStreak,
}));

vi.mock('../../database/models/enums.js', () => ({
  LeaderboardMetric: {
    COURSES_COMPLETED: 'courses_completed',
    AVG_QUIZ_SCORE: 'avg_quiz_score',
    CURRENT_STREAK: 'current_streak',
    TOTAL_LEARNING_TIME: 'total_learning_time',
  },
  LeaderboardPeriod: {
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    ALL_TIME: 'all_time',
  },
  CourseStatus: {
    PUBLISHED: 'published',
  },
}));

vi.mock('../../leaderboards/controller.js', () => ({
  calculatePeriodStart: vi.fn().mockReturnValue('2026-02-17'),
}));

vi.mock('../../database/sequelize.js', () => ({
  sequelize: mockSequelize,
}));

vi.mock('sequelize', () => ({
  Op: { gt: Symbol('gt') },
}));

vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

// =============================================================================
// Tests
// =============================================================================

describe('LeaderboardWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    workerCalls.length = 0;
  });

  describe('startLeaderboardWorker', () => {
    it('should create a worker with concurrency 1', async () => {
      const { startLeaderboardWorker } = await import('./leaderboard.worker.js');

      startLeaderboardWorker();

      expect(workerCalls.length).toBe(1);
      expect(workerCalls[0].queueName).toBe('leaderboard-refresh');
      expect(workerCalls[0].options).toMatchObject({
        connection: { host: 'localhost', port: 6379 },
        concurrency: 1,
      });
    });

    it('should register event handlers', async () => {
      const { startLeaderboardWorker } = await import('./leaderboard.worker.js');

      startLeaderboardWorker();

      expect(mockWorkerInstance.on).toHaveBeenCalledWith('completed', expect.any(Function));
      expect(mockWorkerInstance.on).toHaveBeenCalledWith('failed', expect.any(Function));
    });

    it('should return existing worker if already started', async () => {
      const { startLeaderboardWorker } = await import('./leaderboard.worker.js');

      const w1 = startLeaderboardWorker();
      const w2 = startLeaderboardWorker();

      expect(w1).toBe(w2);
      expect(workerCalls.length).toBe(1);
    });
  });

  describe('stopLeaderboardWorker', () => {
    it('should close the worker', async () => {
      const { startLeaderboardWorker, stopLeaderboardWorker } = await import(
        './leaderboard.worker.js'
      );

      startLeaderboardWorker();
      await stopLeaderboardWorker();

      expect(mockWorkerInstance.close).toHaveBeenCalled();
    });
  });

  describe('scheduleLeaderboardRefresh', () => {
    it('should remove existing and add new repeatable job', async () => {
      mockLeaderboardQueue.getRepeatableJobs.mockResolvedValue([
        { key: 'old-job-key' },
      ]);
      mockLeaderboardQueue.removeRepeatableByKey.mockResolvedValue(undefined);
      mockLeaderboardQueue.add.mockResolvedValue(undefined);

      const { scheduleLeaderboardRefresh } = await import('./leaderboard.worker.js');
      await scheduleLeaderboardRefresh();

      expect(mockLeaderboardQueue.removeRepeatableByKey).toHaveBeenCalledWith('old-job-key');
      expect(mockLeaderboardQueue.add).toHaveBeenCalledWith(
        'refresh',
        { trigger: 'scheduled' },
        {
          repeat: { every: 15 * 60 * 1000 },
        }
      );
    });

    it('should handle no existing repeatable jobs', async () => {
      mockLeaderboardQueue.getRepeatableJobs.mockResolvedValue([]);
      mockLeaderboardQueue.add.mockResolvedValue(undefined);

      const { scheduleLeaderboardRefresh } = await import('./leaderboard.worker.js');
      await scheduleLeaderboardRefresh();

      expect(mockLeaderboardQueue.removeRepeatableByKey).not.toHaveBeenCalled();
      expect(mockLeaderboardQueue.add).toHaveBeenCalled();
    });
  });

  describe('processLeaderboardRefresh', () => {
    let processJob: (job: Job<LeaderboardJobData>) => Promise<void>;

    beforeEach(async () => {
      vi.resetModules();
      workerCalls.length = 0;

      await import('./leaderboard.worker.js').then((module) => {
        module.startLeaderboardWorker();
      });

      processJob = workerCalls[0].processor as (job: Job<LeaderboardJobData>) => Promise<void>;
    });

    it('should process all metrics and periods', async () => {
      // Mock all compute functions to return scores
      mockSequelize.query.mockResolvedValue([
        { userId: 'user-1', score: '100' },
        { userId: 'user-2', score: '50' },
      ]);
      mockUserStreak.findAll.mockResolvedValue([
        { userId: 'user-1', currentStreak: 10 },
      ]);
      mockLeaderboardEntry.upsert.mockResolvedValue(undefined);

      const job = {
        id: 'job-1',
        data: { trigger: 'scheduled' },
      } as Job<LeaderboardJobData>;

      await processJob(job);

      // 3 periods × 4 metrics = 12 compute calls, but only some use sequelize.query
      // At minimum, upsert should be called for each score entry
      expect(mockLeaderboardEntry.upsert).toHaveBeenCalled();
    });

    it('should continue processing when individual metric fails', async () => {
      // First query fails, rest succeed
      mockSequelize.query
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValue([]);
      mockUserStreak.findAll.mockResolvedValue([]);
      mockLeaderboardEntry.upsert.mockResolvedValue(undefined);

      const job = {
        id: 'job-2',
        data: { trigger: 'manual' },
      } as Job<LeaderboardJobData>;

      // Should not throw despite individual metric failure
      await processJob(job);
    });

    it('should assign ranks in descending score order', async () => {
      mockSequelize.query.mockResolvedValue([
        { userId: 'user-2', score: '50' },
        { userId: 'user-1', score: '100' },
      ]);
      mockUserStreak.findAll.mockResolvedValue([]);
      mockLeaderboardEntry.upsert.mockResolvedValue(undefined);

      const job = {
        id: 'job-3',
        data: { trigger: 'scheduled' },
      } as Job<LeaderboardJobData>;

      await processJob(job);

      // Check that rank 1 gets highest score
      const upsertCalls = mockLeaderboardEntry.upsert.mock.calls;
      const rank1Call = upsertCalls.find(
        (call: unknown[]) => (call[0] as Record<string, unknown>).rank === 1 && (call[0] as Record<string, unknown>).userId === 'user-1'
      );
      expect(rank1Call).toBeDefined();
    });
  });
});
