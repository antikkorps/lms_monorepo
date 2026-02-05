import Mailjet from 'node-mailjet';
import { config } from '../../../config/index.js';
import type { EmailProvider, SendEmailOptions, SendResult } from '../email.types.js';

export class MailjetEmailProvider implements EmailProvider {
  name = 'mailjet';
  private client: Mailjet;

  constructor(apiKey: string, apiSecret: string) {
    if (!apiKey || !apiSecret) {
      throw new Error('Mailjet API key and secret are required');
    }
    this.client = new Mailjet({ apiKey, apiSecret });
  }

  async send(options: SendEmailOptions): Promise<SendResult> {
    try {
      const response = await this.client.post('send', { version: 'v3.1' }).request({
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

      // Extract message ID from Mailjet response
      const body = response.body as {
        Messages?: Array<{
          Status: string;
          To?: Array<{ MessageID: number }>;
        }>;
      };

      const messageId = body.Messages?.[0]?.To?.[0]?.MessageID?.toString();

      return {
        success: true,
        messageId,
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

export function createMailjetProvider(apiKey: string, apiSecret: string): EmailProvider {
  return new MailjetEmailProvider(apiKey, apiSecret);
}
