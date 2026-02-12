import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context } from 'koa';

// =============================================================================
// Module Mocks — vi.hoisted so they're available inside vi.mock factories
// =============================================================================

const {
  mockLessonContentModel,
  mockLessonModel,
  mockIsTranscodingAvailable,
  mockAddSubmitJob,
} = vi.hoisted(() => ({
  mockLessonContentModel: {
    findOne: vi.fn(),
  },
  mockLessonModel: {
    findByPk: vi.fn(),
  },
  mockIsTranscodingAvailable: vi.fn().mockReturnValue(true),
  mockAddSubmitJob: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../database/models/index.js', () => ({
  LessonContent: mockLessonContentModel,
  Lesson: mockLessonModel,
  Chapter: { findByPk: vi.fn() },
  Course: { findByPk: vi.fn() },
}));

vi.mock('../database/models/enums.js', () => ({
  UserRole: {
    SUPER_ADMIN: 'super_admin',
    TENANT_ADMIN: 'tenant_admin',
    INSTRUCTOR: 'instructor',
  },
  SupportedLocale: {
    EN: 'en',
    FR: 'fr',
  },
  TranscodingStatus: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    READY: 'ready',
    ERROR: 'error',
  },
}));

vi.mock('../services/transcoding/index.js', () => ({
  isTranscodingAvailable: (...args: unknown[]) => mockIsTranscodingAvailable(...args),
}));

vi.mock('../queue/index.js', () => ({
  addSubmitTranscodingJob: (...args: unknown[]) => mockAddSubmitJob(...args),
}));

vi.mock('../utils/app-error.js', () => ({
  AppError: {
    notFound: (msg: string) => Object.assign(new Error(msg), { status: 404 }),
    badRequest: (msg: string) => Object.assign(new Error(msg), { status: 400 }),
    unauthorized: (msg: string) => Object.assign(new Error(msg), { status: 401 }),
    forbidden: (msg: string) => Object.assign(new Error(msg), { status: 403 }),
  },
}));

vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { getTranscodingStatus, retryTranscoding } from './transcoding.controller.js';

// =============================================================================
// Helpers
// =============================================================================

function createMockContext(options: {
  params?: Record<string, string>;
  state?: Record<string, unknown>;
} = {}): Context {
  return {
    params: options.params || {},
    query: {},
    request: { body: {} },
    state: options.state || {},
    status: 200,
    body: null,
  } as unknown as Context;
}

const superAdminState = {
  user: { userId: 'user-1', email: 'admin@test.com', role: 'super_admin' },
};

// =============================================================================
// Tests
// =============================================================================

describe('Transcoding Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsTranscodingAvailable.mockReturnValue(true);
  });

  describe('getTranscodingStatus', () => {
    it('should return transcoding status fields', async () => {
      mockLessonContentModel.findOne.mockResolvedValue({
        transcodingStatus: 'processing',
        videoPlaybackUrl: null,
        videoStreamId: 'stream-abc',
        transcodingError: null,
        videoSourceKey: 'videos/test.mp4',
      });

      const ctx = createMockContext({
        params: { lessonId: 'lesson-1', lang: 'en' },
      });

      await getTranscodingStatus(ctx);

      const data = (ctx.body as { data: Record<string, unknown> }).data;
      expect(data.transcodingStatus).toBe('processing');
      expect(data.videoStreamId).toBe('stream-abc');
      expect(data.videoSourceKey).toBe('videos/test.mp4');
    });

    it('should throw not found if content does not exist', async () => {
      mockLessonContentModel.findOne.mockResolvedValue(null);

      const ctx = createMockContext({
        params: { lessonId: 'lesson-1', lang: 'en' },
      });

      await expect(getTranscodingStatus(ctx)).rejects.toThrow(/not found/i);
    });

    it('should throw bad request for invalid locale', async () => {
      const ctx = createMockContext({
        params: { lessonId: 'lesson-1', lang: 'invalid' },
      });

      await expect(getTranscodingStatus(ctx)).rejects.toThrow(/invalid locale/i);
    });
  });

  describe('retryTranscoding', () => {
    it('should retry transcoding for content with error status', async () => {
      const content = {
        id: 'content-123',
        lessonId: 'lesson-1',
        lang: 'en',
        transcodingStatus: 'error',
        videoSourceKey: 'videos/failed.mp4',
        update: vi.fn().mockResolvedValue(undefined),
      };
      mockLessonContentModel.findOne.mockResolvedValue(content);

      const ctx = createMockContext({
        params: { lessonId: 'lesson-1', lang: 'en' },
        state: superAdminState,
      });

      await retryTranscoding(ctx);

      expect(content.update).toHaveBeenCalledWith({
        transcodingStatus: 'pending',
        transcodingError: null,
        videoPlaybackUrl: null,
        videoStreamId: null,
        videoThumbnailUrl: null,
      });

      expect(mockAddSubmitJob).toHaveBeenCalledWith({
        lessonContentId: 'content-123',
        lessonId: 'lesson-1',
        lang: 'en',
        videoSourceKey: 'videos/failed.mp4',
      });
    });

    it('should throw bad request when status is not error', async () => {
      mockLessonContentModel.findOne.mockResolvedValue({
        id: 'content-123',
        transcodingStatus: 'processing',
        videoSourceKey: 'videos/test.mp4',
      });

      const ctx = createMockContext({
        params: { lessonId: 'lesson-1', lang: 'en' },
        state: superAdminState,
      });

      await expect(retryTranscoding(ctx)).rejects.toThrow(/error status/i);
    });

    it('should throw bad request when no video source key', async () => {
      mockLessonContentModel.findOne.mockResolvedValue({
        id: 'content-123',
        transcodingStatus: 'error',
        videoSourceKey: null,
      });

      const ctx = createMockContext({
        params: { lessonId: 'lesson-1', lang: 'en' },
        state: superAdminState,
      });

      await expect(retryTranscoding(ctx)).rejects.toThrow(/video source key/i);
    });

    it('should throw bad request when transcoding not available', async () => {
      mockIsTranscodingAvailable.mockReturnValue(false);

      const ctx = createMockContext({
        params: { lessonId: 'lesson-1', lang: 'en' },
        state: superAdminState,
      });

      await expect(retryTranscoding(ctx)).rejects.toThrow(/not available/i);
    });

    it('should throw not found when content does not exist', async () => {
      mockLessonContentModel.findOne.mockResolvedValue(null);

      const ctx = createMockContext({
        params: { lessonId: 'lesson-1', lang: 'en' },
        state: superAdminState,
      });

      await expect(retryTranscoding(ctx)).rejects.toThrow(/not found/i);
    });

    it('should throw unauthorized when no user in context', async () => {
      const ctx = createMockContext({
        params: { lessonId: 'lesson-1', lang: 'en' },
        state: {},
      });

      await expect(retryTranscoding(ctx)).rejects.toThrow(/authentication/i);
    });
  });
});
