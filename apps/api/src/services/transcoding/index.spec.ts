import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Transcoding Service Factory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should return NoopTranscodingProvider when no credentials configured', async () => {
    vi.doMock('../../config/index.js', () => ({
      config: {
        cloudflare: { accountId: '', apiToken: '' },
      },
    }));

    const { getTranscoding, isTranscodingAvailable, resetTranscoding } = await import('./index.js');
    resetTranscoding();

    const provider = getTranscoding();

    expect(provider.name).toBe('noop');
    expect(provider.isAvailable()).toBe(false);
    expect(isTranscodingAvailable()).toBe(false);
  });

  it('should return CloudflareStreamProvider with circuit breaker when credentials provided', async () => {
    vi.doMock('../../config/index.js', () => ({
      config: {
        cloudflare: { accountId: 'acc-123', apiToken: 'token-abc' },
      },
    }));

    const { getTranscoding, isTranscodingAvailable, resetTranscoding } = await import('./index.js');
    resetTranscoding();

    const provider = getTranscoding();

    expect(provider.name).toBe('cloudflare-stream:circuit-breaker');
    expect(provider.isAvailable()).toBe(true);
    expect(isTranscodingAvailable()).toBe(true);
  });

  it('should return same singleton instance on subsequent calls', async () => {
    vi.doMock('../../config/index.js', () => ({
      config: {
        cloudflare: { accountId: '', apiToken: '' },
      },
    }));

    const { getTranscoding, resetTranscoding } = await import('./index.js');
    resetTranscoding();

    const instance1 = getTranscoding();
    const instance2 = getTranscoding();

    expect(instance1).toBe(instance2);
  });

  it('should create new instance after resetTranscoding', async () => {
    vi.doMock('../../config/index.js', () => ({
      config: {
        cloudflare: { accountId: '', apiToken: '' },
      },
    }));

    const { getTranscoding, resetTranscoding } = await import('./index.js');
    resetTranscoding();

    const instance1 = getTranscoding();
    resetTranscoding();
    const instance2 = getTranscoding();

    // Both are noop but different instances
    expect(instance1.name).toBe('noop');
    expect(instance2.name).toBe('noop');
  });

  it('NoopTranscodingProvider should throw on submit', async () => {
    vi.doMock('../../config/index.js', () => ({
      config: {
        cloudflare: { accountId: '', apiToken: '' },
      },
    }));

    const { getTranscoding, resetTranscoding } = await import('./index.js');
    resetTranscoding();

    const provider = getTranscoding();

    await expect(provider.submit({ url: 'https://example.com/v.mp4' }))
      .rejects.toThrow('not available');
  });

  it('NoopTranscodingProvider should throw on getStatus', async () => {
    vi.doMock('../../config/index.js', () => ({
      config: {
        cloudflare: { accountId: '', apiToken: '' },
      },
    }));

    const { getTranscoding, resetTranscoding } = await import('./index.js');
    resetTranscoding();

    const provider = getTranscoding();

    await expect(provider.getStatus('uid-123'))
      .rejects.toThrow('not available');
  });

  it('NoopTranscodingProvider should throw on delete', async () => {
    vi.doMock('../../config/index.js', () => ({
      config: {
        cloudflare: { accountId: '', apiToken: '' },
      },
    }));

    const { getTranscoding, resetTranscoding } = await import('./index.js');
    resetTranscoding();

    const provider = getTranscoding();

    await expect(provider.delete('uid-123'))
      .rejects.toThrow('not available');
  });
});
