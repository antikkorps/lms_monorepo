import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.describe('Login Page', () => {
    test('should display login form', async ({ page }) => {
      await page.goto('/login');

      // Check page title and form elements
      await expect(page.getByRole('heading', { name: /connexion|sign in/i })).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/mot de passe|password/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /connexion|sign in/i })).toBeVisible();
    });

    test('should show validation errors for empty form', async ({ page }) => {
      await page.goto('/login');

      // Submit empty form
      await page.getByRole('button', { name: /connexion|sign in/i }).click();

      // Check for validation messages
      await expect(page.getByText(/email.*requis|email.*required/i)).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');

      await page.getByLabel(/email/i).fill('invalid@example.com');
      await page.getByLabel(/mot de passe|password/i).fill('wrongpassword');
      await page.getByRole('button', { name: /connexion|sign in/i }).click();

      // Wait for error message
      await expect(page.getByText(/invalide|invalid|incorrect/i)).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to register page', async ({ page }) => {
      await page.goto('/login');

      await page.getByRole('link', { name: /créer.*compte|sign up|register/i }).click();

      await expect(page).toHaveURL(/register/);
    });

    test('should navigate to forgot password', async ({ page }) => {
      await page.goto('/login');

      await page.getByRole('link', { name: /mot de passe oublié|forgot password/i }).click();

      await expect(page).toHaveURL(/forgot-password/);
    });
  });

  test.describe('Register Page', () => {
    test('should display registration form', async ({ page }) => {
      await page.goto('/register');

      await expect(page.getByRole('heading', { name: /inscription|sign up|create.*account/i })).toBeVisible();
      await expect(page.getByLabel(/prénom|first name/i)).toBeVisible();
      await expect(page.getByLabel(/nom|last name/i)).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/mot de passe|password/i)).toBeVisible();
    });

    test('should show validation errors for invalid email', async ({ page }) => {
      await page.goto('/register');

      await page.getByLabel(/email/i).fill('invalid-email');
      await page.getByLabel(/email/i).blur();

      await expect(page.getByText(/email.*valide|valid.*email/i)).toBeVisible();
    });

    test('should show password strength requirements', async ({ page }) => {
      await page.goto('/register');

      await page.getByLabel(/mot de passe|password/i).first().fill('weak');

      // Check for password strength indicator or requirements
      await expect(page.getByText(/caractères|characters|fort|strong|faible|weak/i)).toBeVisible();
    });
  });

  test.describe('Forgot Password', () => {
    test('should display forgot password form', async ({ page }) => {
      await page.goto('/forgot-password');

      await expect(page.getByRole('heading', { name: /mot de passe oublié|forgot password|reset/i })).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /envoyer|send|reset/i })).toBeVisible();
    });

    test('should show success message after submitting email', async ({ page }) => {
      await page.goto('/forgot-password');

      await page.getByLabel(/email/i).fill('test@example.com');
      await page.getByRole('button', { name: /envoyer|send|reset/i }).click();

      // Should show success message (API may return success even for non-existent emails for security)
      await expect(page.getByText(/envoyé|sent|vérifiez|check.*email/i)).toBeVisible({ timeout: 10000 });
    });
  });
});
