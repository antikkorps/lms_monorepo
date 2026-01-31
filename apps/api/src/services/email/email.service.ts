import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { createCircuitBreaker } from './circuit-breaker.js';
import { createConsoleProvider } from './providers/console.provider.js';
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
import type {
  EmailProvider,
  EmailProviderType,
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

      case 'console':
      default:
        baseProvider = createConsoleProvider();
        // Don't wrap console provider in circuit breaker
        return baseProvider;
    }

    // Wrap real providers in circuit breaker
    return createCircuitBreaker(baseProvider);
  }

  async sendVerificationEmail(data: VerificationEmailData): Promise<void> {
    const template = verificationEmailTemplate(data);

    try {
      await this.provider.send({
        to: data.to,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      logger.info({ to: data.to, type: 'verification' }, 'Verification email sent');
    } catch (error) {
      logger.error(
        { to: data.to, type: 'verification', error: error instanceof Error ? error.message : 'Unknown' },
        'Failed to send verification email'
      );
      // Don't rethrow - email failure shouldn't block registration
    }
  }

  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<void> {
    const template = passwordResetEmailTemplate(data);

    try {
      await this.provider.send({
        to: data.to,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      logger.info({ to: data.to, type: 'password-reset' }, 'Password reset email sent');
    } catch (error) {
      logger.error(
        { to: data.to, type: 'password-reset', error: error instanceof Error ? error.message : 'Unknown' },
        'Failed to send password reset email'
      );
      // Don't rethrow - email failure shouldn't block the flow
    }
  }

  async sendInvitationEmail(data: InvitationEmailData): Promise<void> {
    const template = invitationEmailTemplate(data);

    try {
      await this.provider.send({
        to: data.to,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      logger.info(
        { to: data.to, type: 'invitation', tenantName: data.tenantName },
        'Invitation email sent'
      );
    } catch (error) {
      logger.error(
        { to: data.to, type: 'invitation', error: error instanceof Error ? error.message : 'Unknown' },
        'Failed to send invitation email'
      );
      // Don't rethrow - email failure shouldn't block invitation creation
    }
  }

  async sendNotificationEmail(data: NotificationEmailData): Promise<void> {
    let template;

    switch (data.type) {
      case 'lesson_completed':
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
        return;
    }

    try {
      await this.provider.send({
        to: data.to,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      logger.info(
        { to: data.to, type: `notification-${data.type}` },
        'Notification email sent'
      );
    } catch (error) {
      logger.error(
        { to: data.to, type: `notification-${data.type}`, error: error instanceof Error ? error.message : 'Unknown' },
        'Failed to send notification email'
      );
      throw error; // Rethrow for queue retry
    }
  }

  async sendDigestEmail(data: DigestEmailData): Promise<void> {
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

    try {
      await this.provider.send({
        to: data.to,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      logger.info(
        { to: data.to, type: 'digest', notificationCount: data.notifications.length },
        'Digest email sent'
      );
    } catch (error) {
      logger.error(
        { to: data.to, type: 'digest', error: error instanceof Error ? error.message : 'Unknown' },
        'Failed to send digest email'
      );
      throw error; // Rethrow for queue retry
    }
  }
}

// Singleton instance
export const emailService = new EmailService();
