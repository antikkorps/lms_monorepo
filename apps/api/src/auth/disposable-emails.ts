/**
 * Disposable / temporary email domain blocklist for signup anti-abuse.
 *
 * This is a curated list of the most common throwaway providers — not
 * exhaustive (those lists run to thousands of entries and go stale fast).
 * It catches the bulk of casual abuse without an external dependency or
 * network lookup. Extend as needed.
 */
const DISPOSABLE_EMAIL_DOMAINS = new Set<string>([
  '0-mail.com',
  '10minutemail.com',
  '20minutemail.com',
  'discard.email',
  'dispostable.com',
  'fakeinbox.com',
  'getairmail.com',
  'getnada.com',
  'guerrillamail.com',
  'guerrillamail.info',
  'guerrillamail.net',
  'mailcatch.com',
  'maildrop.cc',
  'mailinator.com',
  'mintemail.com',
  'mohmal.com',
  'mytemp.email',
  'sharklasers.com',
  'spam4.me',
  'temp-mail.org',
  'tempmail.com',
  'tempmailo.com',
  'throwawaymail.com',
  'trashmail.com',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
]);

/**
 * Returns true when the email's domain is a known disposable provider.
 * Matches the exact domain and any subdomain (e.g. `foo.mailinator.com`).
 */
export function isDisposableEmail(email: string): boolean {
  const at = email.lastIndexOf('@');
  if (at === -1) {
    return false;
  }
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (!domain) {
    return false;
  }
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return true;
  }
  // Subdomain match: registered.disposable -> check the last two labels onward.
  const labels = domain.split('.');
  for (let i = 1; i < labels.length - 1; i++) {
    if (DISPOSABLE_EMAIL_DOMAINS.has(labels.slice(i).join('.'))) {
      return true;
    }
  }
  return false;
}

export { DISPOSABLE_EMAIL_DOMAINS };
