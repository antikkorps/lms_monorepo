import { ServerClient } from 'postmark';
import { config } from '../../../config/index.js';
import type { EmailProvider, SendEmailOptions } from '../email.types.js';

export class PostmarkEmailProvider implements EmailProvider {
  name = 'postmark';
  private client: ServerClient;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Postmark API key is required');
    }
    this.client = new ServerClient(apiKey);
  }

  async send(options: SendEmailOptions): Promise<void> {
    await this.client.sendEmail({
      From: `${config.email.fromName} <${config.email.from}>`,
      To: options.to,
      Subject: options.subject,
      HtmlBody: options.html,
      TextBody: options.text,
      MessageStream: 'outbound',
    });
  }
}

export function createPostmarkProvider(apiKey: string): EmailProvider {
  return new PostmarkEmailProvider(apiKey);
}
