import type { TranscodingProvider } from './transcoding.interface.js';
import { CloudflareStreamProvider } from './providers/cloudflare-stream.provider.js';
import { NoopTranscodingProvider } from './providers/noop.provider.js';
import { createTranscodingCircuitBreaker } from './circuit-breaker.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

export type { TranscodingProvider } from './transcoding.interface.js';

let transcodingInstance: TranscodingProvider | null = null;

export function getTranscoding(): TranscodingProvider {
  if (!transcodingInstance) {
    if (config.cloudflare.accountId && config.cloudflare.apiToken) {
      logger.info('Initializing Cloudflare Stream transcoding provider');
      const provider = new CloudflareStreamProvider();
      transcodingInstance = createTranscodingCircuitBreaker(provider);
    } else {
      logger.info('No transcoding credentials configured, using noop provider');
      transcodingInstance = new NoopTranscodingProvider();
    }
  }
  return transcodingInstance;
}

export function isTranscodingAvailable(): boolean {
  return getTranscoding().isAvailable();
}

export function resetTranscoding(): void {
  transcodingInstance = null;
}
