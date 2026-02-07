import CircuitBreaker from 'opossum';
import { logger } from '../../utils/logger.js';
import type {
  TranscodingProvider,
  TranscodingSubmitOptions,
  TranscodingSubmitResult,
  TranscodingStatusResult,
} from './transcoding.interface.js';

const SUBMIT_OPTIONS = {
  timeout: 30000,
  errorThresholdPercentage: 50,
  resetTimeout: 60000,
  volumeThreshold: 3,
};

const STATUS_OPTIONS = {
  timeout: 10000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  volumeThreshold: 5,
};

const DELETE_OPTIONS = {
  timeout: 10000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  volumeThreshold: 5,
};

function setupLogging(breaker: CircuitBreaker, label: string, providerName: string) {
  breaker.on('open', () => {
    logger.warn({ provider: providerName, operation: label }, 'Transcoding circuit breaker OPENED');
  });
  breaker.on('halfOpen', () => {
    logger.info({ provider: providerName, operation: label }, 'Transcoding circuit breaker HALF-OPEN');
  });
  breaker.on('close', () => {
    logger.info({ provider: providerName, operation: label }, 'Transcoding circuit breaker CLOSED');
  });
}

export function createTranscodingCircuitBreaker(provider: TranscodingProvider): TranscodingProvider {
  const submitBreaker = new CircuitBreaker(
    (options: TranscodingSubmitOptions) => provider.submit(options),
    SUBMIT_OPTIONS
  );
  setupLogging(submitBreaker, 'submit', provider.name);

  const statusBreaker = new CircuitBreaker(
    (uid: string) => provider.getStatus(uid),
    STATUS_OPTIONS
  );
  setupLogging(statusBreaker, 'getStatus', provider.name);

  const deleteBreaker = new CircuitBreaker(
    (uid: string) => provider.delete(uid),
    DELETE_OPTIONS
  );
  setupLogging(deleteBreaker, 'delete', provider.name);

  return {
    name: `${provider.name}:circuit-breaker`,

    isAvailable(): boolean {
      return provider.isAvailable();
    },

    async submit(options: TranscodingSubmitOptions): Promise<TranscodingSubmitResult> {
      return submitBreaker.fire(options) as Promise<TranscodingSubmitResult>;
    },

    async getStatus(uid: string): Promise<TranscodingStatusResult> {
      return statusBreaker.fire(uid) as Promise<TranscodingStatusResult>;
    },

    async delete(uid: string): Promise<void> {
      await deleteBreaker.fire(uid);
    },
  };
}
