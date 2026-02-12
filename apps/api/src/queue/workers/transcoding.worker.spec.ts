import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Job } from 'bullmq';
import type {
  TranscodingJobData,
  SubmitTranscodingJobData,
  CheckTranscodingStatusJobData,
} from '../transcoding.queue.js';

// =============================================================================
// Module Mocks
// =============================================================================

const mockLessonContentModel = {
  findByPk: vi.fn(),
};

const mockLessonModel = {
  update: vi.fn(),
};

const mockTranscodingProvider = {
  name: 'mock-transcoding',
  isAvailable: vi.fn().mockReturnValue(true),
  submit: vi.fn().mockResolvedValue({ uid: 'stream-abc', status: 'pending' }),
  getStatus: vi.fn().mockResolvedValue({ uid: 'stream-abc', status: 'processing' }),
  delete: vi.fn().mockResolvedValue(undefined),
};

const mockStorage = {
  name: 'mock-storage',
  getSignedUrl: vi.fn().mockResolvedValue('https://r2.example.com/signed/video.mp4'),
};

const mockAddCheckJob = vi.fn().mockResolvedValue(undefined);

const mockWorkerInstance = {
  on: vi.fn(),
  close: vi.fn().mockResolvedValue(undefined),
};

const workerCalls: Array<{ queueName: string; processor: Function; options: object }> = [];

