import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Job } from 'bullmq';
import type { StreakJobData } from '../streak.queue.js';

// =============================================================================
// Module Mocks
// =============================================================================

const mockRecordActivity = vi.fn();
const mockRecalculateStreak = vi.fn();

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

vi.mock('../streak.queue.js', () => ({
  STREAK_QUEUE_NAME: 'streak-updates',
}));

vi.mock('../../streaks/controller.js', () => ({
  recordActivity: mockRecordActivity,
  recalculateStreak: mockRecalculateStreak,
}));

vi.mock('../../config/index.js', () => ({
  config: {
    queue: { concurrency: 3 },
  },
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

describe('StreakWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    workerCalls.length = 0;
  });

  describe('startStreakWorker', () => {
    it('should create a worker with correct configuration', async () => {
      const { startStreakWorker } = await import('./streak.worker.js');

      startStreakWorker();

      expect(workerCalls.length).toBe(1);
      expect(workerCalls[0].queueName).toBe('streak-updates');
      expect(workerCalls[0].options).toMatchObject({
        connection: { host: 'localhost', port: 6379 },
        concurrency: 3,
      });
    });

    it('should register event handlers', async () => {
      const { startStreakWorker } = await import('./streak.worker.js');

      startStreakWorker();

      expect(mockWorkerInstance.on).toHaveBeenCalledWith('completed', expect.any(Function));
      expect(mockWorkerInstance.on).toHaveBeenCalledWith('failed', expect.any(Function));
    });

    it('should return existing worker if already started', async () => {
      const { startStreakWorker } = await import('./streak.worker.js');

      const worker1 = startStreakWorker();
      const worker2 = startStreakWorker();

      expect(worker1).toBe(worker2);
      expect(workerCalls.length).toBe(1);
    });
  });

  describe('stopStreakWorker', () => {
    it('should close the worker', async () => {
      const { startStreakWorker, stopStreakWorker } = await import('./streak.worker.js');

      startStreakWorker();
      await stopStreakWorker();

      expect(mockWorkerInstance.close).toHaveBeenCalled();
    });

    it('should do nothing if worker not started', async () => {
      const { stopStreakWorker } = await import('./streak.worker.js');

      await stopStreakWorker();

      expect(mockWorkerInstance.close).not.toHaveBeenCalled();
    });
  });

  describe('processStreakUpdate', () => {
    let processJob: (job: Job<StreakJobData>) => Promise<void>;

    beforeEach(async () => {
      vi.resetModules();
      workerCalls.length = 0;

      await import('./streak.worker.js').then((module) => {
        module.startStreakWorker();
      });

      processJob = workerCalls[0].processor as (job: Job<StreakJobData>) => Promise<void>;
    });

    it('should record activity and recalculate streak', async () => {
      mockRecordActivity.mockResolvedValue(undefined);
      mockRecalculateStreak.mockResolvedValue(undefined);

      const job = {
        id: 'job-1',
        data: {
          userId: 'user-123',
          activityType: 'lesson_completed',
          referenceId: 'lesson-1',
        },
      } as Job<StreakJobData>;

      await processJob(job);

      expect(mockRecordActivity).toHaveBeenCalledWith('user-123', 'lesson_completed', 'lesson-1');
      expect(mockRecalculateStreak).toHaveBeenCalledWith('user-123');
    });

    it('should handle job without referenceId', async () => {
      mockRecordActivity.mockResolvedValue(undefined);
      mockRecalculateStreak.mockResolvedValue(undefined);

      const job = {
        id: 'job-2',
        data: {
          userId: 'user-456',
          activityType: 'quiz_completed',
        },
      } as Job<StreakJobData>;

      await processJob(job);

      expect(mockRecordActivity).toHaveBeenCalledWith('user-456', 'quiz_completed', undefined);
    });

    it('should throw error when recordActivity fails', async () => {
      mockRecordActivity.mockRejectedValue(new Error('DB error'));

      const job = {
        id: 'job-3',
        data: {
          userId: 'user-123',
          activityType: 'lesson_completed',
        },
      } as Job<StreakJobData>;

      await expect(processJob(job)).rejects.toThrow('DB error');
    });

    it('should throw error when recalculateStreak fails', async () => {
      mockRecordActivity.mockResolvedValue(undefined);
      mockRecalculateStreak.mockRejectedValue(new Error('Calculation error'));

      const job = {
        id: 'job-4',
        data: {
          userId: 'user-123',
          activityType: 'lesson_completed',
        },
      } as Job<StreakJobData>;

      await expect(processJob(job)).rejects.toThrow('Calculation error');
    });
  });
});
