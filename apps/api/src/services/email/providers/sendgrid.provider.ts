import sgMail from '@sendgrid/mail';
import { config } from '../../../config/index.js';
import type { EmailProvider, SendEmailOptions } from '../email.types.js';

export class SendGridEmailProvider implements EmailProvider {
  name = 'sendgrid';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('SendGrid API key is required');
    }
    sgMail.setApiKey(apiKey);
  }

  async send(options: SendEmailOptions): Promise<void> {
    await sgMail.send({
      to: options.to,
      from: {
        email: config.email.from,
        name: config.email.fromName,
      },
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
  }
}

export function createSendGridProvider(apiKey: string): EmailProvider {
  return new SendGridEmailProvider(apiKey);
}
