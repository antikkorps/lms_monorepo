import { ServerClient } from 'postmark';
import { config } from '../../../config/index.js';
import type { EmailProvider, SendEmailOptions, SendResult } from '../email.types.js';

export class PostmarkEmailProvider implements EmailProvider {
  name = 'postmark';
  private client: ServerClient;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Postmark API key is required');
    }
    this.client = new ServerClient(apiKey);
  }

  async send(options: SendEmailOptions): Promise<SendResult> {
    try {
      const response = await this.client.sendEmail({
        From: `${config.email.fromName} <${config.email.from}>`,
        To: options.to,
        Subject: options.subject,
        HtmlBody: options.html,
        TextBody: options.text,
        MessageStream: 'outbound',
      });

      return {
        success: true,
        messageId: response.MessageID,
      };
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        error: err.message,
      };
    }
  }
}

export function createPostmarkProvider(apiKey: string): EmailProvider {
  return new PostmarkEmailProvider(apiKey);
}
