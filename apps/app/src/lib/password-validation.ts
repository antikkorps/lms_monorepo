/**
 * Password validation — mirrors backend rules from auth/password.ts
 * Used by RegisterView and AcceptInvitationView
 */

export interface PasswordValidationResult {
  valid: boolean;
  /** i18n key suffix for the first failing rule (e.g. "passwordTooShort") */
  errorKey: string | null;
}

const rules: Array<{ test: (p: string) => boolean; key: string }> = [
  { test: (p) => p.length >= 8, key: 'passwordTooShort' },
  { test: (p) => /[A-Z]/.test(p), key: 'passwordMissingUppercase' },
  { test: (p) => /[a-z]/.test(p), key: 'passwordMissingLowercase' },
  { test: (p) => /\d/.test(p), key: 'passwordMissingDigit' },
  { test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p), key: 'passwordMissingSpecial' },
];

/**
 * Validate password strength.
 * Returns the i18n error key suffix of the first failing rule, or null if valid.
 * The caller resolves the full key via their own i18n prefix
 * (e.g. `t(\`auth.register.errors.${errorKey}\`)`).
 */
export function validatePassword(password: string): PasswordValidationResult {
  for (const rule of rules) {
    if (!rule.test(password)) {
      return { valid: false, errorKey: rule.key };
    }
  }
  return { valid: true, errorKey: null };
}
