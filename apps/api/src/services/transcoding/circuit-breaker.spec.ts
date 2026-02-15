import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTranscodingCircuitBreaker } from './circuit-breaker.js';
import type { TranscodingProvider } from './transcoding.interface.js';

vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Transcoding Circuit Breaker', () => {
  let mockProvider: TranscodingProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProvider = {
      name: 'test-transcoding',
      isAvailable: vi.fn().mockReturnValue(true),
      submit: vi.fn().mockResolvedValue({ uid: 'stream-123', status: 'pending' }),
      getStatus: vi.fn().mockResolvedValue({ uid: 'stream-123', status: 'processing' }),
      delete: vi.fn().mockResolvedValue(undefined),
      supportsWebhook: vi.fn().mockReturnValue(false),
      verifyWebhook: vi.fn().mockReturnValue({ valid: false }),
      parseWebhookPayload: vi.fn().mockReturnValue(null),
    };
  });

  it('should wrap provider with circuit breaker suffix', () => {
    const wrapped = createTranscodingCircuitBreaker(mockProvider);
    expect(wrapped.name).toBe('test-transcoding:circuit-breaker');
  });

  it('should delegate isAvailable to underlying provider', () => {
    const wrapped = createTranscodingCircuitBreaker(mockProvider);
    expect(wrapped.isAvailable()).toBe(true);

    vi.mocked(mockProvider.isAvailable).mockReturnValue(false);
    expect(wrapped.isAvailable()).toBe(false);
  });

  it('should call underlying provider submit', async () => {
    const wrapped = createTranscodingCircuitBreaker(mockProvider);
    const options = { url: 'https://r2.example.com/video.mp4' };

    const result = await wrapped.submit(options);

    expect(mockProvider.submit).toHaveBeenCalledWith(options);
    expect(result).toEqual({ uid: 'stream-123', status: 'pending' });
  });

  it('should call underlying provider getStatus', async () => {
    const wrapped = createTranscodingCircuitBreaker(mockProvider);

    const result = await wrapped.getStatus('stream-123');

    expect(mockProvider.getStatus).toHaveBeenCalledWith('stream-123');
    expect(result).toEqual({ uid: 'stream-123', status: 'processing' });
  });

  it('should call underlying provider delete', async () => {
    const wrapped = createTranscodingCircuitBreaker(mockProvider);

    await wrapped.delete('stream-123');

    expect(mockProvider.delete).toHaveBeenCalledWith('stream-123');
  });

  it('should propagate submit errors', async () => {
    mockProvider.submit = vi.fn().mockRejectedValue(new Error('Stream API down'));
    const wrapped = createTranscodingCircuitBreaker(mockProvider);

    await expect(wrapped.submit({ url: 'https://example.com/v.mp4' })).rejects.toThrow('Stream API down');
  });

  it('should propagate getStatus errors', async () => {
    mockProvider.getStatus = vi.fn().mockRejectedValue(new Error('Status check failed'));
    const wrapped = createTranscodingCircuitBreaker(mockProvider);

    await expect(wrapped.getStatus('stream-123')).rejects.toThrow('Status check failed');
  });

  it('should propagate delete errors', async () => {
    mockProvider.delete = vi.fn().mockRejectedValue(new Error('Delete failed'));
    const wrapped = createTranscodingCircuitBreaker(mockProvider);

    await expect(wrapped.delete('stream-123')).rejects.toThrow('Delete failed');
  });

  it('should handle multiple successful calls', async () => {
    const wrapped = createTranscodingCircuitBreaker(mockProvider);

    await wrapped.submit({ url: 'https://example.com/v1.mp4' });
    await wrapped.submit({ url: 'https://example.com/v2.mp4' });
    await wrapped.getStatus('uid-1');
    await wrapped.getStatus('uid-2');

    expect(mockProvider.submit).toHaveBeenCalledTimes(2);
    expect(mockProvider.getStatus).toHaveBeenCalledTimes(2);
  });

  describe('circuit states', () => {
    it('should open circuit after threshold failures on submit', async () => {
      const { logger } = await import('../../utils/logger.js');
      mockProvider.submit = vi.fn().mockRejectedValue(new Error('Consistent failure'));
      const wrapped = createTranscodingCircuitBreaker(mockProvider);

      // volumeThreshold is 3 for submit, so we need 3+ failures
      for (let i = 0; i < 4; i++) {
        try { await wrapped.submit({ url: 'https://example.com/v.mp4' }); } catch { /* expected */ }
      }

      const warnCalls = vi.mocked(logger.warn).mock.calls;
      const openedCall = warnCalls.find(
        (call) => typeof call[1] === 'string' && call[1].includes('OPENED')
      );
      expect(openedCall).toBeDefined();
    });
  });
});
