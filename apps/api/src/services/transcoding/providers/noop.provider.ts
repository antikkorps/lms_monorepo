import type {
  TranscodingProvider,
  TranscodingSubmitOptions,
  TranscodingSubmitResult,
  TranscodingStatusResult,
  WebhookVerificationResult,
} from '../transcoding.interface.js';

export class NoopTranscodingProvider implements TranscodingProvider {
  readonly name = 'noop';

  isAvailable(): boolean {
    return false;
  }

  async submit(_options: TranscodingSubmitOptions): Promise<TranscodingSubmitResult> {
    throw new Error('Transcoding is not available (no provider configured)');
  }

  async getStatus(_uid: string): Promise<TranscodingStatusResult> {
    throw new Error('Transcoding is not available (no provider configured)');
  }

  async delete(_uid: string): Promise<void> {
    throw new Error('Transcoding is not available (no provider configured)');
  }

  supportsWebhook(): boolean {
    return false;
  }

  verifyWebhook(): WebhookVerificationResult {
    return { valid: false, reason: 'Noop provider' };
  }

  parseWebhookPayload(): TranscodingStatusResult | null {
    return null;
  }
}
