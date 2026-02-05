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
        textPreview: options.text?.substring(0, 200),
      },
      '========== EMAIL (Console Provider - Dev Mode) =========='
    );

    // Log the full HTML content in a readable format for development
    console.log('\n' + '='.repeat(60));
    console.log(`TO: ${options.to}`);
    console.log(`SUBJECT: ${options.subject}`);
    console.log(`MESSAGE ID: ${messageId}`);
    console.log('='.repeat(60));
    console.log('TEXT VERSION:');
    console.log(options.text || '(no text version)');
    console.log('='.repeat(60) + '\n');

    return {
      success: true,
      messageId,
    };
  }
}

export function createConsoleProvider(): EmailProvider {
  return new ConsoleEmailProvider();
}
