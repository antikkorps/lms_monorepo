import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { createCircuitBreaker } from './circuit-breaker.js';
import { createConsoleProvider } from './providers/console.provider.js';
import { createMailjetProvider } from './providers/mailjet.provider.js';
import { createPostmarkProvider } from './providers/postmark.provider.js';
import { createSendGridProvider } from './providers/sendgrid.provider.js';
import {
  verificationEmailTemplate,
  passwordResetEmailTemplate,
  invitationEmailTemplate,
  lessonCompletedEmailTemplate,
  courseCompletedEmailTemplate,
  badgeEarnedEmailTemplate,
  weeklyDigestEmailTemplate,
} from './templates/index.js';
import { EmailLog, type EmailType } from '../../database/models/EmailLog.js';
import type {
  EmailProvider,
  EmailProviderType,
  SendResult,
  VerificationEmailData,
  PasswordResetEmailData,
  InvitationEmailData,
  NotificationEmailData,
  DigestEmailData,
} from './email.types.js';

class EmailService {
  private provider: EmailProvider;
  private from: string;

  constructor() {
    this.from = config.email.from;
    this.provider = this.createProvider(config.email.provider as EmailProviderType);

    logger.info(
      { provider: this.provider.name, from: this.from },
      'Email service initialized'
    );
  }

  private createProvider(providerType: EmailProviderType): EmailProvider {
    let baseProvider: EmailProvider;

    switch (providerType) {
      case 'postmark':
        baseProvider = createPostmarkProvider(config.email.postmarkApiKey);
        break;

      case 'sendgrid':
        baseProvider = createSendGridProvider(config.email.sendgridApiKey);
        break;

      case 'mailjet':
        baseProvider = createMailjetProvider(
          config.email.mailjetApiKey,
          config.email.mailjetApiSecret
        );
        break;

      case 'console':
      default:
        baseProvider = createConsoleProvider();
        // Don't wrap console provider in circuit breaker
        return baseProvider;
    }

    // Wrap real providers in circuit breaker
    return createCircuitBreaker(baseProvider);
  }

