import type { EmailTemplate, PasswordResetEmailData } from '../email.types.js';

export function passwordResetEmailTemplate(data: PasswordResetEmailData): EmailTemplate {
  const { firstName, resetUrl } = data;

  return {
    subject: 'Reset your password',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #2563eb; margin-bottom: 24px;">Password Reset</h1>

  <p>Hi ${firstName},</p>

  <p>We received a request to reset your password. Click the button below to choose a new password:</p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="${resetUrl}"
       style="background-color: #2563eb; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
      Reset Password
    </a>
  </div>

  <p style="color: #666; font-size: 14px;">
    Or copy and paste this link in your browser:<br>
    <a href="${resetUrl}" style="color: #2563eb; word-break: break-all;">${resetUrl}</a>
  </p>

  <p style="color: #666; font-size: 14px;">
    This link will expire in 1 hour.
  </p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">

  <p style="color: #999; font-size: 12px;">
    If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
  </p>
</body>
</html>
    `.trim(),
    text: `
Password Reset

Hi ${firstName},

We received a request to reset your password. Click the link below to choose a new password:

${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
    `.trim(),
  };
}
