import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mutable mocked config so tests can toggle whether Turnstile is configured.
vi.mock('../../config/index.js', () => ({
  config: {
    signup: {
      turnstile: {
        secretKey: '',
        verifyUrl: 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      },
    },
  },
}));

vi.mock('../../utils/logger.js', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

import { config } from '../../config/index.js';
import { getTurnstileService } from './turnstile.service.js';

function mockFetchOnce(value: { ok: boolean; json?: unknown; status?: number }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: value.ok,
    status: value.status ?? (value.ok ? 200 : 500),
    json: async () => value.json,
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('TurnstileService', () => {
  beforeEach(() => {
    config.signup.turnstile.secretKey = '';
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('accepts any token when not configured (dev)', async () => {
    const fetchMock = mockFetchOnce({ ok: true, json: { success: true } });
    const service = getTurnstileService();

    await expect(service.verify(undefined)).resolves.toBe(true);
    await expect(service.verify('whatever')).resolves.toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a missing token when configured', async () => {
    config.signup.turnstile.secretKey = 'secret';
    const fetchMock = mockFetchOnce({ ok: true, json: { success: true } });

    await expect(getTurnstileService().verify(undefined)).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns true when siteverify succeeds', async () => {
    config.signup.turnstile.secretKey = 'secret';
    const fetchMock = mockFetchOnce({ ok: true, json: { success: true } });

    await expect(getTurnstileService().verify('good-token', '1.2.3.4')).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('returns false when siteverify rejects the token', async () => {
    config.signup.turnstile.secretKey = 'secret';
    mockFetchOnce({ ok: true, json: { success: false, 'error-codes': ['invalid-input-response'] } });

    await expect(getTurnstileService().verify('bad-token')).resolves.toBe(false);
  });

  it('fails closed on network/HTTP error', async () => {
    config.signup.turnstile.secretKey = 'secret';
    mockFetchOnce({ ok: false, status: 500 });

    await expect(getTurnstileService().verify('any-token')).resolves.toBe(false);
  });
});
