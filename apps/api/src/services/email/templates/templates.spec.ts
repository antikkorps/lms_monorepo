import { describe, it, expect } from 'vitest';
import { verificationEmailTemplate } from './verification.js';
import { passwordResetEmailTemplate } from './password-reset.js';
import { invitationEmailTemplate } from './invitation.js';

describe('Email Templates', () => {
  // ===========================================================================
  // Verification Email
  // ===========================================================================

  describe('verificationEmailTemplate', () => {
    it('should generate verification email with correct subject', () => {
      const result = verificationEmailTemplate({
        to: 'user@example.com',
        firstName: 'John',
        verificationUrl: 'https://example.com/verify?token=abc123',
      });

      expect(result.subject).toBe('Verify your email address');
    });

    it('should include firstName in HTML body', () => {
      const result = verificationEmailTemplate({
        to: 'user@example.com',
        firstName: 'Alice',
        verificationUrl: 'https://example.com/verify?token=abc123',
      });

      expect(result.html).toContain('Welcome, Alice!');
      expect(result.text).toContain('Welcome, Alice!');
    });

    it('should include verification URL in both HTML and text', () => {
      const verificationUrl = 'https://example.com/verify?token=abc123';
      const result = verificationEmailTemplate({
        to: 'user@example.com',
        firstName: 'John',
        verificationUrl,
      });

      expect(result.html).toContain(verificationUrl);
      expect(result.text).toContain(verificationUrl);
    });

    it('should include expiration notice', () => {
      const result = verificationEmailTemplate({
        to: 'user@example.com',
        firstName: 'John',
        verificationUrl: 'https://example.com/verify?token=abc123',
      });

      expect(result.html).toContain('24 hours');
      expect(result.text).toContain('24 hours');
    });
  });

  // ===========================================================================
  // Password Reset Email
  // ===========================================================================

  describe('passwordResetEmailTemplate', () => {
    it('should generate password reset email with correct subject', () => {
      const result = passwordResetEmailTemplate({
        to: 'user@example.com',
        firstName: 'John',
        resetUrl: 'https://example.com/reset?token=abc123',
      });

      expect(result.subject).toBe('Reset your password');
    });

    it('should include firstName in HTML body', () => {
      const result = passwordResetEmailTemplate({
        to: 'user@example.com',
        firstName: 'Bob',
        resetUrl: 'https://example.com/reset?token=abc123',
      });

      expect(result.html).toContain('Hi Bob,');
      expect(result.text).toContain('Hi Bob,');
    });

    it('should include reset URL in both HTML and text', () => {
      const resetUrl = 'https://example.com/reset?token=abc123';
      const result = passwordResetEmailTemplate({
        to: 'user@example.com',
        firstName: 'John',
        resetUrl,
      });

      expect(result.html).toContain(resetUrl);
      expect(result.text).toContain(resetUrl);
    });

    it('should include 1 hour expiration notice', () => {
      const result = passwordResetEmailTemplate({
        to: 'user@example.com',
        firstName: 'John',
        resetUrl: 'https://example.com/reset?token=abc123',
      });

      expect(result.html).toContain('1 hour');
      expect(result.text).toContain('1 hour');
    });
  });

  // ===========================================================================
  // Invitation Email
  // ===========================================================================

  describe('invitationEmailTemplate', () => {
    const defaultData = {
      to: 'invited@example.com',
      firstName: 'Carol',
      tenantName: 'Acme Corp',
      inviterName: 'John Doe',
      inviteUrl: 'https://example.com/invite?token=xyz789',
      role: 'learner',
    };

    it('should generate invitation email with tenant name in subject', () => {
      const result = invitationEmailTemplate(defaultData);

      expect(result.subject).toBe("You're invited to join Acme Corp");
    });

    it('should include all invitation details in body', () => {
      const result = invitationEmailTemplate(defaultData);

      expect(result.html).toContain('Carol');
      expect(result.html).toContain('John Doe');
      expect(result.html).toContain('Acme Corp');
      expect(result.html).toContain('Learner');

      expect(result.text).toContain('Carol');
      expect(result.text).toContain('John Doe');
      expect(result.text).toContain('Acme Corp');
      expect(result.text).toContain('Learner');
    });

    it('should include invite URL in both HTML and text', () => {
      const result = invitationEmailTemplate(defaultData);

      expect(result.html).toContain(defaultData.inviteUrl);
      expect(result.text).toContain(defaultData.inviteUrl);
    });

    it('should display correct role names', () => {
      const roles = [
        { role: 'learner', display: 'Learner' },
        { role: 'instructor', display: 'Instructor' },
        { role: 'manager', display: 'Manager' },
        { role: 'tenant_admin', display: 'Administrator' },
      ];

      for (const { role, display } of roles) {
        const result = invitationEmailTemplate({ ...defaultData, role });
        expect(result.html).toContain(display);
      }
    });

    it('should fallback to raw role if not in display map', () => {
      const result = invitationEmailTemplate({
        ...defaultData,
        role: 'custom_role',
      });

      expect(result.html).toContain('custom_role');
    });

    it('should include 7 days expiration notice', () => {
      const result = invitationEmailTemplate(defaultData);

      expect(result.html).toContain('7 days');
      expect(result.text).toContain('7 days');
    });
  });
});