class MockWorker {
  processor: Function;
  constructor(queueName: string, processor: Function, options: object) {
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

vi.mock('../transcoding.queue.js', () => ({
  TRANSCODING_QUEUE_NAME: 'transcoding',
  addCheckTranscodingStatusJob: (...args: unknown[]) => mockAddCheckJob(...args),
}));

vi.mock('../../database/models/index.js', () => ({
  LessonContent: mockLessonContentModel,
  Lesson: mockLessonModel,
}));

vi.mock('../../database/models/enums.js', () => ({
  TranscodingStatus: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    READY: 'ready',
    ERROR: 'error',
  },
}));

vi.mock('../../services/transcoding/index.js', () => ({
  getTranscoding: () => mockTranscodingProvider,
}));

vi.mock('../../storage/index.js', () => ({
  getStorage: () => mockStorage,
}));

vi.mock('../../config/index.js', () => ({
  config: {
    queue: { concurrency: 5 },
  },
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

describe('TranscodingWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    workerCalls.length = 0;
  });

  describe('startTranscodingWorker', () => {
    it('should create a worker with correct configuration', async () => {
      const { startTranscodingWorker } = await import('./transcoding.worker.js');

      startTranscodingWorker();

      expect(workerCalls.length).toBe(1);
      expect(workerCalls[0].queueName).toBe('transcoding');
      expect(workerCalls[0].options).toMatchObject({
        connection: { host: 'localhost', port: 6379 },
        concurrency: 5,
      });
    });

    it('should register event handlers', async () => {
      const { startTranscodingWorker } = await import('./transcoding.worker.js');

      startTranscodingWorker();

      expect(mockWorkerInstance.on).toHaveBeenCalledWith('completed', expect.any(Function));
      expect(mockWorkerInstance.on).toHaveBeenCalledWith('failed', expect.any(Function));
    });

    it('should return existing worker if already started', async () => {
      const { startTranscodingWorker } = await import('./transcoding.worker.js');

      const worker1 = startTranscodingWorker();
      const worker2 = startTranscodingWorker();

      expect(worker1).toBe(worker2);
      expect(workerCalls.length).toBe(1);
    });
  });

  describe('stopTranscodingWorker', () => {
    it('should close the worker', async () => {
      const { startTranscodingWorker, stopTranscodingWorker } = await import(
        './transcoding.worker.js'
      );

      startTranscodingWorker();
      await stopTranscodingWorker();

      expect(mockWorkerInstance.close).toHaveBeenCalled();
    });
  });

  describe('processTranscodingJob', () => {
    let processJob: (job: Job<TranscodingJobData>) => Promise<void>;

    beforeEach(async () => {
      vi.resetModules();
      workerCalls.length = 0;

      await import('./transcoding.worker.js').then((module) => {
        module.startTranscodingWorker();
      });

      processJob = workerCalls[0].processor as (
        job: Job<TranscodingJobData>
      ) => Promise<void>;
    });

    // =========================================================================
    // submit-transcoding
    // =========================================================================

    describe('submit-transcoding', () => {
      const mockContent = {
        id: 'content-123',
        lessonId: 'lesson-456',
        lang: 'en',
        update: vi.fn().mockResolvedValue(undefined),
      };

      it('should get signed URL, submit to provider, and enqueue status check', async () => {
        mockLessonContentModel.findByPk.mockResolvedValue(mockContent);

        const job = {
          id: 'job-1',
          data: {
            type: 'submit-transcoding',
            lessonContentId: 'content-123',
            lessonId: 'lesson-456',
            lang: 'en',
            videoSourceKey: 'videos/abc.mp4',
          },
        } as Job<SubmitTranscodingJobData>;

        await processJob(job);

        // Should get signed URL from storage
        expect(mockStorage.getSignedUrl).toHaveBeenCalledWith('videos/abc.mp4', { expiresIn: 3600 });

        // Should submit to transcoding provider
        expect(mockTranscodingProvider.submit).toHaveBeenCalledWith({
          url: 'https://r2.example.com/signed/video.mp4',
          meta: {
            lessonContentId: 'content-123',
            lessonId: 'lesson-456',
            lang: 'en',
          },
        });

        // Should update content with stream ID
        expect(mockContent.update).toHaveBeenCalledWith({
          videoStreamId: 'stream-abc',
          transcodingStatus: 'processing',
          transcodingError: null,
        });

        // Should enqueue safety-net check (single delayed check at max attempts)
        expect(mockAddCheckJob).toHaveBeenCalledWith(
          {
            lessonContentId: 'content-123',
            videoStreamId: 'stream-abc',
            attempt: 60,
          },
          600000
        );
      });

      it('should skip if lesson content not found', async () => {
        mockLessonContentModel.findByPk.mockResolvedValue(null);

        const job = {
          id: 'job-2',
          data: {
            type: 'submit-transcoding',
            lessonContentId: 'nonexistent',
            lessonId: 'lesson-456',
            lang: 'en',
            videoSourceKey: 'videos/abc.mp4',
          },
        } as Job<SubmitTranscodingJobData>;

        await processJob(job);

        expect(mockStorage.getSignedUrl).not.toHaveBeenCalled();
        expect(mockTranscodingProvider.submit).not.toHaveBeenCalled();
      });
    });

    // =========================================================================
    // check-transcoding-status
    // =========================================================================

    describe('check-transcoding-status', () => {
      const mockContent = {
        id: 'content-123',
        lessonId: 'lesson-456',
        transcodingStatus: 'processing',
        update: vi.fn().mockResolvedValue(undefined),
      };

      beforeEach(() => {
        mockLessonContentModel.findByPk.mockResolvedValue(mockContent);
        mockContent.update.mockClear();
      });

      it('should update content and lesson duration when status is ready', async () => {
        mockTranscodingProvider.getStatus.mockResolvedValue({
          uid: 'stream-abc',
          status: 'ready',
          playbackUrl: 'https://stream.cloudflare.com/abc/manifest/video.m3u8',
          duration: 120,
        });

        const job = {
          id: 'job-3',
          data: {
            type: 'check-transcoding-status',
            lessonContentId: 'content-123',
            videoStreamId: 'stream-abc',
            attempt: 1,
          },
        } as Job<CheckTranscodingStatusJobData>;

        await processJob(job);

        expect(mockContent.update).toHaveBeenCalledWith({
          transcodingStatus: 'ready',
          videoPlaybackUrl: 'https://stream.cloudflare.com/abc/manifest/video.m3u8',
          transcodingError: null,
        });

        expect(mockLessonModel.update).toHaveBeenCalledWith(
          { duration: 120 },
          { where: { id: 'lesson-456' } }
        );

        // Should NOT enqueue another check
        expect(mockAddCheckJob).not.toHaveBeenCalled();
      });

      it('should update content with error when status is error', async () => {
        mockTranscodingProvider.getStatus.mockResolvedValue({
          uid: 'stream-abc',
          status: 'error',
          errorMessage: 'Invalid video format',
        });

        const job = {
          id: 'job-4',
          data: {
            type: 'check-transcoding-status',
            lessonContentId: 'content-123',
            videoStreamId: 'stream-abc',
            attempt: 1,
          },
        } as Job<CheckTranscodingStatusJobData>;

        await processJob(job);

        expect(mockContent.update).toHaveBeenCalledWith({
          transcodingStatus: 'error',
          transcodingError: 'Invalid video format',
        });

        expect(mockAddCheckJob).not.toHaveBeenCalled();
      });

      it('should re-enqueue check when status is processing', async () => {
        mockTranscodingProvider.getStatus.mockResolvedValue({
          uid: 'stream-abc',
          status: 'processing',
        });

        const job = {
          id: 'job-5',
          data: {
            type: 'check-transcoding-status',
            lessonContentId: 'content-123',
            videoStreamId: 'stream-abc',
            attempt: 5,
          },
        } as Job<CheckTranscodingStatusJobData>;

        await processJob(job);

        expect(mockAddCheckJob).toHaveBeenCalledWith(
          {
            lessonContentId: 'content-123',
            videoStreamId: 'stream-abc',
            attempt: 6,
          },
          30000
        );
      });

      it('should re-enqueue check when status is pending', async () => {
        mockTranscodingProvider.getStatus.mockResolvedValue({
          uid: 'stream-abc',
          status: 'pending',
        });

        const job = {
          id: 'job-6',
          data: {
            type: 'check-transcoding-status',
            lessonContentId: 'content-123',
            videoStreamId: 'stream-abc',
            attempt: 1,
          },
        } as Job<CheckTranscodingStatusJobData>;

        await processJob(job);

        expect(mockAddCheckJob).toHaveBeenCalledWith(
          {
            lessonContentId: 'content-123',
            videoStreamId: 'stream-abc',
            attempt: 2,
          },
          30000
        );
      });

      it('should timeout after 60 attempts', async () => {
        mockTranscodingProvider.getStatus.mockResolvedValue({
          uid: 'stream-abc',
          status: 'processing',
        });

        const job = {
          id: 'job-7',
          data: {
            type: 'check-transcoding-status',
            lessonContentId: 'content-123',
            videoStreamId: 'stream-abc',
            attempt: 60,
          },
        } as Job<CheckTranscodingStatusJobData>;

        await processJob(job);

        expect(mockContent.update).toHaveBeenCalledWith({
          transcodingStatus: 'error',
          transcodingError: 'Transcoding timed out after 30 minutes',
        });

        expect(mockAddCheckJob).not.toHaveBeenCalled();
      });

      it('should skip if lesson content not found', async () => {
        mockLessonContentModel.findByPk.mockResolvedValue(null);

        const job = {
          id: 'job-8',
          data: {
            type: 'check-transcoding-status',
            lessonContentId: 'nonexistent',
            videoStreamId: 'stream-abc',
            attempt: 1,
          },
        } as Job<CheckTranscodingStatusJobData>;

        await processJob(job);

        expect(mockTranscodingProvider.getStatus).not.toHaveBeenCalled();
      });

      it('should skip check if already in terminal state (READY)', async () => {
        const terminalContent = { ...mockContent, transcodingStatus: 'ready' };
        mockLessonContentModel.findByPk.mockResolvedValue(terminalContent);

        const job = {
          id: 'job-terminal',
          data: {
            type: 'check-transcoding-status',
            lessonContentId: 'content-123',
            videoStreamId: 'stream-abc',
            attempt: 60,
          },
        } as Job<CheckTranscodingStatusJobData>;

        await processJob(job);

        expect(mockTranscodingProvider.getStatus).not.toHaveBeenCalled();
      });

      it('should skip check if already in terminal state (ERROR)', async () => {
        const terminalContent = { ...mockContent, transcodingStatus: 'error' };
        mockLessonContentModel.findByPk.mockResolvedValue(terminalContent);

        const job = {
          id: 'job-terminal-err',
          data: {
            type: 'check-transcoding-status',
            lessonContentId: 'content-123',
            videoStreamId: 'stream-abc',
            attempt: 60,
          },
        } as Job<CheckTranscodingStatusJobData>;

        await processJob(job);

        expect(mockTranscodingProvider.getStatus).not.toHaveBeenCalled();
      });

      it('should not update lesson duration when duration is 0', async () => {
        mockTranscodingProvider.getStatus.mockResolvedValue({
          uid: 'stream-abc',
          status: 'ready',
          playbackUrl: 'https://stream.example.com/manifest.m3u8',
          duration: 0,
        });

        const job = {
          id: 'job-9',
          data: {
            type: 'check-transcoding-status',
            lessonContentId: 'content-123',
            videoStreamId: 'stream-abc',
            attempt: 1,
          },
        } as Job<CheckTranscodingStatusJobData>;

        await processJob(job);

        expect(mockContent.update).toHaveBeenCalledWith(
          expect.objectContaining({ transcodingStatus: 'ready' })
        );
        expect(mockLessonModel.update).not.toHaveBeenCalled();
      });
    });
  });
});
