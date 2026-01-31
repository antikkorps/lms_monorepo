import type { EmailTemplate } from '../../email.types.js';
import { SupportedLocale } from '../../../../database/models/enums.js';
import { getEmailTranslations, interpolate, formatDateForLocale } from '../../../../i18n/index.js';

export interface DigestNotificationItem {
  type: string;
  title: string;
  message: string;
  link: string;
  createdAt: Date;
}

export interface WeeklyDigestEmailData {
  to: string;
  firstName: string;
  notifications: DigestNotificationItem[];
  dashboardUrl: string;
  settingsUrl: string;
  weekStart: Date;
  weekEnd: Date;
  locale?: SupportedLocale;
}

export function weeklyDigestEmailTemplate(data: WeeklyDigestEmailData): EmailTemplate {
  const { firstName, notifications, dashboardUrl, settingsUrl, weekStart, weekEnd, locale = SupportedLocale.EN } = data;
  const t = getEmailTranslations(locale);

  const notificationCount = notifications.length;
  const periodStr = `${formatDateForLocale(weekStart, locale)} - ${formatDateForLocale(weekEnd, locale)}`;

  const subject = interpolate(t.digest.subject, { count: notificationCount.toString(), period: periodStr });
  const greeting = interpolate(t.digest.greeting, { firstName });

  const notificationItems = notifications
    .map(
      (n) => `
    <tr>
      <td style="padding: 16px; border-bottom: 1px solid #eee;">
        <h3 style="margin: 0 0 4px 0; color: #333; font-size: 16px;">${n.title}</h3>
        <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">${n.message}</p>
        <a href="${n.link}" style="color: #2563eb; font-size: 14px;">${t.digest.viewDetails} &rarr;</a>
      </td>
    </tr>
  `
    )
    .join('');

  const textItems = notifications
    .map((n) => `- ${n.title}: ${n.message}\n  ${n.link}`)
    .join('\n\n');

  return {
    subject,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #2563eb; margin-bottom: 8px;">${t.digest.headline}</h1>
  <p style="color: #666; margin-bottom: 24px;">${periodStr}</p>

  <p>${greeting}</p>

  <p>${t.digest.intro}</p>

  <div style="background-color: #f0f9ff; border-radius: 8px; padding: 16px; margin: 24px 0; text-align: center;">
    <span style="font-size: 32px; font-weight: bold; color: #2563eb;">${notificationCount}</span>
    <p style="margin: 4px 0 0 0; color: #0369a1;">${t.digest.newUpdates}</p>
  </div>

  ${
    notifications.length > 0
      ? `
  <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
    ${notificationItems}
  </table>
  `
      : `<p style="color: #666; text-align: center;">${t.digest.noActivity}</p>`
  }

  <div style="text-align: center; margin: 32px 0;">
    <a href="${dashboardUrl}"
       style="background-color: #2563eb; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
      ${t.digest.cta}
    </a>
  </div>

  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">

  <p style="color: #999; font-size: 12px;">
    ${t.digest.receivingDigest}
    <a href="${settingsUrl}" style="color: #999;">${t.common.managePreferences}</a>
  </p>
</body>
</html>
    `.trim(),
    text: `
${t.digest.headline} (${periodStr})

${greeting}

${t.digest.intro}

${notificationCount} ${t.digest.newUpdates}

${notifications.length > 0 ? textItems : t.digest.noActivity}

${t.digest.cta}: ${dashboardUrl}

---
${t.digest.receivingDigest}
${t.common.managePreferences}: ${settingsUrl}
    `.trim(),
  };
}
