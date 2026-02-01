import type { EmailTemplate, InvitationEmailData } from '../email.types.js';
import { SupportedLocale } from '../../../database/models/enums.js';
import { getEmailTranslations, interpolate } from '../../../i18n/index.js';

export function invitationEmailTemplate(data: InvitationEmailData): EmailTemplate {
  const { firstName, tenantName, inviterName, inviteUrl, role, locale = SupportedLocale.EN } = data;
  const t = getEmailTranslations(locale);

  // Get translated role name
  const roleKey = role as keyof typeof t.roles;
  const roleDisplay = t.roles[roleKey] || role;

  const subject = interpolate(t.invitation.subject, { tenantName });
  const greeting = interpolate(t.common.greeting, { firstName });
  const body = interpolate(t.invitation.body, { inviterName, tenantName, role: roleDisplay });

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
  <h1 style="color: #2563eb; margin-bottom: 24px;">${t.invitation.headline}</h1>

  <p>${greeting}</p>

  <p><strong>${body}</strong></p>

  <p>${t.invitation.instructions}</p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="${inviteUrl}"
       style="background-color: #2563eb; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
      ${t.invitation.cta}
    </a>
  </div>

  <p style="color: #666; font-size: 14px;">
    ${t.common.linkAltText}<br>
    <a href="${inviteUrl}" style="color: #2563eb; word-break: break-all;">${inviteUrl}</a>
  </p>

  <p style="color: #666; font-size: 14px;">
    ${interpolate(t.common.expireNotice, { duration: t.invitation.expire })}
  </p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">

  <p style="color: #999; font-size: 12px;">
    ${t.invitation.ignoreNotice}
  </p>
</body>
</html>
    `.trim(),
    text: `
${t.invitation.headline}

${greeting}

${body}

${t.invitation.instructions}

${inviteUrl}

${interpolate(t.common.expireNotice, { duration: t.invitation.expire })}

${t.invitation.ignoreNotice}
    `.trim(),
  };
}