  /**
   * Log email send result to database
   */
  private async logEmail(
    type: EmailType,
    recipient: string,
    subject: string,
    result: SendResult,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      await EmailLog.create({
        type,
        recipient,
        subject,
        status: result.success ? 'sent' : 'failed',
        provider: this.provider.name,
        messageId: result.messageId || null,
        error: result.error || null,
        metadata: metadata || {},
        sentAt: new Date(),
      });
    } catch (err) {
      // Don't let logging failure affect email sending
      logger.error(
        { error: err instanceof Error ? err.message : 'Unknown', type, recipient },
        'Failed to log email'
      );
    }
  }

  async sendVerificationEmail(data: VerificationEmailData): Promise<SendResult> {
    const template = verificationEmailTemplate(data);

    const result = await this.provider.send({
      to: data.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    await this.logEmail('verification', data.to, template.subject, result, {
      firstName: data.firstName,
      locale: data.locale,
    });

    if (result.success) {
      logger.info({ to: data.to, type: 'verification', messageId: result.messageId }, 'Verification email sent');
    } else {
      logger.error(
        { to: data.to, type: 'verification', error: result.error },
        'Failed to send verification email'
      );
    }

    return result;
  }

  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<SendResult> {
    const template = passwordResetEmailTemplate(data);

    const result = await this.provider.send({
      to: data.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    await this.logEmail('password_reset', data.to, template.subject, result, {
      firstName: data.firstName,
      locale: data.locale,
    });

    if (result.success) {
      logger.info({ to: data.to, type: 'password-reset', messageId: result.messageId }, 'Password reset email sent');
    } else {
      logger.error(
        { to: data.to, type: 'password-reset', error: result.error },
        'Failed to send password reset email'
      );
    }

    return result;
  }

  async sendInvitationEmail(data: InvitationEmailData): Promise<SendResult> {
    const template = invitationEmailTemplate(data);

    const result = await this.provider.send({
      to: data.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    await this.logEmail('invitation', data.to, template.subject, result, {
      firstName: data.firstName,
      tenantName: data.tenantName,
      inviterName: data.inviterName,
      role: data.role,
      locale: data.locale,
    });

    if (result.success) {
      logger.info(
        { to: data.to, type: 'invitation', tenantName: data.tenantName, messageId: result.messageId },
        'Invitation email sent'
      );
    } else {
      logger.error(
        { to: data.to, type: 'invitation', error: result.error },
        'Failed to send invitation email'
      );
    }

    return result;
  }

  async sendNotificationEmail(data: NotificationEmailData): Promise<SendResult> {
    let template;
    let emailType: EmailType;

    switch (data.type) {
      case 'lesson_completed':
        emailType = 'notification_lesson_completed';
        template = lessonCompletedEmailTemplate({
          to: data.to,
          firstName: data.firstName,
          lessonName: data.lessonName || 'a lesson',
          courseName: data.courseName || 'your course',
          courseUrl: data.courseUrl || '',
          locale: data.locale,
        });
        break;

      case 'course_completed':
        emailType = 'notification_course_completed';
        template = courseCompletedEmailTemplate({
          to: data.to,
          firstName: data.firstName,
          courseName: data.courseName || 'your course',
          dashboardUrl: data.dashboardUrl || '',
          certificateUrl: data.certificateUrl,
          locale: data.locale,
        });
        break;

      case 'badge_earned':
        emailType = 'notification_badge_earned';
        template = badgeEarnedEmailTemplate({
          to: data.to,
          firstName: data.firstName,
          badgeName: data.badgeName || 'a badge',
          badgeDescription: data.badgeDescription || '',
          badgeIconUrl: data.badgeIconUrl,
          profileUrl: data.profileUrl || '',
          locale: data.locale,
        });
        break;

      default:
        logger.warn({ type: data.type }, 'Unknown notification email type');
        return { success: false, error: 'Unknown notification type' };
    }

    const result = await this.provider.send({
      to: data.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    await this.logEmail(emailType, data.to, template.subject, result, {
      notificationType: data.type,
      firstName: data.firstName,
      locale: data.locale,
    });

    if (result.success) {
      logger.info(
        { to: data.to, type: `notification-${data.type}`, messageId: result.messageId },
        'Notification email sent'
      );
    } else {
      logger.error(
        { to: data.to, type: `notification-${data.type}`, error: result.error },
        'Failed to send notification email'
      );
      // Throw for queue retry on failure
      throw new Error(result.error || 'Email send failed');
    }

    return result;
  }

  async sendDigestEmail(data: DigestEmailData): Promise<SendResult> {
    const template = weeklyDigestEmailTemplate({
      to: data.to,
      firstName: data.firstName,
      notifications: data.notifications,
      dashboardUrl: data.dashboardUrl,
      settingsUrl: data.settingsUrl,
      weekStart: data.weekStart,
      weekEnd: data.weekEnd,
      locale: data.locale,
    });

    const result = await this.provider.send({
      to: data.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    await this.logEmail('digest', data.to, template.subject, result, {
      firstName: data.firstName,
      notificationCount: data.notifications.length,
      locale: data.locale,
    });

    if (result.success) {
      logger.info(
        { to: data.to, type: 'digest', notificationCount: data.notifications.length, messageId: result.messageId },
        'Digest email sent'
      );
    } else {
      logger.error(
        { to: data.to, type: 'digest', error: result.error },
        'Failed to send digest email'
      );
      // Throw for queue retry on failure
      throw new Error(result.error || 'Email send failed');
    }

    return result;
  }

  /**
   * Send a test email to verify configuration
   */
  async sendTestEmail(to: string, type: EmailType = 'test'): Promise<SendResult> {
    const subject = `[TEST] Email Configuration Test - ${new Date().toISOString()}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Email Test</h1>
        <p>This is a test email from your LMS platform.</p>
        <p><strong>Provider:</strong> ${this.provider.name}</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        <p><strong>Type:</strong> ${type}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">
          If you received this email, your email configuration is working correctly.
        </p>
      </div>
    `;
    const text = `Email Test\n\nThis is a test email from your LMS platform.\n\nProvider: ${this.provider.name}\nTime: ${new Date().toISOString()}\nType: ${type}\n\nIf you received this email, your email configuration is working correctly.`;

    const result = await this.provider.send({
      to,
      subject,
      html,
      text,
    });

    await this.logEmail('test', to, subject, result, { testType: type });

    if (result.success) {
      logger.info({ to, type: 'test', messageId: result.messageId }, 'Test email sent');
    } else {
      logger.error({ to, type: 'test', error: result.error }, 'Failed to send test email');
    }

    return result;
  }

  /**
   * Get email statistics
   */
  async getStats(days = 7): Promise<{
    total: number;
    sent: number;
    failed: number;
    byType: Record<string, { sent: number; failed: number }>;
    byDay: Array<{ date: string; sent: number; failed: number }>;
  }> {
    const { Op, fn, col } = await import('sequelize');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Total counts
    const [totalResult, sentResult, failedResult] = await Promise.all([
      EmailLog.count({ where: { sentAt: { [Op.gte]: startDate } } }),
      EmailLog.count({ where: { sentAt: { [Op.gte]: startDate }, status: 'sent' } }),
      EmailLog.count({ where: { sentAt: { [Op.gte]: startDate }, status: 'failed' } }),
    ]);

    // By type
    const byTypeResults = await EmailLog.findAll({
      attributes: [
        'type',
        'status',
        [fn('COUNT', col('id')), 'count'],
      ],
      where: { sentAt: { [Op.gte]: startDate } },
      group: ['type', 'status'],
      raw: true,
    }) as unknown as Array<{ type: string; status: string; count: string }>;

    const byType: Record<string, { sent: number; failed: number }> = {};
    for (const row of byTypeResults) {
      if (!byType[row.type]) {
        byType[row.type] = { sent: 0, failed: 0 };
      }
      if (row.status === 'sent') {
        byType[row.type].sent = parseInt(row.count, 10);
      } else if (row.status === 'failed') {
        byType[row.type].failed = parseInt(row.count, 10);
      }
    }

    // By day
    const byDayResults = await EmailLog.findAll({
      attributes: [
        [fn('DATE', col('sent_at')), 'date'],
        'status',
        [fn('COUNT', col('id')), 'count'],
      ],
      where: { sentAt: { [Op.gte]: startDate } },
      group: [fn('DATE', col('sent_at')), 'status'],
      order: [[fn('DATE', col('sent_at')), 'ASC']],
      raw: true,
    }) as unknown as Array<{ date: string; status: string; count: string }>;

    const byDayMap: Record<string, { sent: number; failed: number }> = {};
    for (const row of byDayResults) {
      if (!byDayMap[row.date]) {
        byDayMap[row.date] = { sent: 0, failed: 0 };
      }
      if (row.status === 'sent') {
        byDayMap[row.date].sent = parseInt(row.count, 10);
      } else if (row.status === 'failed') {
        byDayMap[row.date].failed = parseInt(row.count, 10);
      }
    }

    const byDay = Object.entries(byDayMap).map(([date, counts]) => ({
      date,
      ...counts,
    }));

    return {
      total: totalResult,
      sent: sentResult,
      failed: failedResult,
      byType,
      byDay,
    };
  }

  /**
   * Get recent email logs
   */
  async getLogs(options: {
    limit?: number;
    offset?: number;
    type?: EmailType;
    status?: 'sent' | 'failed';
    recipient?: string;
  } = {}): Promise<{ logs: EmailLog[]; total: number }> {
    const { Op } = await import('sequelize');
    const where: Record<string, unknown> = {};

    if (options.type) {
      where.type = options.type;
    }
    if (options.status) {
      where.status = options.status;
    }
    if (options.recipient) {
      where.recipient = { [Op.iLike]: `%${options.recipient}%` };
    }

    const [logs, total] = await Promise.all([
      EmailLog.findAll({
        where,
        order: [['sentAt', 'DESC']],
        limit: options.limit || 50,
        offset: options.offset || 0,
      }),
      EmailLog.count({ where }),
    ]);

    return { logs, total };
  }
}

// Singleton instance
export const emailService = new EmailService();
