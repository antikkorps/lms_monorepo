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

import type { SupportedLocale } from '../../database/models/enums.js';

export interface NotificationEmailData {
  to: string;
  firstName: string;
  type: 'lesson_completed' | 'course_completed' | 'badge_earned';
  locale?: SupportedLocale;
  // Lesson completed
  lessonName?: string;
  courseName?: string;
  courseUrl?: string;
  // Course completed
  dashboardUrl?: string;
  certificateUrl?: string;
  // Badge earned
  badgeName?: string;
  badgeDescription?: string;
  badgeIconUrl?: string;
  profileUrl?: string;
}

export interface DigestEmailData {
  to: string;
  firstName: string;
  notifications: Array<{
    type: string;
    title: string;
    message: string;
    link: string;
    createdAt: Date;
  }>;
  dashboardUrl: string;
  settingsUrl: string;
  weekStart: Date;
  weekEnd: Date;
  locale?: SupportedLocale;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export type EmailProviderType = 'console' | 'postmark' | 'sendgrid';
