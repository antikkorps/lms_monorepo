import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationType } from '../../database/models/enums.js';
import type { Job } from 'bullmq';
import type { NotificationEmailJobData } from '../notification.queue.js';

// =============================================================================
// Module Mocks
// =============================================================================

const mockLessonModel = {
  findByPk: vi.fn(),
};

const mockCourseModel = {
  findByPk: vi.fn(),
};

const mockBadgeModel = {
  findByPk: vi.fn(),
};

const mockEmailService = {
  sendNotificationEmail: vi.fn().mockResolvedValue(undefined),
};

const mockWorkerInstance = {
  on: vi.fn(),
  close: vi.fn().mockResolvedValue(undefined),
};

// Store Worker calls for assertions
const workerCalls: Array<{ queueName: string; processor: (...args: unknown[]) => unknown; options: object }> = [];

// Create a proper class mock for Worker
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

vi.mock('../notification.queue.js', () => ({
  NOTIFICATION_QUEUE_NAME: 'notification-emails',
}));

vi.mock('../../database/models/index.js', () => ({
  Lesson: mockLessonModel,
  Course: mockCourseModel,
  Badge: mockBadgeModel,
}));

vi.mock('../../services/email/index.js', () => ({
  emailService: mockEmailService,
}));

vi.mock('../../config/index.js', () => ({
  config: {
    frontendUrl: 'https://app.test.com',
    queue: {
      concurrency: 5,
    },
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

describe('NotificationWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    workerCalls.length = 0;
  });

  describe('startNotificationWorker', () => {
    it('should create a worker with correct configuration', async () => {
      const { startNotificationWorker } = await import('./notification.worker.js');

      startNotificationWorker();

      expect(workerCalls.length).toBe(1);
      expect(workerCalls[0].queueName).toBe('notification-emails');
      expect(workerCalls[0].options).toMatchObject({
        connection: { host: 'localhost', port: 6379 },
        concurrency: 5,
      });
    });

    it('should register event handlers', async () => {
      const { startNotificationWorker } = await import('./notification.worker.js');

      startNotificationWorker();

      expect(mockWorkerInstance.on).toHaveBeenCalledWith('completed', expect.any(Function));
      expect(mockWorkerInstance.on).toHaveBeenCalledWith('failed', expect.any(Function));
    });

    it('should return existing worker if already started', async () => {
      const { startNotificationWorker } = await import('./notification.worker.js');

      const worker1 = startNotificationWorker();
      const worker2 = startNotificationWorker();

      expect(worker1).toBe(worker2);
      expect(workerCalls.length).toBe(1);
    });
  });

  describe('stopNotificationWorker', () => {
    it('should close the worker', async () => {
      const { startNotificationWorker, stopNotificationWorker } = await import(
        './notification.worker.js'
      );

      startNotificationWorker();
      await stopNotificationWorker();

      expect(mockWorkerInstance.close).toHaveBeenCalled();
    });
  });

  describe('processNotificationEmail', () => {
    let processJob: (job: Job<NotificationEmailJobData>) => Promise<void>;

    beforeEach(async () => {
      vi.resetModules();
      workerCalls.length = 0;

      // Re-import to get fresh module
      await import('./notification.worker.js').then((module) => {
        module.startNotificationWorker();
      });

      // Get the processor function from the Worker constructor call
      processJob = workerCalls[0].processor as (
        job: Job<NotificationEmailJobData>
      ) => Promise<void>;
    });

    it('should process lesson completed notification', async () => {
      mockLessonModel.findByPk.mockResolvedValue({ title: 'Intro to Testing' });
      mockCourseModel.findByPk.mockResolvedValue({ title: 'Testing 101' });

      const job = {
        id: 'job-1',
        data: {
          userId: 'user-123',
          userEmail: 'user@test.com',
          userFirstName: 'John',
          type: NotificationType.LESSON_COMPLETED,
          data: { lessonId: 'lesson-1', courseId: 'course-1' },
        },
      } as Job<NotificationEmailJobData>;

      await processJob(job);

      expect(mockEmailService.sendNotificationEmail).toHaveBeenCalledWith({
        to: 'user@test.com',
        firstName: 'John',
        type: 'lesson_completed',
        lessonName: 'Intro to Testing',
        courseName: 'Testing 101',
        courseUrl: 'https://app.test.com/courses/course-1',
      });
    });

    it('should process course completed notification', async () => {
      mockCourseModel.findByPk.mockResolvedValue({ title: 'Advanced Testing' });

      const job = {
        id: 'job-2',
        data: {
          userId: 'user-123',
          userEmail: 'user@test.com',
          userFirstName: 'Jane',
          type: NotificationType.COURSE_COMPLETED,
          data: { courseId: 'course-2' },
        },
      } as Job<NotificationEmailJobData>;

      await processJob(job);

      expect(mockEmailService.sendNotificationEmail).toHaveBeenCalledWith({
        to: 'user@test.com',
        firstName: 'Jane',
        type: 'course_completed',
        courseName: 'Advanced Testing',
        dashboardUrl: 'https://app.test.com/dashboard',
        certificateUrl: 'https://app.test.com/certificates/course-2',
      });
    });

    it('should process badge earned notification', async () => {
      mockBadgeModel.findByPk.mockResolvedValue({
        name: 'First Steps',
        description: 'Completed your first lesson',
        imageUrl: 'https://cdn.test.com/badges/first-steps.png',
      });

      const job = {
        id: 'job-3',
        data: {
          userId: 'user-123',
          userEmail: 'user@test.com',
          userFirstName: 'Bob',
          type: NotificationType.BADGE_EARNED,
          data: { badgeId: 'badge-1' },
          locale: 'en',
        },
      } as Job<NotificationEmailJobData>;

      await processJob(job);

      expect(mockEmailService.sendNotificationEmail).toHaveBeenCalledWith({
        to: 'user@test.com',
        firstName: 'Bob',
        type: 'badge_earned',
        badgeName: 'First Steps',
        badgeDescription: 'Completed your first lesson',
        badgeIconUrl: 'https://cdn.test.com/badges/first-steps.png',
        profileUrl: 'https://app.test.com/profile/badges',
        locale: 'en',
      });
    });

    it('should use fallback names when entities not found', async () => {
      mockLessonModel.findByPk.mockResolvedValue(null);
      mockCourseModel.findByPk.mockResolvedValue(null);

      const job = {
        id: 'job-4',
        data: {
          userId: 'user-123',
          userEmail: 'user@test.com',
          userFirstName: 'Alice',
          type: NotificationType.LESSON_COMPLETED,
          data: {
            lessonId: 'deleted-lesson',
            courseId: 'deleted-course',
            lessonName: 'Cached Lesson Name',
            courseName: 'Cached Course Name',
          },
        },
      } as Job<NotificationEmailJobData>;

      await processJob(job);

      expect(mockEmailService.sendNotificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          lessonName: 'Cached Lesson Name',
          courseName: 'Cached Course Name',
        })
      );
    });

    it('should skip unsupported notification types', async () => {
      const job = {
        id: 'job-5',
        data: {
          userId: 'user-123',
          userEmail: 'user@test.com',
          userFirstName: 'Test',
          type: NotificationType.QUIZ_PASSED,
          data: {},
        },
      } as Job<NotificationEmailJobData>;

      await processJob(job);

      expect(mockEmailService.sendNotificationEmail).not.toHaveBeenCalled();
    });

    it('should throw error when email service fails', async () => {
      mockCourseModel.findByPk.mockResolvedValue({ title: 'Test Course' });
      mockEmailService.sendNotificationEmail.mockRejectedValueOnce(new Error('SMTP error'));

      const job = {
        id: 'job-6',
        data: {
          userId: 'user-123',
          userEmail: 'user@test.com',
          userFirstName: 'Error',
          type: NotificationType.COURSE_COMPLETED,
          data: { courseId: 'course-1' },
        },
      } as Job<NotificationEmailJobData>;

      await expect(processJob(job)).rejects.toThrow('SMTP error');
    });
  });
});
