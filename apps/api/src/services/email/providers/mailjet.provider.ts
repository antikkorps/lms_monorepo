import Mailjet from 'node-mailjet';
import { config } from '../../../config/index.js';
import type { EmailProvider, SendEmailOptions } from '../email.types.js';

export class MailjetEmailProvider implements EmailProvider {
  name = 'mailjet';
  private client: Mailjet;

  constructor(apiKey: string, apiSecret: string) {
    if (!apiKey || !apiSecret) {
      throw new Error('Mailjet API key and secret are required');
    }
    this.client = new Mailjet({ apiKey, apiSecret });
  }

  async send(options: SendEmailOptions): Promise<void> {
    await this.client.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: config.email.from,
            Name: config.email.fromName,
          },
          To: [
            {
              Email: options.to,
            },
          ],
          Subject: options.subject,
          HTMLPart: options.html,
          TextPart: options.text,
        },
      ],
    });
  }
}

export function createMailjetProvider(apiKey: string, apiSecret: string): EmailProvider {
  return new MailjetEmailProvider(apiKey, apiSecret);
}
