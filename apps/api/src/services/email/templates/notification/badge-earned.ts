import type { EmailTemplate } from '../../email.types.js';
import { SupportedLocale } from '../../../../database/models/enums.js';
import { getEmailTranslations, interpolate } from '../../../../i18n/index.js';

export interface BadgeEarnedEmailData {
  to: string;
  firstName: string;
  badgeName: string;
  badgeDescription: string;
  badgeIconUrl?: string;
  profileUrl: string;
  locale?: SupportedLocale;
}

export function badgeEarnedEmailTemplate(data: BadgeEarnedEmailData): EmailTemplate {
  const { firstName, badgeName, badgeDescription, badgeIconUrl, profileUrl, locale = SupportedLocale.EN } = data;
  const t = getEmailTranslations(locale);

  const subject = interpolate(t.badgeEarned.subject, { badgeName });
  const greatJob = interpolate(t.badgeEarned.greatJob, { firstName });

  const iconSection = badgeIconUrl
    ? `<img src="${badgeIconUrl}" alt="${badgeName}" style="width: 80px; height: 80px; margin-bottom: 16px;">`
    : '<span style="font-size: 64px;">🏆</span>';

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
  <h1 style="color: #f59e0b; margin-bottom: 24px;">${t.badgeEarned.headline}</h1>

  <p>${greatJob}</p>

  <div style="background-color: #fef3c7; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: center;">
    ${iconSection}
    <h2 style="margin: 0 0 8px 0; color: #b45309;">${badgeName}</h2>
    <p style="margin: 0; color: #92400e;">${badgeDescription}</p>
  </div>

  <p>${t.badgeEarned.keepLearning}</p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="${profileUrl}"
       style="background-color: #f59e0b; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
      ${t.badgeEarned.cta}
    </a>
  </div>

  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">

  <p style="color: #999; font-size: 12px;">
    ${t.common.receivingBecause}
    <a href="%SETTINGS_URL%" style="color: #999;">${t.common.managePreferences}</a>
  </p>
</body>
</html>
    `.trim(),
    text: `
${t.badgeEarned.headline}

${greatJob}

${badgeName}
${badgeDescription}

${t.badgeEarned.keepLearning}

${t.badgeEarned.cta}: ${profileUrl}

---
${t.common.receivingBecause}
    `.trim(),
  };
}
