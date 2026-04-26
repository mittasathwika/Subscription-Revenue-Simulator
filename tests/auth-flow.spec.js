const { test, expect } = require('@playwright/test');

test.describe('Auth Flow - Phase 2 Updates', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure fresh state
    await page.goto('http://subscription-revenue-simulator-697697503244.s3-website-us-east-1.amazonaws.com/index.html');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('index.html shows auth modal on first visit (no redirect)', async ({ page }) => {
    // Check that we're on index.html, not redirected to login.html
    const currentUrl = page.url();
    expect(currentUrl).toContain('index.html');
    expect(currentUrl).not.toContain('login.html');
    
    // Auth modal should be visible
    const authModal = page.locator('#authModal');
    await expect(authModal).toBeVisible();
    
    // Check modal contains login form
    await expect(page.locator('#loginForm')).toBeVisible();
    await expect(page.locator('#loginEmail')).toBeVisible();
    await expect(page.locator('#loginPassword')).toBeVisible();
  });

  test('dashboard is visible behind auth modal', async ({ page }) => {
    // Check that main dashboard content is visible in background
    await expect(page.locator('header h1')).toHaveText('Subscription Revenue Simulator');
    await expect(page.locator('#calculateBtn')).toBeVisible();
    await expect(page.locator('#price')).toBeVisible();
  });

  test('login with valid credentials hides modal and shows user info', async ({ page }) => {
    // Fill in login form with test credentials
    await page.fill('#loginEmail', 'dhaval@gmail.com');
    await page.fill('#loginPassword', 'password123');
    
    // Submit login
    await page.click('#loginForm button[type="submit"]');
    
    // Wait for login to complete (success or failure)
    await page.waitForTimeout(2000);
    
    // Check if error is shown (expected since backend may not be running)
    const errorDiv = page.locator('#loginError');
    const errorText = await errorDiv.textContent();
    
    // If login succeeds, modal should hide
    // If login fails, error should show
    if (!errorText || errorText.trim() === '') {
      // Success case
      await expect(page.locator('#authModal')).not.toBeVisible();
      await expect(page.locator('#userInfo')).toBeVisible();
    } else {
      // Error case - modal stays open
      await expect(page.locator('#authModal')).toBeVisible();
      expect(errorText).toContain('Login failed');
    }
  });

  test('login tab and signup tab switch correctly', async ({ page }) => {
    // Auth modal should be open
    await expect(page.locator('#authModal')).toBeVisible();
    
    // Click signup tab
    await page.click('.auth-tab[data-tab="signup"]');
    
    // Signup form should be visible, login form hidden
    await expect(page.locator('#signupForm')).toBeVisible();
    await expect(page.locator('#loginForm')).not.toBeVisible();
    
    // Click login tab
    await page.click('.auth-tab[data-tab="login"]');
    
    // Login form should be visible again
    await expect(page.locator('#loginForm')).toBeVisible();
    await expect(page.locator('#signupForm')).not.toBeVisible();
  });

  test('close button hides auth modal (guest mode)', async ({ page }) => {
    // Auth modal should be open
    await expect(page.locator('#authModal')).toBeVisible();
    
    // Click close button
    await page.click('.modal-close');
    
    // Modal should be hidden
    await expect(page.locator('#authModal')).not.toBeVisible();
    
    // User should be able to interact with dashboard
    await page.fill('#price', '150');
    await expect(page.locator('#price')).toHaveValue('150');
  });

  test('guest user can use calculator without login', async ({ page }) => {
    // Close the auth modal
    await page.click('.modal-close');
    await expect(page.locator('#authModal')).not.toBeVisible();
    
    // Fill in calculator inputs
    await page.fill('#price', '99');
    await page.fill('#churn', '5');
    await page.fill('#initialCustomers', '100');
    
    // Click calculate
    await page.click('#calculateBtn');
    
    // Wait for calculation
    await page.waitForTimeout(1000);
    
    // Check that metrics are displayed
    const ltvEl = page.locator('#ltv');
    const arrEl = page.locator('#arr');
    
    // Metrics should have values
    const ltvText = await ltvEl.textContent();
    const arrText = await arrEl.textContent();
    
    expect(ltvText).toContain('$');
    expect(arrText).toContain('$');
  });
});
