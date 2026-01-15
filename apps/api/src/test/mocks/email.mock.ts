/**
 * Email Service Mock
 *
 * Mock for the email service to test email-sending flows without actual delivery.
 */

import { vi } from 'vitest';

export interface EmailServiceMock {
  sendVerificationEmail: ReturnType<typeof vi.fn>;
  sendPasswordResetEmail: ReturnType<typeof vi.fn>;
  sendInvitationEmail: ReturnType<typeof vi.fn>;
  _sentEmails: SentEmail[];
  _reset: () => void;
}

export interface SentEmail {
  type: 'verification' | 'password-reset' | 'invitation';
  to: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

export function createEmailServiceMock(): EmailServiceMock {
  const sentEmails: SentEmail[] = [];

  const mock: EmailServiceMock = {
    sendVerificationEmail: vi.fn(async (data) => {
      sentEmails.push({
        type: 'verification',
        to: data.to,
        data,
        timestamp: new Date(),
      });
    }),

    sendPasswordResetEmail: vi.fn(async (data) => {
      sentEmails.push({
        type: 'password-reset',
        to: data.to,
        data,
        timestamp: new Date(),
      });
    }),

    sendInvitationEmail: vi.fn(async (data) => {
      sentEmails.push({
        type: 'invitation',
        to: data.to,
        data,
        timestamp: new Date(),
      });
    }),

    _sentEmails: sentEmails,

    _reset: function () {
      this.sendVerificationEmail.mockClear();
      this.sendPasswordResetEmail.mockClear();
      this.sendInvitationEmail.mockClear();
      this._sentEmails.length = 0;
    },
  };

  return mock;
}

// Singleton mock instance for vi.mock
export const emailServiceMock = createEmailServiceMock();
