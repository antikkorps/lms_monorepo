import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context } from 'koa';

// =============================================================================
// Module Mocks
// =============================================================================

const mockLessonContentModel = {
  findOne: vi.fn(),
};

const mockLessonModel = {
  update: vi.fn(),
};

const mockTranscodingProvider = {
  name: 'mock-transcoding',
  isAvailable: vi.fn().mockReturnValue(true),
  submit: vi.fn(),
  getStatus: vi.fn(),
  delete: vi.fn(),
  supportsWebhook: vi.fn().mockReturnValue(true),
  verifyWebhook: vi.fn().mockReturnValue({ valid: true }),
  parseWebhookPayload: vi.fn().mockReturnValue({
    uid: 'stream-abc',
    status: 'ready',
    playbackUrl: 'https://stream.example.com/abc/manifest.m3u8',
    duration: 120,
  }),
};

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

vi.mock('./index.js', () => ({
  getTranscoding: () => mockTranscodingProvider,
}));

vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// =============================================================================
// Helpers
// =============================================================================

function createMockCtx(overrides: Partial<{
  rawBodyBuffer: Buffer;
  body: unknown;
  headers: Record<string, string>;
}>): Context {
  const ctx = {
    request: {
      rawBodyBuffer: overrides.rawBodyBuffer ?? Buffer.from('{}'),
      body: overrides.body ?? {},
    },
    headers: overrides.headers ?? { 'webhook-signature': 'time=123,sig1=abc' },
    status: 0,
    body: undefined as unknown,
  } as unknown as Context;
  return ctx;
}

// =============================================================================
// Tests
// =============================================================================

describe('handleTranscodingWebhook', () => {
  let handleTranscodingWebhook: (ctx: Context) => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset defaults
    mockTranscodingProvider.supportsWebhook.mockReturnValue(true);
    mockTranscodingProvider.verifyWebhook.mockReturnValue({ valid: true });
    mockTranscodingProvider.parseWebhookPayload.mockReturnValue({
      uid: 'stream-abc',
      status: 'ready',
      playbackUrl: 'https://stream.example.com/abc/manifest.m3u8',
      duration: 120,
    });

    const mod = await import('./webhook.controller.js');
    handleTranscodingWebhook = mod.handleTranscodingWebhook;
  });

  it('should return 501 when provider does not support webhooks', async () => {
    mockTranscodingProvider.supportsWebhook.mockReturnValue(false);
    const ctx = createMockCtx({});

    await expect(handleTranscodingWebhook(ctx)).rejects.toMatchObject({
      statusCode: 501,
      code: 'NOT_IMPLEMENTED',
    });
  });

  it('should return 400 when raw body is missing', async () => {
    const ctx = createMockCtx({ rawBodyBuffer: undefined as unknown as Buffer });
    ctx.request.rawBodyBuffer = undefined;

    await expect(handleTranscodingWebhook(ctx)).rejects.toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
    });
  });

  it('should return 400 when signature is invalid', async () => {
    mockTranscodingProvider.verifyWebhook.mockReturnValue({ valid: false, reason: 'Signature mismatch' });
    const ctx = createMockCtx({});

    await expect(handleTranscodingWebhook(ctx)).rejects.toMatchObject({
      statusCode: 400,
      code: 'WEBHOOK_SIGNATURE_INVALID',
    });
  });

  it('should return 400 when payload is invalid', async () => {
    mockTranscodingProvider.parseWebhookPayload.mockReturnValue(null);
    const ctx = createMockCtx({});

    await expect(handleTranscodingWebhook(ctx)).rejects.toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
    });
  });

  it('should return 200 when stream UID is not found in DB', async () => {
    mockLessonContentModel.findOne.mockResolvedValue(null);
    const ctx = createMockCtx({});

    await handleTranscodingWebhook(ctx);

    expect(ctx.status).toBe(200);
    expect(ctx.body).toEqual({ received: true });
  });

  it('should skip update if already READY (idempotent)', async () => {
    const content = {
      id: 'content-123',
      lessonId: 'lesson-456',
      transcodingStatus: 'ready',
      update: vi.fn(),
    };
    mockLessonContentModel.findOne.mockResolvedValue(content);
    const ctx = createMockCtx({});

    await handleTranscodingWebhook(ctx);

    expect(content.update).not.toHaveBeenCalled();
    expect(ctx.status).toBe(200);
    expect(ctx.body).toEqual({ received: true });
  });

  it('should update to READY with playbackUrl and duration', async () => {
    const content = {
      id: 'content-123',
      lessonId: 'lesson-456',
      transcodingStatus: 'processing',
      update: vi.fn().mockResolvedValue(undefined),
    };
    mockLessonContentModel.findOne.mockResolvedValue(content);
    mockLessonModel.update.mockResolvedValue([1]);
    const ctx = createMockCtx({});

    await handleTranscodingWebhook(ctx);

    expect(content.update).toHaveBeenCalledWith({
      transcodingStatus: 'ready',
      videoPlaybackUrl: 'https://stream.example.com/abc/manifest.m3u8',
      transcodingError: null,
    });
    expect(mockLessonModel.update).toHaveBeenCalledWith(
      { duration: 120 },
      { where: { id: 'lesson-456' } }
    );
    expect(ctx.status).toBe(200);
  });

  it('should update to ERROR with error message', async () => {
    mockTranscodingProvider.parseWebhookPayload.mockReturnValue({
      uid: 'stream-abc',
      status: 'error',
      errorMessage: 'Invalid codec',
    });
    const content = {
      id: 'content-123',
      lessonId: 'lesson-456',
      transcodingStatus: 'processing',
      update: vi.fn().mockResolvedValue(undefined),
    };
    mockLessonContentModel.findOne.mockResolvedValue(content);
    const ctx = createMockCtx({});

    await handleTranscodingWebhook(ctx);

    expect(content.update).toHaveBeenCalledWith({
      transcodingStatus: 'error',
      transcodingError: 'Invalid codec',
    });
    expect(ctx.status).toBe(200);
  });

  it('should update PENDING to PROCESSING on processing status', async () => {
    mockTranscodingProvider.parseWebhookPayload.mockReturnValue({
      uid: 'stream-abc',
      status: 'processing',
    });
    const content = {
      id: 'content-123',
      lessonId: 'lesson-456',
      transcodingStatus: 'pending',
      update: vi.fn().mockResolvedValue(undefined),
    };
    mockLessonContentModel.findOne.mockResolvedValue(content);
    const ctx = createMockCtx({});

    await handleTranscodingWebhook(ctx);

    expect(content.update).toHaveBeenCalledWith({
      transcodingStatus: 'processing',
    });
    expect(ctx.status).toBe(200);
  });

  it('should not downgrade PROCESSING to PROCESSING on processing status', async () => {
    mockTranscodingProvider.parseWebhookPayload.mockReturnValue({
      uid: 'stream-abc',
      status: 'processing',
    });
    const content = {
      id: 'content-123',
      lessonId: 'lesson-456',
      transcodingStatus: 'processing',
      update: vi.fn().mockResolvedValue(undefined),
    };
    mockLessonContentModel.findOne.mockResolvedValue(content);
    const ctx = createMockCtx({});

    await handleTranscodingWebhook(ctx);

    expect(content.update).not.toHaveBeenCalled();
    expect(ctx.status).toBe(200);
  });
});
