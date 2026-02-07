import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context } from 'koa';

// =============================================================================
// Module Mocks — vi.hoisted so they're available inside vi.mock factories
// =============================================================================

const {
  mockLessonContentModel,
  mockLessonModel,
  mockIsTranscodingAvailable,
  mockGetTranscoding,
  mockAddSubmitJob,
} = vi.hoisted(() => ({
  mockLessonContentModel: {
    findAll: vi.fn(),
    findOne: vi.fn(),
    findOrCreate: vi.fn(),
    create: vi.fn(),
  },
  mockLessonModel: {
    findByPk: vi.fn(),
  },
  mockIsTranscodingAvailable: vi.fn().mockReturnValue(false),
  mockGetTranscoding: vi.fn().mockReturnValue({
    delete: vi.fn().mockResolvedValue(undefined),
  }),
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
    LEARNER: 'learner',
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
  getTranscoding: (...args: unknown[]) => mockGetTranscoding(...args),
}));

vi.mock('../queue/index.js', () => ({
  addSubmitTranscodingJob: (...args: unknown[]) => mockAddSubmitJob(...args),
}));

vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../utils/app-error.js', () => ({
  AppError: {
    notFound: (msg: string) => Object.assign(new Error(msg), { status: 404, code: 'NOT_FOUND' }),
    badRequest: (msg: string) => Object.assign(new Error(msg), { status: 400, code: 'BAD_REQUEST' }),
    unauthorized: (msg: string) => Object.assign(new Error(msg), { status: 401, code: 'UNAUTHORIZED' }),
    forbidden: (msg: string) => Object.assign(new Error(msg), { status: 403, code: 'FORBIDDEN' }),
    conflict: (msg: string) => Object.assign(new Error(msg), { status: 409, code: 'CONFLICT' }),
  },
}));

// Import after mocks
import {
  listLessonContents,
  getLessonContentByLang,
  createLessonContent,
  upsertLessonContent,
  updateLessonContent,
  deleteLessonContent,
} from './controller.js';

// =============================================================================
// Helpers
// =============================================================================

interface MockContextOptions {
  params?: Record<string, string>;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  state?: Record<string, unknown>;
}

function createMockContext(options: MockContextOptions = {}): Context {
  return {
    params: options.params || {},
    query: options.query || {},
    request: { body: options.body || {} },
    state: options.state || {},
    status: 200,
    body: null,
  } as unknown as Context;
}

function createMockContentInstance(overrides: Record<string, unknown> = {}) {
  const data = {
    id: 'content-123',
    lessonId: 'lesson-456',
    lang: 'en',
    title: 'Test Lesson',
    videoUrl: 'https://example.com/video.mp4',
    videoId: null,
    transcript: null,
    description: 'A test lesson',
    transcodingStatus: null,
    videoSourceKey: null,
    videoPlaybackUrl: null,
    videoStreamId: null,
    transcodingError: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };

  return {
    ...data,
    update: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn().mockResolvedValue(undefined),
  };
}

const superAdminState = {
  user: { userId: 'user-1', email: 'admin@test.com', role: 'super_admin' },
};

// =============================================================================
// Tests
// =============================================================================

