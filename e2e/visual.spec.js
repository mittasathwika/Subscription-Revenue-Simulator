const { test, expect } = require('@playwright/test');

test.describe('Visual Regression Tests', () => {
  test('login page visual check', async ({ page }) => {
    await page.goto('/login.html');
    await page.waitForTimeout(1000);
    
    // Take screenshot for visual comparison
    await expect(page).toHaveScreenshot('login-page.png', {
      fullPage: true,
      threshold: 0.2
    });
  });

  test('dashboard visual check', async ({ page }) => {
    // Login first
    await page.goto('/login.html');
    await page.fill('input[type="email"]', 'demo@example.com');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    await page.goto('/index.html');
    await page.waitForTimeout(2000);
    
    // Take screenshot
    await expect(page).toHaveScreenshot('dashboard.png', {
      fullPage: true,
      threshold: 0.2
    });
  });

  test('mobile responsive check', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/login.html');
    await page.waitForTimeout(1000);
    
    // Take mobile screenshot
    await expect(page).toHaveScreenshot('login-mobile.png', {
      fullPage: true,
      threshold: 0.2
    });
  });

  test('dark mode if available', async ({ page }) => {
    // Check if dark mode toggle exists
    await page.goto('/index.html');
    await page.waitForTimeout(1000);
    
    const darkModeToggle = page.locator('[class*="dark"], button[aria-label*="dark" i], input[type="checkbox"][name*="dark" i]');
    
    if (await darkModeToggle.count() > 0) {
      await darkModeToggle.click();
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('dashboard-dark.png', {
        fullPage: true,
        threshold: 0.2
      });
    }
  });
});
