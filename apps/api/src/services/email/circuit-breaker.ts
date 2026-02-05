import CircuitBreaker from 'opossum';
import { logger } from '../../utils/logger.js';
import type { EmailProvider, SendEmailOptions, SendResult } from './email.types.js';

const CIRCUIT_BREAKER_OPTIONS = {
  timeout: 10000, // 10 seconds
  errorThresholdPercentage: 50,
  resetTimeout: 30000, // 30 seconds
  volumeThreshold: 5, // Minimum requests before tripping
};

export function createCircuitBreaker(provider: EmailProvider): EmailProvider {
  const breaker = new CircuitBreaker(
    (options: SendEmailOptions) => provider.send(options),
    CIRCUIT_BREAKER_OPTIONS
  );

  breaker.on('open', () => {
    logger.warn({ provider: provider.name }, 'Email circuit breaker OPENED - requests will fail fast');
  });

  breaker.on('halfOpen', () => {
    logger.info({ provider: provider.name }, 'Email circuit breaker HALF-OPEN - testing connection');
  });

  breaker.on('close', () => {
    logger.info({ provider: provider.name }, 'Email circuit breaker CLOSED - normal operation resumed');
  });

  breaker.on('fallback', () => {
    logger.warn({ provider: provider.name }, 'Email circuit breaker fallback triggered');
  });

  return {
    name: `${provider.name}:circuit-breaker`,
    async send(options: SendEmailOptions): Promise<SendResult> {
      try {
        const result = await breaker.fire(options) as SendResult;
        return result;
      } catch (error) {
        // Log error but don't throw - email failure shouldn't block user actions
        logger.error(
          {
            provider: provider.name,
            to: options.to,
            subject: options.subject,
            error: error instanceof Error ? error.message : 'Unknown error',
            circuitState: breaker.opened ? 'open' : 'closed',
          },
          'Email send failed (circuit breaker)'
        );
        // Return failure result instead of throwing
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Circuit breaker error',
        };
      }
    },
  };
}
