const { test, expect } = require('@playwright/test');

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login.html');
  });

  test('should display login page', async ({ page }) => {
    await expect(page).toHaveTitle(/Login|Sign In/i);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should login with demo credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'demo@example.com');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');
    
    // Wait for navigation or success indicator
    await page.waitForTimeout(2000);
    
    // Should redirect to main page or show logged in state
    const currentUrl = page.url();
    expect(currentUrl).toContain('index.html');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Wait for error message
    await page.waitForTimeout(1000);
    
    // Check for error message
    const errorVisible = await page.locator('.error, .alert-error, [role="alert"]').isVisible().catch(() => false);
    expect(errorVisible).toBeTruthy();
  });

  test('should have working navigation links', async ({ page }) => {
    // Check if signup link exists
    const signupLink = page.locator('a[href*="signup"], a:has-text("Sign up")');
    if (await signupLink.count() > 0) {
      await expect(signupLink).toBeVisible();
    }
    
    // Check forgot password link
    const forgotLink = page.locator('a[href*="forgot"], a:has-text("Forgot")');
    if (await forgotLink.count() > 0) {
      await expect(forgotLink).toBeVisible();
    }
  });
});
