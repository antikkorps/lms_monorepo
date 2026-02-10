import type { Context } from 'koa';
import { z } from 'zod';
import { emailService } from '../services/email/index.js';
import { AppError } from '../utils/app-error.js';
import type { EmailType } from '../database/models/EmailLog.js';

// Validation schemas
const sendTestEmailSchema = z.object({
  to: z.string().email('Invalid email address'),
  type: z.enum([
    'verification',
    'password_reset',
    'invitation',
    'notification_lesson_completed',
    'notification_course_completed',
    'notification_badge_earned',
    'digest',
    'test',
  ]).default('test'),
});

const getStatsSchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(7),
});

const getLogsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  type: z.enum([
    'verification',
    'password_reset',
    'invitation',
    'notification_lesson_completed',
    'notification_course_completed',
    'notification_badge_earned',
    'digest',
    'test',
  ]).optional(),
  status: z.enum(['sent', 'failed']).optional(),
  recipient: z.string().optional(),
});

/**
 * POST /admin/email/test
 * Send a test email to verify configuration
 */
export async function sendTestEmail(ctx: Context): Promise<void> {
  const validation = sendTestEmailSchema.safeParse(ctx.request.body);
  if (!validation.success) {
    throw new AppError('Invalid request body', 400, 'VALIDATION_ERROR', {
      errors: z.flattenError(validation.error).fieldErrors,
    });
  }

  const { to, type } = validation.data;

  const result = await emailService.sendTestEmail(to, type as EmailType);

  if (result.success) {
    ctx.status = 200;
    ctx.body = {
      success: true,
      message: 'Test email sent successfully',
      messageId: result.messageId,
    };
  } else {
    ctx.status = 200;
    ctx.body = {
      success: false,
      message: 'Failed to send test email',
      error: result.error,
    };
  }
}

/**
 * GET /admin/email/stats
 * Get email delivery statistics
 */
export async function getEmailStats(ctx: Context): Promise<void> {
  const validation = getStatsSchema.safeParse(ctx.query);
  if (!validation.success) {
    throw new AppError('Invalid query parameters', 400, 'VALIDATION_ERROR', {
      errors: z.flattenError(validation.error).fieldErrors,
    });
  }

  const { days } = validation.data;
  const stats = await emailService.getStats(days);

  ctx.status = 200;
  ctx.body = {
    success: true,
    data: {
      period: {
        days,
        from: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString(),
      },
      ...stats,
    },
  };
}

/**
 * GET /admin/email/logs
 * Get recent email logs
 */
export async function getEmailLogs(ctx: Context): Promise<void> {
  const validation = getLogsSchema.safeParse(ctx.query);
  if (!validation.success) {
    throw new AppError('Invalid query parameters', 400, 'VALIDATION_ERROR', {
      errors: z.flattenError(validation.error).fieldErrors,
    });
  }

  const { limit, offset, type, status, recipient } = validation.data;
  const { logs, total } = await emailService.getLogs({
    limit,
    offset,
    type: type as EmailType | undefined,
    status: status as 'sent' | 'failed' | undefined,
    recipient,
  });

  ctx.status = 200;
  ctx.body = {
    success: true,
    data: {
      logs: logs.map((log) => ({
        id: log.id,
        type: log.type,
        recipient: log.recipient,
        subject: log.subject,
        status: log.status,
        provider: log.provider,
        messageId: log.messageId,
        error: log.error,
        sentAt: log.sentAt,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + logs.length < total,
      },
    },
  };
}
