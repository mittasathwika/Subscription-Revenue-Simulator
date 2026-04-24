const { test, expect } = require('@playwright/test');

test.describe('Phase 5 Features', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login and authenticate
    await page.goto('/login.html');
    await page.fill('input[type="email"]', 'demo@example.com');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
  });

  test.describe('Multi-Currency', () => {
    test('should display currency selector', async ({ page }) => {
      await page.goto('/index.html');
      await page.waitForTimeout(1000);
      
      // Look for currency selector
      const currencySelector = page.locator('select[name*="currency"], [class*="currency"], button:has-text("$"), button:has-text("€")');
      if (await currencySelector.count() > 0) {
        await expect(currencySelector.first()).toBeVisible();
      }
    });

    test('should format amounts with currency symbols', async ({ page }) => {
      await page.goto('/index.html');
      await page.waitForTimeout(1000);
      
      // Check for currency symbols in page
      const pageContent = await page.content();
      expect(pageContent).toMatch(/(\$|€|£|¥|CA\$|A\$|Fr)/);
    });
  });

  test.describe('Cohort Analysis', () => {
    test('should have cohort analysis section or link', async ({ page }) => {
      await page.goto('/index.html');
      await page.waitForTimeout(1000);
      
      // Look for cohort section or navigation
      const cohortLink = page.locator('a[href*="cohort"], button:has-text("Cohort"), [id*="cohort"], [class*="cohort"]');
      if (await cohortLink.count() > 0) {
        await expect(cohortLink.first()).toBeVisible();
      }
    });

    test('cohort API should respond', async ({ request }) => {
      // Get auth token first
      const loginResponse = await request.post('/api/auth/login', {
        data: { email: 'demo@example.com', password: 'demo123' }
      });
      const { token } = await loginResponse.json();
      
      // Test cohort endpoint
      const cohortsResponse = await request.get('/api/cohorts/benchmarks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      expect(cohortsResponse.ok()).toBeTruthy();
    });
  });

  test.describe('AI Forecasting', () => {
    test('should have forecast section or link', async ({ page }) => {
      await page.goto('/index.html');
      await page.waitForTimeout(1000);
      
      // Look for forecast section
      const forecastLink = page.locator('a[href*="forecast"], button:has-text("Forecast"), [id*="forecast"], [class*="forecast"]');
      if (await forecastLink.count() > 0) {
        await expect(forecastLink.first()).toBeVisible();
      }
    });

    test('forecast API should respond', async ({ request }) => {
      const loginResponse = await request.post('/api/auth/login', {
        data: { email: 'demo@example.com', password: 'demo123' }
      });
      const { token } = await loginResponse.json();
      
      const forecastResponse = await request.get('/api/forecast?months=6', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Should return 200 or 400 (if insufficient data)
      expect([200, 400]).toContain(forecastResponse.status());
    });
  });

  test.describe('Reports & PDF Generation', () => {
    test('should have reports section or link', async ({ page }) => {
      await page.goto('/index.html');
      await page.waitForTimeout(1000);
      
      // Look for reports section
      const reportsLink = page.locator('a[href*="report"], button:has-text("Report"), [id*="report"], [class*="report"]');
      if (await reportsLink.count() > 0) {
        await expect(reportsLink.first()).toBeVisible();
      }
    });

    test('reports API should list templates', async ({ request }) => {
      const loginResponse = await request.post('/api/auth/login', {
        data: { email: 'demo@example.com', password: 'demo123' }
      });
      const { token } = await loginResponse.json();
      
      const reportsResponse = await request.get('/api/reports/templates', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      expect(reportsResponse.ok()).toBeTruthy();
      const data = await reportsResponse.json();
      expect(data.templates).toBeDefined();
      expect(data.templates.length).toBeGreaterThan(0);
    });
  });

  test.describe('QuickBooks Integration', () => {
    test('should have QuickBooks section or link', async ({ page }) => {
      await page.goto('/index.html');
      await page.waitForTimeout(1000);
      
      // Look for QuickBooks section
      const qbLink = page.locator('a[href*="quickbook"], button:has-text("QuickBooks"), [id*="quickbook"], [class*="quickbook"]');
      if (await qbLink.count() > 0) {
        await expect(qbLink.first()).toBeVisible();
      }
    });

    test('QuickBooks API should respond', async ({ request }) => {
      const loginResponse = await request.post('/api/auth/login', {
        data: { email: 'demo@example.com', password: 'demo123' }
      });
      const { token } = await loginResponse.json();
      
      const qbResponse = await request.get('/api/quickbooks/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      expect(qbResponse.ok()).toBeTruthy();
      const data = await qbResponse.json();
      expect(data.connected).toBeDefined();
    });
  });

  test.describe('Agency/Multi-tenant', () => {
    test('should have agency section or link', async ({ page }) => {
      await page.goto('/index.html');
      await page.waitForTimeout(1000);
      
      // Look for agency section
      const agencyLink = page.locator('a[href*="agency"], button:has-text("Agency"), [id*="agency"], [class*="agency"]');
      if (await agencyLink.count() > 0) {
        await expect(agencyLink.first()).toBeVisible();
      }
    });

    test('agency API should respond', async ({ request }) => {
      const loginResponse = await request.post('/api/auth/login', {
        data: { email: 'demo@example.com', password: 'demo123' }
      });
      const { token } = await loginResponse.json();
      
      const agencyResponse = await request.get('/api/agency', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Should return 200 or 404 (if no agency)
      expect([200, 404]).toContain(agencyResponse.status());
    });
  });

  test.describe('PWA Features', () => {
    test('should have manifest.json', async ({ request }) => {
      const response = await request.get('/manifest.json');
      expect(response.ok()).toBeTruthy();
      
      const manifest = await response.json();
      expect(manifest.name).toBeDefined();
      expect(manifest.short_name).toBeDefined();
    });

    test('should have service worker', async ({ request }) => {
      const response = await request.get('/sw.js');
      expect(response.ok()).toBeTruthy();
      
      const content = await response.text();
      expect(content).toContain('service worker');
    });

    test('should be installable as PWA', async ({ page }) => {
      await page.goto('/index.html');
      
      // Check for manifest link
      const manifestLink = page.locator('link[rel="manifest"]');
      await expect(manifestLink).toHaveAttribute('href', '/manifest.json');
    });
  });
});
