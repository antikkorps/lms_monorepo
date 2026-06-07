import { describe, it, expect } from 'vitest';
import { isDisposableEmail } from './disposable-emails.js';

describe('isDisposableEmail', () => {
  it('flags known disposable providers', () => {
    expect(isDisposableEmail('bob@mailinator.com')).toBe(true);
    expect(isDisposableEmail('alice@yopmail.com')).toBe(true);
    expect(isDisposableEmail('x@guerrillamail.com')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isDisposableEmail('Bob@MailInator.COM')).toBe(true);
  });

  it('matches subdomains of disposable providers', () => {
    expect(isDisposableEmail('user@inbox.mailinator.com')).toBe(true);
  });

  it('allows legitimate providers', () => {
    expect(isDisposableEmail('user@gmail.com')).toBe(false);
    expect(isDisposableEmail('jane@company.fr')).toBe(false);
    expect(isDisposableEmail('contact@iqon-ia.com')).toBe(false);
  });

  it('does not match domains that merely contain a blocked label', () => {
    // "mailinator.com.evil.example" should NOT match the blocklist entry.
    expect(isDisposableEmail('user@mailinatorXcom.example')).toBe(false);
  });

  it('returns false for malformed input', () => {
    expect(isDisposableEmail('not-an-email')).toBe(false);
    expect(isDisposableEmail('trailing@')).toBe(false);
  });
});
