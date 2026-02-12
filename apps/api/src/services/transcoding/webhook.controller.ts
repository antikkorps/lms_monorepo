import type { Context } from 'koa';
import { LessonContent, Lesson } from '../../database/models/index.js';
import { TranscodingStatus } from '../../database/models/enums.js';
import { AppError } from '../../utils/app-error.js';
import { getTranscoding } from './index.js';
import { logger } from '../../utils/logger.js';

/**
 * Handle transcoding provider webhook (provider-agnostic)
 * POST /webhooks/transcoding
 */
export async function handleTranscodingWebhook(ctx: Context): Promise<void> {
  const transcoding = getTranscoding();

  // 1. Check provider supports webhooks
  if (!transcoding.supportsWebhook()) {
    throw new AppError('Transcoding webhook not configured', 501, 'NOT_IMPLEMENTED');
  }

  // 2. Verify signature (provider-specific)
  const rawBody = ctx.request.rawBodyBuffer;
  if (!rawBody) {
    throw new AppError('Missing body', 400, 'BAD_REQUEST');
  }

  const headers = Object.fromEntries(
    Object.entries(ctx.headers).map(([k, v]) => [k, String(v)])
  );
  const verification = transcoding.verifyWebhook(rawBody, headers);
  if (!verification.valid) {
    logger.warn({ reason: verification.reason }, 'Transcoding webhook signature verification failed');
    throw new AppError('Invalid webhook signature', 400, 'WEBHOOK_SIGNATURE_INVALID');
  }

  // 3. Parse payload (provider-specific normalization)
  const status = transcoding.parseWebhookPayload(ctx.request.body);
  if (!status) {
    throw new AppError('Invalid webhook payload', 400, 'BAD_REQUEST');
  }

  logger.info({ uid: status.uid, status: status.status }, 'Transcoding webhook received');

  // 4. Find LessonContent by provider UID
  const content = await LessonContent.findOne({ where: { videoStreamId: status.uid } });
  if (!content) {
    // Return 200 to prevent the provider from retrying indefinitely
    ctx.status = 200;
    ctx.body = { received: true };
    return;
  }

  // 5. Idempotency: skip if already terminal
  if (content.transcodingStatus === TranscodingStatus.READY) {
    ctx.status = 200;
    ctx.body = { received: true };
    return;
  }

  // 6. Update based on normalized status
  switch (status.status) {
    case 'ready':
      await content.update({
        transcodingStatus: TranscodingStatus.READY,
        videoPlaybackUrl: status.playbackUrl || null,
        transcodingError: null,
      });
      if (status.duration && status.duration > 0) {
        await Lesson.update({ duration: status.duration }, { where: { id: content.lessonId } });
      }
      logger.info({ lessonContentId: content.id, uid: status.uid, playbackUrl: status.playbackUrl }, 'Transcoding ready via webhook');
      break;

    case 'error':
      await content.update({
        transcodingStatus: TranscodingStatus.ERROR,
        transcodingError: status.errorMessage || 'Unknown transcoding error',
      });
      logger.error({ lessonContentId: content.id, uid: status.uid, error: status.errorMessage }, 'Transcoding failed via webhook');
      break;

    case 'processing':
      if (content.transcodingStatus === TranscodingStatus.PENDING) {
        await content.update({ transcodingStatus: TranscodingStatus.PROCESSING });
      }
      break;
  }

  ctx.status = 200;
  ctx.body = { received: true };
}
