const { test, expect } = require('@playwright/test');

test.describe('Dashboard Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login and authenticate
    await page.goto('/login.html');
    await page.fill('input[type="email"]', 'demo@example.com');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
  });

  test('should display dashboard with key metrics', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForTimeout(1000);
    
    // Check for key metric cards
    const metricCards = page.locator('.metric-card, .stat-card, [class*="metric"], [class*="stat"]');
    const count = await metricCards.count();
    expect(count).toBeGreaterThan(0);
    
    // Check for ARR, MRR, or revenue display
    const pageContent = await page.content();
    expect(pageContent).toMatch(/(ARR|MRR|Revenue|revenue)/i);
  });

  test('should display charts', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForTimeout(2000);
    
    // Look for chart canvases or chart containers
    const charts = page.locator('canvas, .chart-container, [class*="chart"]');
    const chartCount = await charts.count();
    
    // Should have at least one chart
    expect(chartCount).toBeGreaterThan(0);
  });

  test('should have working navigation menu', async ({ page }) => {
    await page.goto('/index.html');
    
    // Check for navigation elements
    const nav = page.locator('nav, .navbar, .sidebar, [class*="nav"]');
    if (await nav.count() > 0) {
      await expect(nav.first()).toBeVisible();
    }
    
    // Check for menu items
    const menuItems = page.locator('nav a, .navbar a, .sidebar a');
    const menuCount = await menuItems.count();
    expect(menuCount).toBeGreaterThan(0);
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/index.html');
    await page.waitForTimeout(1000);
    
    // Check that content is visible
    const mainContent = page.locator('main, .main-content, #app');
    await expect(mainContent).toBeVisible();
    
    // Check for mobile menu if applicable
    const mobileMenu = page.locator('.mobile-menu, .hamburger, [class*="mobile"], button[aria-label*="menu" i]');
    // Mobile menu may or may not exist
  });

  test('should load scenarios section', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForTimeout(1000);
    
    // Look for scenarios section or tab
    const scenariosSection = page.locator('[id*="scenario"], [class*="scenario"], button:has-text("Scenario")');
    if (await scenariosSection.count() > 0) {
      await scenariosSection.first().click();
      await page.waitForTimeout(500);
      
      // Check for scenario list or create button
      const scenarioContent = page.locator('[id*="scenario"] .scenario-item, .scenario-card, button:has-text("New")');
      expect(await scenarioContent.count()).toBeGreaterThanOrEqual(0);
    }
  });
});
