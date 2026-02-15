import type { Context } from 'koa';
import Mailjet from 'node-mailjet';
import { z } from 'zod';
import { config } from '../config/index.js';
import { AppError } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';

const subscribeSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100).optional(),
});

export async function subscribe(ctx: Context): Promise<void> {
  const input = subscribeSchema.parse(ctx.request.body);

  const { mailjetApiKey, mailjetApiSecret, mailjetContactListId } = config.email;

  if (!mailjetApiKey || !mailjetApiSecret) {
    throw AppError.internal('Newsletter service not configured');
  }

  const client = new Mailjet({ apiKey: mailjetApiKey, apiSecret: mailjetApiSecret });

  try {
    // Create or update contact
    await client.post('contact', { version: 'v3' }).request({
      IsExcludedFromCampaigns: false,
      Email: input.email,
      Name: input.firstName || '',
    });

    // Add contact to list if configured
    if (mailjetContactListId) {
      await client
        .post('contactslist', { version: 'v3' })
        .id(Number(mailjetContactListId))
        .action('managecontact')
        .request({
          Email: input.email,
          Name: input.firstName || '',
          Action: 'addnoforce',
        });
    }

    logger.info({ email: input.email }, 'Newsletter subscription successful');

    ctx.status = 200;
    ctx.body = {
      success: true,
      data: { subscribed: true },
    };
  } catch (error) {
    const err = error as Error & { statusCode?: number };

    // Mailjet returns 400 if contact already exists — treat as success
    if (err.statusCode === 400) {
      logger.info({ email: input.email }, 'Newsletter: contact already exists');
      ctx.status = 200;
      ctx.body = {
        success: true,
        data: { subscribed: true },
      };
      return;
    }

    logger.error({ err, email: input.email }, 'Newsletter subscription failed');
    throw AppError.internal('Failed to subscribe to newsletter');
  }
}
