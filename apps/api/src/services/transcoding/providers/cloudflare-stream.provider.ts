import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from '../../../config/index.js';
import { logger } from '../../../utils/logger.js';
import type {
  TranscodingProvider,
  TranscodingSubmitOptions,
  TranscodingSubmitResult,
  TranscodingStatusResult,
  TranscodingProviderStatus,
  WebhookVerificationResult,
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

  supportsWebhook(): boolean {
    return !!config.cloudflare.webhookSecret;
  }

  verifyWebhook(rawBody: Buffer, headers: Record<string, string>): WebhookVerificationResult {
    const secret = config.cloudflare.webhookSecret;
    if (!secret) {
      return { valid: false, reason: 'Webhook secret not configured' };
    }

    const signatureHeader = headers['webhook-signature'];
    if (!signatureHeader) {
      return { valid: false, reason: 'Missing webhook-signature header' };
    }

    // Parse "time=<ts>,sig1=<hex>" format
    const parts: Record<string, string> = {};
    for (const part of signatureHeader.split(',')) {
      const [key, value] = part.split('=', 2);
      if (key && value) {
        parts[key.trim()] = value.trim();
      }
    }

    const timestamp = parts['time'];
    const signature = parts['sig1'];

    if (!timestamp || !signature) {
      return { valid: false, reason: 'Malformed webhook-signature header' };
    }

    // Reject timestamps older than 5 minutes
    const TOLERANCE_MS = 5 * 60 * 1000;
    const ts = Number(timestamp);
    if (Number.isNaN(ts) || Math.abs(Date.now() - ts * 1000) > TOLERANCE_MS) {
      return { valid: false, reason: 'Webhook timestamp expired' };
    }

    // HMAC-SHA256(secret, "${time}.${rawBody}")
    const signedPayload = `${timestamp}.${rawBody.toString('utf8')}`;
    const expected = createHmac('sha256', secret).update(signedPayload).digest('hex');

    const sigBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');

    if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
      return { valid: false, reason: 'Signature mismatch' };
    }

    return { valid: true };
  }

  parseWebhookPayload(body: unknown): TranscodingStatusResult | null {
    if (!body || typeof body !== 'object') {
      return null;
    }

    const payload = body as Record<string, unknown>;
    const uid = payload['uid'];
    const status = payload['status'] as Record<string, unknown> | undefined;
    const playback = payload['playback'] as Record<string, string> | undefined;
    const duration = payload['duration'] as number | undefined;

    if (typeof uid !== 'string' || !status || typeof status !== 'object') {
      return null;
    }

    const state = status['state'] as string | undefined;
    if (typeof state !== 'string') {
      return null;
    }

    const mappedStatus = this.mapStatus(state);

    return {
      uid,
      status: mappedStatus,
      playbackUrl: mappedStatus === 'ready' ? playback?.['hls'] : undefined,
      duration: typeof duration === 'number' ? Math.round(duration) : undefined,
      errorMessage:
        mappedStatus === 'error'
          ? (status['errorReasonText'] as string) || (status['errorReasonCode'] as string) || 'Unknown error'
          : undefined,
    };
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
