import { test, expect } from '@playwright/test';

/**
 * Dashboard tests require authentication.
 * These tests use a test user that should exist in the test database.
 */

test.describe('Dashboard (Authenticated)', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');

    // Use test credentials (should exist in test DB)
    await page.getByLabel(/email/i).fill(process.env.E2E_TEST_EMAIL || 'test@example.com');
    await page.getByLabel(/mot de passe|password/i).fill(process.env.E2E_TEST_PASSWORD || 'Test123!@#');
    await page.getByRole('button', { name: /connexion|sign in/i }).click();

    // Wait for redirect to dashboard
    await page.waitForURL(/dashboard/, { timeout: 15000 });
  });

  test.describe('Dashboard Overview', () => {
    test('should display dashboard after login', async ({ page }) => {
      await expect(page).toHaveURL(/dashboard/);
      await expect(page.getByRole('heading', { name: /dashboard|tableau de bord/i })).toBeVisible();
    });

    test('should display user stats', async ({ page }) => {
      // Look for common dashboard elements
      await expect(page.getByText(/cours|courses/i)).toBeVisible();
      await expect(page.getByText(/progress|progression/i)).toBeVisible();
    });

    test('should have working sidebar navigation', async ({ page }) => {
      // Check sidebar links
      await expect(page.getByRole('link', { name: /courses|cours/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /profile|profil/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /settings|paramètres/i })).toBeVisible();
    });
  });

  test.describe('Course Navigation', () => {
    test('should navigate to courses page', async ({ page }) => {
      await page.getByRole('link', { name: /courses|mes cours/i }).click();

      await expect(page).toHaveURL(/courses/);
    });

    test('should display course catalog', async ({ page }) => {
      await page.goto('/courses');

      // Should have course cards or empty state
      const hasCourses = await page.getByTestId('course-card').count() > 0;
      const hasEmptyState = await page.getByText(/no courses|aucun cours/i).isVisible().catch(() => false);

      expect(hasCourses || hasEmptyState).toBeTruthy();
    });
  });

  test.describe('User Profile', () => {
    test('should navigate to profile page', async ({ page }) => {
      await page.getByRole('link', { name: /profile|profil/i }).click();

      await expect(page).toHaveURL(/profile/);
    });

    test('should display user information', async ({ page }) => {
      await page.goto('/profile');

      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/prénom|first name/i)).toBeVisible();
    });
  });

  test.describe('Logout', () => {
    test('should logout successfully', async ({ page }) => {
      // Find logout button (might be in user menu)
      const userMenu = page.getByRole('button', { name: /user|profil|account/i });
      if (await userMenu.isVisible()) {
        await userMenu.click();
      }

      await page.getByRole('button', { name: /logout|déconnexion/i }).click();

      // Should redirect to login or home
      await expect(page).toHaveURL(/login|\/$/);
    });
  });
});

test.describe('Protected Routes', () => {
  test('should redirect to login when accessing dashboard without auth', async ({ page }) => {
    // Clear any existing session
    await page.context().clearCookies();

    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });

  test('should redirect to login when accessing courses without auth', async ({ page }) => {
    await page.context().clearCookies();

    await page.goto('/courses');

    await expect(page).toHaveURL(/login/);
  });
});
