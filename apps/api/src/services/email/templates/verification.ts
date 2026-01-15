import type { EmailTemplate, VerificationEmailData } from '../email.types.js';

export function verificationEmailTemplate(data: VerificationEmailData): EmailTemplate {
  const { firstName, verificationUrl } = data;

  return {
    subject: 'Verify your email address',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #2563eb; margin-bottom: 24px;">Welcome, ${firstName}!</h1>

  <p>Thank you for registering. Please verify your email address by clicking the button below:</p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="${verificationUrl}"
       style="background-color: #2563eb; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
      Verify Email
    </a>
  </div>

  <p style="color: #666; font-size: 14px;">
    Or copy and paste this link in your browser:<br>
    <a href="${verificationUrl}" style="color: #2563eb; word-break: break-all;">${verificationUrl}</a>
  </p>

  <p style="color: #666; font-size: 14px;">
    This link will expire in 24 hours.
  </p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">

  <p style="color: #999; font-size: 12px;">
    If you didn't create an account, you can safely ignore this email.
  </p>
</body>
</html>
    `.trim(),
    text: `
Welcome, ${firstName}!

Thank you for registering. Please verify your email address by clicking the link below:

${verificationUrl}

This link will expire in 24 hours.

If you didn't create an account, you can safely ignore this email.
    `.trim(),
  };
}
