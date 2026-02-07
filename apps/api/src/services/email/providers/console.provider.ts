import crypto from 'node:crypto';
import { logger } from '../../../utils/logger.js';
import type { EmailProvider, SendEmailOptions, SendResult } from '../email.types.js';

export class ConsoleEmailProvider implements EmailProvider {
  name = 'console';

  async send(options: SendEmailOptions): Promise<SendResult> {
    const messageId = `console-${crypto.randomUUID()}`;

    logger.info(
      {
        to: options.to,
        subject: options.subject,
        messageId,
        text: options.text || '(no text version)',
      },
      'Email sent (console provider)',
    );

    return {
      success: true,
      messageId,
    };
  }
}

export function createConsoleProvider(): EmailProvider {
  return new ConsoleEmailProvider();
}
