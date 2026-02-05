import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCircuitBreaker } from './circuit-breaker.js';
import type { EmailProvider, SendEmailOptions } from './email.types.js';

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Circuit Breaker', () => {
  let mockProvider: EmailProvider;
  const testEmail: SendEmailOptions = {
    to: 'test@example.com',
    subject: 'Test',
    html: '<p>Test</p>',
    text: 'Test',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockProvider = {
      name: 'test-provider',
      send: vi.fn().mockResolvedValue(undefined),
    };
  });

  it('should wrap provider with circuit breaker suffix', () => {
    const wrapped = createCircuitBreaker(mockProvider);

    expect(wrapped.name).toBe('test-provider:circuit-breaker');
  });

  it('should call underlying provider on send', async () => {
    const wrapped = createCircuitBreaker(mockProvider);

    await wrapped.send(testEmail);

    expect(mockProvider.send).toHaveBeenCalledWith(testEmail);
  });

  it('should return error result when provider fails', async () => {
    mockProvider.send = vi.fn().mockRejectedValue(new Error('Provider error'));
    const wrapped = createCircuitBreaker(mockProvider);

    const result = await wrapped.send(testEmail);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Provider error');
  });

  it('should handle multiple successful calls', async () => {
    const wrapped = createCircuitBreaker(mockProvider);

    await wrapped.send(testEmail);
    await wrapped.send(testEmail);
    await wrapped.send(testEmail);

    expect(mockProvider.send).toHaveBeenCalledTimes(3);
  });

  it('should log error with circuit state on failure', async () => {
    const { logger } = await import('../../utils/logger.js');
    mockProvider.send = vi.fn().mockRejectedValue(new Error('Send failed'));
    const wrapped = createCircuitBreaker(mockProvider);

    const result = await wrapped.send(testEmail);

    expect(result.success).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'test-provider',
        to: 'test@example.com',
        error: 'Send failed',
      }),
      expect.any(String)
    );
  });

  describe('circuit states', () => {
    it('should open circuit after threshold failures', async () => {
      const { logger } = await import('../../utils/logger.js');
      mockProvider.send = vi.fn().mockRejectedValue(new Error('Consistent failure'));
      const wrapped = createCircuitBreaker(mockProvider);

      // volumeThreshold is 5, so we need 5+ failures
      for (let i = 0; i < 6; i++) {
        const result = await wrapped.send(testEmail);
        expect(result.success).toBe(false);
      }

      // Check that the circuit opened (logger.warn called with 'OPENED')
      const warnCalls = vi.mocked(logger.warn).mock.calls;
      const openedCall = warnCalls.find(
        (call) => typeof call[1] === 'string' && call[1].includes('OPENED')
      );

      expect(openedCall).toBeDefined();
    });
  });
});
