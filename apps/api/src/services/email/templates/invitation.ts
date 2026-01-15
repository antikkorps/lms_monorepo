import type { EmailTemplate, InvitationEmailData } from '../email.types.js';

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  learner: 'Learner',
  instructor: 'Instructor',
  manager: 'Manager',
  tenant_admin: 'Administrator',
};

export function invitationEmailTemplate(data: InvitationEmailData): EmailTemplate {
  const { firstName, tenantName, inviterName, inviteUrl, role } = data;
  const roleDisplay = ROLE_DISPLAY_NAMES[role] || role;

  return {
    subject: `You're invited to join ${tenantName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #2563eb; margin-bottom: 24px;">You're Invited!</h1>

  <p>Hi ${firstName},</p>

  <p><strong>${inviterName}</strong> has invited you to join <strong>${tenantName}</strong> as a <strong>${roleDisplay}</strong>.</p>

  <p>Click the button below to accept the invitation and set up your account:</p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="${inviteUrl}"
       style="background-color: #2563eb; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
      Accept Invitation
    </a>
  </div>

  <p style="color: #666; font-size: 14px;">
    Or copy and paste this link in your browser:<br>
    <a href="${inviteUrl}" style="color: #2563eb; word-break: break-all;">${inviteUrl}</a>
  </p>

  <p style="color: #666; font-size: 14px;">
    This invitation will expire in 7 days.
  </p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">

  <p style="color: #999; font-size: 12px;">
    If you weren't expecting this invitation, you can safely ignore this email.
  </p>
</body>
</html>
    `.trim(),
    text: `
You're Invited!

Hi ${firstName},

${inviterName} has invited you to join ${tenantName} as a ${roleDisplay}.

Click the link below to accept the invitation and set up your account:

${inviteUrl}

This invitation will expire in 7 days.

If you weren't expecting this invitation, you can safely ignore this email.
    `.trim(),
  };
}
