import { config } from '../../../config/index.js';
import { logger } from '../../../utils/logger.js';
import type {
  TranscodingProvider,
  TranscodingSubmitOptions,
  TranscodingSubmitResult,
  TranscodingStatusResult,
  TranscodingProviderStatus,
} from '../transcoding.interface.js';

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

export class CloudflareStreamProvider implements TranscodingProvider {
  readonly name = 'cloudflare-stream';
  private accountId: string;
  private apiToken: string;

  constructor() {
    this.accountId = config.cloudflare.accountId;
    this.apiToken = config.cloudflare.apiToken;
  }

  isAvailable(): boolean {
    return !!(this.accountId && this.apiToken);
  }

  async submit(options: TranscodingSubmitOptions): Promise<TranscodingSubmitResult> {
    const url = `${CF_API_BASE}/accounts/${this.accountId}/stream/copy`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: options.url,
        meta: options.meta || {},
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error({ status: response.status, body: errorBody }, 'Cloudflare Stream copy failed');
      throw new Error(`Cloudflare Stream copy failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      result: { uid: string; status: { state: string } };
    };

    return {
      uid: data.result.uid,
      status: this.mapStatus(data.result.status?.state),
    };
  }

  async getStatus(uid: string): Promise<TranscodingStatusResult> {
    const url = `${CF_API_BASE}/accounts/${this.accountId}/stream/${uid}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error({ status: response.status, uid, body: errorBody }, 'Cloudflare Stream status check failed');
      throw new Error(`Cloudflare Stream status check failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      result: {
        uid: string;
        status: { state: string; errorReasonCode?: string; errorReasonText?: string };
        playback?: { hls?: string };
        duration?: number;
      };
    };

    const result = data.result;
    const status = this.mapStatus(result.status?.state);

    return {
      uid: result.uid,
      status,
      playbackUrl: status === 'ready' ? result.playback?.hls : undefined,
      duration: result.duration ? Math.round(result.duration) : undefined,
      errorMessage:
        status === 'error'
          ? result.status?.errorReasonText || result.status?.errorReasonCode || 'Unknown error'
          : undefined,
    };
  }

  async delete(uid: string): Promise<void> {
    const url = `${CF_API_BASE}/accounts/${this.accountId}/stream/${uid}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      const errorBody = await response.text();
      logger.error({ status: response.status, uid, body: errorBody }, 'Cloudflare Stream delete failed');
      throw new Error(`Cloudflare Stream delete failed: ${response.status}`);
    }
  }

  private mapStatus(state: string | undefined): TranscodingProviderStatus {
    switch (state) {
      case 'queued':
      case 'downloading':
        return 'pending';
      case 'inprogress':
      case 'encoding':
        return 'processing';
      case 'ready':
        return 'ready';
      case 'error':
        return 'error';
      default:
        return 'pending';
    }
  }
}
