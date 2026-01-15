export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailProvider {
  name: string;
  send(options: SendEmailOptions): Promise<void>;
}

export interface VerificationEmailData {
  to: string;
  firstName: string;
  verificationUrl: string;
}

export interface PasswordResetEmailData {
  to: string;
  firstName: string;
  resetUrl: string;
}

export interface InvitationEmailData {
  to: string;
  firstName: string;
  tenantName: string;
  inviterName: string;
  inviteUrl: string;
  role: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export type EmailProviderType = 'console' | 'postmark' | 'sendgrid';
