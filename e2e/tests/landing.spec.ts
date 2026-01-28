import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    // Landing is on port 4321 by default with Astro
    await page.goto('http://localhost:4321');
  });

  test.describe('Homepage', () => {
    test('should display hero section', async ({ page }) => {
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByRole('link', { name: /get started|commencer/i })).toBeVisible();
    });

    test('should have working navigation', async ({ page }) => {
      // Check nav links exist
      await expect(page.getByRole('link', { name: /features|fonctionnalités/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /pricing|tarifs/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /about|à propos/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /contact/i })).toBeVisible();
    });

    test('should navigate to pricing page', async ({ page }) => {
      await page.getByRole('link', { name: /pricing|tarifs/i }).first().click();
      await expect(page).toHaveURL(/pricing/);
      await expect(page.getByRole('heading', { name: /pricing|tarifs/i })).toBeVisible();
    });

    test('should navigate to features page', async ({ page }) => {
      await page.getByRole('link', { name: /features|fonctionnalités/i }).first().click();
      await expect(page).toHaveURL(/features/);
    });
  });

  test.describe('Language Switching', () => {
    test('should switch to French', async ({ page }) => {
      // Find and click language switcher
      await page.getByRole('link', { name: /fr/i }).click();

      await expect(page).toHaveURL(/\/fr/);
      // Check French content is displayed
      await expect(page.getByText(/commencer|plateforme/i)).toBeVisible();
    });

    test('should switch back to English', async ({ page }) => {
      await page.goto('http://localhost:4321/fr');

      await page.getByRole('link', { name: /en/i }).click();

      await expect(page).not.toHaveURL(/\/fr/);
    });
  });

  test.describe('Dark Mode', () => {
    test('should toggle dark mode', async ({ page }) => {
      // Find dark mode toggle button
      const themeToggle = page.getByRole('button', { name: /dark mode|theme/i });

      // Get initial state
      const htmlElement = page.locator('html');
      const initiallyDark = await htmlElement.evaluate((el) => el.classList.contains('dark'));

      // Click toggle
      await themeToggle.click();

      // Check class changed
      const nowDark = await htmlElement.evaluate((el) => el.classList.contains('dark'));
      expect(nowDark).toBe(!initiallyDark);
    });
  });

  test.describe('Mobile Menu', () => {
    test('should open and close mobile menu', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Mobile menu button should be visible
      const menuButton = page.getByRole('button', { name: /menu|open/i });
      await expect(menuButton).toBeVisible();

      // Click to open
      await menuButton.click();

      // Navigation links should now be visible
      await expect(page.getByRole('link', { name: /features|fonctionnalités/i })).toBeVisible();

      // Click to close (or click a link)
      await menuButton.click();
    });
  });

  test.describe('Pricing Page', () => {
    test('should display pricing plans', async ({ page }) => {
      await page.goto('http://localhost:4321/pricing');

      // Should have multiple pricing cards
      const pricingCards = page.locator('[class*="card"], [class*="pricing"]');
      await expect(pricingCards).toHaveCount(3); // Free, Pro, Team

      // Check plan names are visible
      await expect(page.getByText(/free|gratuit/i)).toBeVisible();
      await expect(page.getByText(/pro/i)).toBeVisible();
      await expect(page.getByText(/team|équipe/i)).toBeVisible();
    });

    test('should have working CTA buttons', async ({ page }) => {
      await page.goto('http://localhost:4321/pricing');

      // Get started button should link to register
      const ctaButton = page.getByRole('link', { name: /get started|commencer/i }).first();
      await expect(ctaButton).toHaveAttribute('href', /register/);
    });
  });

  test.describe('Contact Page', () => {
    test('should display contact form', async ({ page }) => {
      await page.goto('http://localhost:4321/contact');

      await expect(page.getByLabel(/name|nom/i)).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/message/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /send|envoyer/i })).toBeVisible();
    });
  });
});
