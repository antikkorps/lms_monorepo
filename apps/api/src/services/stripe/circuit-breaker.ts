import CircuitBreaker from 'opossum';
import { logger } from '../../utils/logger.js';

const CIRCUIT_BREAKER_OPTIONS = {
  timeout: 15000, // 15 seconds (Stripe can be slow)
  errorThresholdPercentage: 50,
  resetTimeout: 30000, // 30 seconds
  volumeThreshold: 5, // Minimum requests before tripping
};

type AsyncFunction<T extends unknown[], R> = (...args: T) => Promise<R>;

export function createStripeCircuitBreaker<T extends unknown[], R>(
  operation: AsyncFunction<T, R>,
  operationName: string
): AsyncFunction<T, R> {
  const breaker = new CircuitBreaker(operation, CIRCUIT_BREAKER_OPTIONS);

  breaker.on('open', () => {
    logger.warn(
      { operation: operationName },
      'Stripe circuit breaker OPENED - requests will fail fast'
    );
  });

  breaker.on('halfOpen', () => {
    logger.info(
      { operation: operationName },
      'Stripe circuit breaker HALF-OPEN - testing connection'
    );
  });

  breaker.on('close', () => {
    logger.info(
      { operation: operationName },
      'Stripe circuit breaker CLOSED - normal operation resumed'
    );
  });

  return async (...args: T): Promise<R> => {
    try {
      return await breaker.fire(...args);
    } catch (error) {
      logger.error(
        {
          operation: operationName,
          error: error instanceof Error ? error.message : 'Unknown error',
          circuitState: breaker.opened ? 'open' : 'closed',
        },
        'Stripe operation failed (circuit breaker)'
      );
      throw error;
    }
  };
}
