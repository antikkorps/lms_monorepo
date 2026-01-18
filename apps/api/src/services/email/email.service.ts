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
} from './templates/index.js';
import type {
  EmailProvider,
  EmailProviderType,
  VerificationEmailData,
  PasswordResetEmailData,
  InvitationEmailData,
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
}

// Singleton instance
export const emailService = new EmailService();
