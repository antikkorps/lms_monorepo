import type { EmailTemplate, VerificationEmailData } from '../email.types.js';
import { SupportedLocale } from '../../../database/models/enums.js';
import { getEmailTranslations, interpolate } from '../../../i18n/index.js';

export function verificationEmailTemplate(data: VerificationEmailData): EmailTemplate {
  const { firstName, verificationUrl, locale = SupportedLocale.EN } = data;
  const t = getEmailTranslations(locale);

  const subject = t.verification.subject;
  const headline = interpolate(t.verification.headline, { firstName });

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
  <h1 style="color: #2563eb; margin-bottom: 24px;">${headline}</h1>

  <p>${t.verification.body}</p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="${verificationUrl}"
       style="background-color: #2563eb; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
      ${t.verification.cta}
    </a>
  </div>

  <p style="color: #666; font-size: 14px;">
    ${t.common.linkAltText}<br>
    <a href="${verificationUrl}" style="color: #2563eb; word-break: break-all;">${verificationUrl}</a>
  </p>

  <p style="color: #666; font-size: 14px;">
    ${interpolate(t.common.expireNotice, { duration: t.verification.expire })}
  </p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">

  <p style="color: #999; font-size: 12px;">
    ${t.verification.ignoreNotice}
  </p>
</body>
</html>
    `.trim(),
    text: `
${headline}

${t.verification.body}

${verificationUrl}

${interpolate(t.common.expireNotice, { duration: t.verification.expire })}

${t.verification.ignoreNotice}
    `.trim(),
  };
}
