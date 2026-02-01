import type { EmailTemplate, PasswordResetEmailData } from '../email.types.js';
import { SupportedLocale } from '../../../database/models/enums.js';
import { getEmailTranslations, interpolate } from '../../../i18n/index.js';

export function passwordResetEmailTemplate(data: PasswordResetEmailData): EmailTemplate {
  const { firstName, resetUrl, locale = SupportedLocale.EN } = data;
  const t = getEmailTranslations(locale);

  const greeting = interpolate(t.common.greeting, { firstName });

  return {
    subject: t.passwordReset.subject,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #2563eb; margin-bottom: 24px;">${t.passwordReset.headline}</h1>

  <p>${greeting}</p>

  <p>${t.passwordReset.body}</p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="${resetUrl}"
       style="background-color: #2563eb; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
      ${t.passwordReset.cta}
    </a>
  </div>

  <p style="color: #666; font-size: 14px;">
    ${t.common.linkAltText}<br>
    <a href="${resetUrl}" style="color: #2563eb; word-break: break-all;">${resetUrl}</a>
  </p>

  <p style="color: #666; font-size: 14px;">
    ${interpolate(t.common.expireNotice, { duration: t.passwordReset.expire })}
  </p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">

  <p style="color: #999; font-size: 12px;">
    ${t.passwordReset.ignoreNotice}
  </p>
</body>
</html>
    `.trim(),
    text: `
${t.passwordReset.headline}

${greeting}

${t.passwordReset.body}

${resetUrl}

${interpolate(t.common.expireNotice, { duration: t.passwordReset.expire })}

${t.passwordReset.ignoreNotice}
    `.trim(),
  };
}