describe('LessonContent Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLessonModel.findByPk.mockResolvedValue({ id: 'lesson-456' });
    mockIsTranscodingAvailable.mockReturnValue(false);
  });

  // ===========================================================================
  // listLessonContents
  // ===========================================================================

  describe('listLessonContents', () => {
    it('should return contents with transcoding fields', async () => {
      const content = createMockContentInstance({ transcodingStatus: 'ready', videoPlaybackUrl: 'https://stream.example.com/hls.m3u8' });
      mockLessonContentModel.findAll.mockResolvedValue([content]);

      const ctx = createMockContext({ params: { lessonId: 'lesson-456' } });
      await listLessonContents(ctx);

      const data = (ctx.body as { data: unknown[] }).data;
      expect(data).toHaveLength(1);
      expect(data[0]).toMatchObject({
        transcodingStatus: 'ready',
        videoPlaybackUrl: 'https://stream.example.com/hls.m3u8',
        videoStreamId: null,
        transcodingError: null,
        videoSourceKey: null,
      });
    });
  });

  // ===========================================================================
  // getLessonContentByLang
  // ===========================================================================

  describe('getLessonContentByLang', () => {
    it('should return content with transcoding fields', async () => {
      const content = createMockContentInstance({
        transcodingStatus: 'processing',
        videoStreamId: 'stream-xyz',
      });
      mockLessonContentModel.findOne.mockResolvedValue(content);

      const ctx = createMockContext({ params: { lessonId: 'lesson-456', lang: 'en' } });
      await getLessonContentByLang(ctx);

      const data = (ctx.body as { data: Record<string, unknown> }).data;
      expect(data.transcodingStatus).toBe('processing');
      expect(data.videoStreamId).toBe('stream-xyz');
    });

    it('should return null data when content not found', async () => {
      mockLessonContentModel.findOne.mockResolvedValue(null);

      const ctx = createMockContext({ params: { lessonId: 'lesson-456', lang: 'en' } });
      await getLessonContentByLang(ctx);

      expect((ctx.body as { data: null }).data).toBeNull();
    });
  });

  // ===========================================================================
  // createLessonContent — transcoding trigger
  // ===========================================================================

  describe('createLessonContent', () => {
    it('should trigger transcoding when videoSourceKey provided and transcoding available', async () => {
      mockIsTranscodingAvailable.mockReturnValue(true);
      mockLessonContentModel.findOne.mockResolvedValue(null); // no existing content

      const content = createMockContentInstance({
        videoSourceKey: 'videos/upload.mp4',
      });
      mockLessonContentModel.create.mockResolvedValue(content);

      const ctx = createMockContext({
        params: { lessonId: 'lesson-456' },
        body: {
          lang: 'en',
          title: 'Test',
          videoSourceKey: 'videos/upload.mp4',
        },
        state: superAdminState,
      });

      await createLessonContent(ctx);

      expect(ctx.status).toBe(201);

      // Should update content with pending status
      expect(content.update).toHaveBeenCalledWith(
        expect.objectContaining({
          transcodingStatus: 'pending',
          transcodingError: null,
        })
      );

      // Should enqueue submit job
      expect(mockAddSubmitJob).toHaveBeenCalledWith({
        lessonContentId: 'content-123',
        lessonId: 'lesson-456',
        lang: 'en',
        videoSourceKey: 'videos/upload.mp4',
      });
    });

    it('should NOT trigger transcoding when transcoding unavailable', async () => {
      mockIsTranscodingAvailable.mockReturnValue(false);
      mockLessonContentModel.findOne.mockResolvedValue(null);

      const content = createMockContentInstance({ videoSourceKey: 'videos/upload.mp4' });
      mockLessonContentModel.create.mockResolvedValue(content);

      const ctx = createMockContext({
        params: { lessonId: 'lesson-456' },
        body: { lang: 'en', videoSourceKey: 'videos/upload.mp4' },
        state: superAdminState,
      });

      await createLessonContent(ctx);

      expect(ctx.status).toBe(201);
      expect(mockAddSubmitJob).not.toHaveBeenCalled();
    });

    it('should NOT trigger transcoding when no videoSourceKey', async () => {
      mockIsTranscodingAvailable.mockReturnValue(true);
      mockLessonContentModel.findOne.mockResolvedValue(null);

      const content = createMockContentInstance();
      mockLessonContentModel.create.mockResolvedValue(content);

      const ctx = createMockContext({
        params: { lessonId: 'lesson-456' },
        body: { lang: 'en', title: 'No video' },
        state: superAdminState,
      });

      await createLessonContent(ctx);

      expect(ctx.status).toBe(201);
      expect(mockAddSubmitJob).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // upsertLessonContent — transcoding trigger
  // ===========================================================================

  describe('upsertLessonContent', () => {
    it('should trigger transcoding on upsert with videoSourceKey', async () => {
      mockIsTranscodingAvailable.mockReturnValue(true);

      const content = createMockContentInstance({ videoSourceKey: 'videos/new.mp4' });
      mockLessonContentModel.findOrCreate.mockResolvedValue([content, true]);

      const ctx = createMockContext({
        params: { lessonId: 'lesson-456' },
        body: { lang: 'en', title: 'Upserted', videoSourceKey: 'videos/new.mp4' },
        state: superAdminState,
      });

      await upsertLessonContent(ctx);

      expect(ctx.status).toBe(201);
      expect(content.update).toHaveBeenCalledWith(
        expect.objectContaining({ transcodingStatus: 'pending' })
      );
      expect(mockAddSubmitJob).toHaveBeenCalled();
    });

    it('should trigger transcoding on update path with new videoSourceKey', async () => {
      mockIsTranscodingAvailable.mockReturnValue(true);

      const content = createMockContentInstance();
      mockLessonContentModel.findOrCreate.mockResolvedValue([content, false]);

      const ctx = createMockContext({
        params: { lessonId: 'lesson-456' },
        body: { lang: 'en', videoSourceKey: 'videos/replaced.mp4' },
        state: superAdminState,
      });

      await upsertLessonContent(ctx);

      expect(ctx.status).toBe(200);
      // update called twice: once for content fields, once for transcoding trigger
      expect(content.update).toHaveBeenCalledTimes(2);
      expect(mockAddSubmitJob).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // updateLessonContent — transcoding trigger
  // ===========================================================================

  describe('updateLessonContent', () => {
    it('should trigger transcoding when videoSourceKey updated', async () => {
      mockIsTranscodingAvailable.mockReturnValue(true);

      const content = createMockContentInstance();
      mockLessonContentModel.findOne.mockResolvedValue(content);

      const ctx = createMockContext({
        params: { lessonId: 'lesson-456', lang: 'en' },
        body: { videoSourceKey: 'videos/updated.mp4' },
        state: superAdminState,
      });

      await updateLessonContent(ctx);

      expect(content.update).toHaveBeenCalledTimes(2); // fields + transcoding
      expect(mockAddSubmitJob).toHaveBeenCalledWith(
        expect.objectContaining({ videoSourceKey: 'videos/updated.mp4' })
      );
    });
  });

  // ===========================================================================
  // deleteLessonContent — Stream cleanup
  // ===========================================================================

  describe('deleteLessonContent', () => {
    it('should delete Cloudflare Stream asset when videoStreamId exists', async () => {
      mockIsTranscodingAvailable.mockReturnValue(true);
      const mockDelete = vi.fn().mockResolvedValue(undefined);
      mockGetTranscoding.mockReturnValue({ delete: mockDelete });

      const content = createMockContentInstance({ videoStreamId: 'stream-to-delete' });
      mockLessonContentModel.findOne.mockResolvedValue(content);

      const ctx = createMockContext({
        params: { lessonId: 'lesson-456', lang: 'en' },
        state: superAdminState,
      });

      await deleteLessonContent(ctx);

      expect(mockDelete).toHaveBeenCalledWith('stream-to-delete');
      expect(content.destroy).toHaveBeenCalled();
      expect(ctx.status).toBe(204);
    });

    it('should NOT attempt Stream delete when no videoStreamId', async () => {
      mockIsTranscodingAvailable.mockReturnValue(true);
      const mockDelete = vi.fn();
      mockGetTranscoding.mockReturnValue({ delete: mockDelete });

      const content = createMockContentInstance({ videoStreamId: null });
      mockLessonContentModel.findOne.mockResolvedValue(content);

      const ctx = createMockContext({
        params: { lessonId: 'lesson-456', lang: 'en' },
        state: superAdminState,
      });

      await deleteLessonContent(ctx);

      expect(mockDelete).not.toHaveBeenCalled();
      expect(content.destroy).toHaveBeenCalled();
    });

    it('should still delete content even if Stream delete fails', async () => {
      mockIsTranscodingAvailable.mockReturnValue(true);
      const mockDelete = vi.fn().mockRejectedValue(new Error('Stream API error'));
      mockGetTranscoding.mockReturnValue({ delete: mockDelete });

      const content = createMockContentInstance({ videoStreamId: 'stream-broken' });
      mockLessonContentModel.findOne.mockResolvedValue(content);

      const ctx = createMockContext({
        params: { lessonId: 'lesson-456', lang: 'en' },
        state: superAdminState,
      });

      await deleteLessonContent(ctx);

      // Should still destroy content even though Stream delete failed
      expect(content.destroy).toHaveBeenCalled();
      expect(ctx.status).toBe(204);
    });

    it('should skip Stream delete when transcoding not available', async () => {
      mockIsTranscodingAvailable.mockReturnValue(false);

      const content = createMockContentInstance({ videoStreamId: 'stream-123' });
      mockLessonContentModel.findOne.mockResolvedValue(content);

      const ctx = createMockContext({
        params: { lessonId: 'lesson-456', lang: 'en' },
        state: superAdminState,
      });

      await deleteLessonContent(ctx);

      expect(mockGetTranscoding).not.toHaveBeenCalled();
      expect(content.destroy).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Response serialization
  // ===========================================================================

  describe('response serialization', () => {
    it('should include all transcoding fields in list response', async () => {
      const content = createMockContentInstance({
        transcodingStatus: 'ready',
        videoSourceKey: 'videos/source.mp4',
        videoPlaybackUrl: 'https://stream.example.com/hls.m3u8',
        videoStreamId: 'stream-final',
        transcodingError: null,
      });
      mockLessonContentModel.findAll.mockResolvedValue([content]);

      const ctx = createMockContext({ params: { lessonId: 'lesson-456' } });
      await listLessonContents(ctx);

      const item = (ctx.body as { data: Record<string, unknown>[] }).data[0];
      expect(item).toHaveProperty('transcodingStatus', 'ready');
      expect(item).toHaveProperty('videoSourceKey', 'videos/source.mp4');
      expect(item).toHaveProperty('videoPlaybackUrl', 'https://stream.example.com/hls.m3u8');
      expect(item).toHaveProperty('videoStreamId', 'stream-final');
      expect(item).toHaveProperty('transcodingError', null);
    });

    it('should include all transcoding fields in single content response', async () => {
      const content = createMockContentInstance({
        transcodingStatus: 'error',
        transcodingError: 'Invalid format',
      });
      mockLessonContentModel.findOne.mockResolvedValue(content);

      const ctx = createMockContext({ params: { lessonId: 'lesson-456', lang: 'en' } });
      await getLessonContentByLang(ctx);

      const data = (ctx.body as { data: Record<string, unknown> }).data;
      expect(data).toHaveProperty('transcodingStatus', 'error');
      expect(data).toHaveProperty('transcodingError', 'Invalid format');
    });
  });
});
