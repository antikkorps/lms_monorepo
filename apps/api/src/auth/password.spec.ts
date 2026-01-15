import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, validatePasswordStrength } from './password.js';

describe('Password Service', () => {
  // ===========================================================================
  // hashPassword & verifyPassword
  // ===========================================================================

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'SecurePass123!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2')).toBe(true); // bcrypt hash prefix
    });

    it('should generate different hashes for same password', async () => {
      const password = 'SecurePass123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2); // Different salts
    });
  });

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      const password = 'SecurePass123!';
      const hash = await hashPassword(password);

      const result = await verifyPassword(password, hash);

      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'SecurePass123!';
      const hash = await hashPassword(password);

      const result = await verifyPassword('WrongPassword!', hash);

      expect(result).toBe(false);
    });

    it('should return false for empty password', async () => {
      const hash = await hashPassword('SecurePass123!');

      const result = await verifyPassword('', hash);

      expect(result).toBe(false);
    });
  });

  // ===========================================================================
  // validatePasswordStrength
  // ===========================================================================

  describe('validatePasswordStrength', () => {
    it('should accept strong password', () => {
      const result = validatePasswordStrength('SecurePass123!');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password shorter than 8 characters', () => {
      const result = validatePasswordStrength('Ab1!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject password without uppercase letter', () => {
      const result = validatePasswordStrength('securepass123!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase letter', () => {
      const result = validatePasswordStrength('SECUREPASS123!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without digit', () => {
      const result = validatePasswordStrength('SecurePass!!!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one digit');
    });

    it('should reject password without special character', () => {
      const result = validatePasswordStrength('SecurePass123');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should return multiple errors for very weak password', () => {
      const result = validatePasswordStrength('abc');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('should accept various special characters', () => {
      const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', ',', '.', '?', '"', ':', '{', '}', '|', '<', '>'];

      for (const char of specialChars) {
        const password = `SecureP1${char}`;
        const result = validatePasswordStrength(password);
        expect(result.valid).toBe(true);
      }
    });
  });
});
