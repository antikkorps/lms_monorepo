import type {
  TranscodingProvider,
  TranscodingSubmitOptions,
  TranscodingSubmitResult,
  TranscodingStatusResult,
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
}
