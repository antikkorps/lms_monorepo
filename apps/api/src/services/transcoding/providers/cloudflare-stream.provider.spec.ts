import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'node:crypto';

vi.mock('../../../config/index.js', () => ({
  config: {
    cloudflare: {
      accountId: 'test-account-id',
      apiToken: 'test-api-token',
      webhookSecret: 'test-webhook-secret',
    },
  },
}));

vi.mock('../../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { CloudflareStreamProvider } from './cloudflare-stream.provider.js';

// =============================================================================
// Helpers
// =============================================================================

function createValidSignature(rawBody: string, secret: string, timestampOverride?: number): string {
  const timestamp = timestampOverride ?? Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${rawBody}`;
  const sig = createHmac('sha256', secret).update(signedPayload).digest('hex');
  return `time=${timestamp},sig1=${sig}`;
}

// =============================================================================
// Tests
// =============================================================================

describe('CloudflareStreamProvider - Webhook', () => {
  let provider: CloudflareStreamProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new CloudflareStreamProvider();
  });

  describe('supportsWebhook', () => {
    it('should return true when webhook secret is configured', () => {
      expect(provider.supportsWebhook()).toBe(true);
    });
  });

  describe('verifyWebhook', () => {
    const rawBodyStr = '{"uid":"stream-abc","status":{"state":"ready"}}';
    const rawBody = Buffer.from(rawBodyStr);
    const secret = 'test-webhook-secret';

    it('should accept valid signature', () => {
      const signature = createValidSignature(rawBodyStr, secret);
      const result = provider.verifyWebhook(rawBody, { 'webhook-signature': signature });
      expect(result.valid).toBe(true);
    });

    it('should reject when signature header is missing', () => {
      const result = provider.verifyWebhook(rawBody, {});
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Missing webhook-signature header');
    });

    it('should reject malformed signature header', () => {
      const result = provider.verifyWebhook(rawBody, { 'webhook-signature': 'invalid-format' });
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Malformed webhook-signature header');
    });

    it('should reject wrong secret', () => {
      const signature = createValidSignature(rawBodyStr, 'wrong-secret');
      const result = provider.verifyWebhook(rawBody, { 'webhook-signature': signature });
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Signature mismatch');
    });

    it('should reject expired timestamp (older than 5 minutes)', () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 6 * 60; // 6 min ago
      const signature = createValidSignature(rawBodyStr, secret, oldTimestamp);
      const result = provider.verifyWebhook(rawBody, { 'webhook-signature': signature });
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Webhook timestamp expired');
    });

    it('should accept timestamp within tolerance', () => {
      const recentTimestamp = Math.floor(Date.now() / 1000) - 2 * 60; // 2 min ago
      const signature = createValidSignature(rawBodyStr, secret, recentTimestamp);
      const result = provider.verifyWebhook(rawBody, { 'webhook-signature': signature });
      expect(result.valid).toBe(true);
    });
  });

  describe('parseWebhookPayload', () => {
    it('should parse valid ready payload', () => {
      const payload = {
        uid: 'stream-abc',
        status: { state: 'ready' },
        playback: { hls: 'https://stream.cloudflare.com/abc/manifest.m3u8' },
        thumbnail: 'https://customer-xyz.cloudflarestream.com/abc/thumbnails/thumbnail.jpg',
        duration: 125.7,
      };

      const result = provider.parseWebhookPayload(payload);

      expect(result).toEqual({
        uid: 'stream-abc',
        status: 'ready',
        playbackUrl: 'https://stream.cloudflare.com/abc/manifest.m3u8',
        thumbnailUrl: 'https://customer-xyz.cloudflarestream.com/abc/thumbnails/thumbnail.jpg',
        duration: 126,
        errorMessage: undefined,
      });
    });

    it('should parse valid error payload', () => {
      const payload = {
        uid: 'stream-def',
        status: { state: 'error', errorReasonText: 'Unsupported codec' },
      };

      const result = provider.parseWebhookPayload(payload);

      expect(result).toEqual({
        uid: 'stream-def',
        status: 'error',
        playbackUrl: undefined,
        thumbnailUrl: undefined,
        duration: undefined,
        errorMessage: 'Unsupported codec',
      });
    });

    it('should parse processing payload', () => {
      const payload = {
        uid: 'stream-ghi',
        status: { state: 'inprogress' },
      };

      const result = provider.parseWebhookPayload(payload);

      expect(result).toEqual({
        uid: 'stream-ghi',
        status: 'processing',
        playbackUrl: undefined,
        thumbnailUrl: undefined,
        duration: undefined,
        errorMessage: undefined,
      });
    });

    it('should return null for null body', () => {
      expect(provider.parseWebhookPayload(null)).toBeNull();
    });

    it('should return null for non-object body', () => {
      expect(provider.parseWebhookPayload('not an object')).toBeNull();
    });

    it('should return null for missing uid', () => {
      const payload = { status: { state: 'ready' } };
      expect(provider.parseWebhookPayload(payload)).toBeNull();
    });

    it('should return null for missing status', () => {
      const payload = { uid: 'stream-abc' };
      expect(provider.parseWebhookPayload(payload)).toBeNull();
    });

    it('should return null for missing status.state', () => {
      const payload = { uid: 'stream-abc', status: {} };
      expect(provider.parseWebhookPayload(payload)).toBeNull();
    });
  });
});
