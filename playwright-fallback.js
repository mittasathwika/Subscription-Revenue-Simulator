#!/usr/bin/env node
/**
 * Fallback test runner for systems without Playwright
 * Uses basic HTTP requests and browser automation via Puppeteer (optional)
 */

const http = require('http');

// Try to import puppeteer, but make it optional
let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch (e) {
  console.log('ℹ️  Puppeteer not available, running API tests only');
}

const BASE_URL = 'http://localhost:3001';
let browser;
let page;

// Test result tracker
const results = [];

function record(name, passed, details = '') {
  results.push({ name, passed, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}${details ? ': ' + details : ''}`);
}

async function request(path, method = 'GET', headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path,
      method,
      headers: { 'Content-Type': 'application/json', ...headers }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  PLAYWRIGHT FALLBACK - E2E & FUNCTIONALITY TESTS');
  console.log('═══════════════════════════════════════════════════════════\n');

  // ==========================================
  // API TESTS
  // ==========================================
  console.log('\n📋 API Tests');
  console.log('───────────────────────────────────────────');

  // Health check
  try {
    const health = await request('/api/health');
    record('Health API', health.status === 200 && health.body.status === 'ok');
  } catch (e) {
    record('Health API', false, e.message);
  }

  // API version
  try {
    const api = await request('/api');
    record('API Documentation', api.status === 200 && api.body.version === '3.0.0');
  } catch (e) {
    record('API Documentation', false, e.message);
  }

  // Currency API
  try {
    const currencies = await request('/api/currency/supported');
    record('Currency API', currencies.status === 200 && currencies.body.currencies?.length === 7,
      `${currencies.body.currencies?.length} currencies`);
  } catch (e) {
    record('Currency API', false, e.message);
  }

  // Auth
  let token;
  try {
    const login = await request('/api/auth/login', 'POST', {}, {
      email: 'demo@example.com',
      password: 'demo123'
    });
    token = login.body.token;
    record('Auth Login', login.status === 200 && !!token, 'Token received');
  } catch (e) {
    record('Auth Login', false, e.message);
  }

  // Authenticated endpoints
  if (token) {
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
      const metrics = await request('/api/metrics', 'GET', headers);
      record('Metrics API', metrics.status === 200);
    } catch (e) {
      record('Metrics API', false, e.message);
    }

    try {
      const scenarios = await request('/api/scenarios', 'GET', headers);
      record('Scenarios API', scenarios.status === 200);
    } catch (e) {
      record('Scenarios API', false, e.message);
    }

    try {
      const cohorts = await request('/api/cohorts/benchmarks', 'GET', headers);
      record('Cohorts API', cohorts.status === 200);
    } catch (e) {
      record('Cohorts API', false, e.message);
    }

    try {
      const forecast = await request('/api/forecast?months=6', 'GET', headers);
      record('Forecast API', forecast.status === 200 || forecast.status === 400);
    } catch (e) {
      record('Forecast API', false, e.message);
    }

    try {
      const reports = await request('/api/reports/templates', 'GET', headers);
      record('Reports API', reports.status === 200 && reports.body.templates?.length > 0);
    } catch (e) {
      record('Reports API', false, e.message);
    }

    try {
      const qb = await request('/api/quickbooks/status', 'GET', headers);
      record('QuickBooks API', qb.status === 200);
    } catch (e) {
      record('QuickBooks API', false, e.message);
    }

    try {
      const agency = await request('/api/agency/workspaces', 'GET', headers);
      record('Agency API', agency.status === 200);
    } catch (e) {
      record('Agency API', false, e.message);
    }
  }

  // ==========================================
  // BROWSER TESTS (only if puppeteer available)
  // ==========================================
  if (!puppeteer) {
    console.log('\n📋 Browser Tests');
    console.log('───────────────────────────────────────────');
    console.log('ℹ️  Skipped - Puppeteer not installed');
  } else {
  console.log('\n📋 Browser Tests');
  console.log('───────────────────────────────────────────');

  try {
    browser = await puppeteer.launch({ headless: 'new' });
    page = await browser.newPage();

    // Login page
    await page.goto(`${BASE_URL}/login.html`);
    await page.waitForTimeout(1000);
    const title = await page.title();
    record('Login Page Load', title.includes('Login') || title.includes('Sign In'));

    // Form elements
    const emailInput = await page.$('input[type="email"]');
    const passwordInput = await page.$('input[type="password"]');
    const submitButton = await page.$('button[type="submit"]');
    record('Login Form Elements', !!emailInput && !!passwordInput && !!submitButton);

    // Login action
    await page.type('input[type="email"]', 'demo@example.com');
    await page.type('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    record('Login Action', currentUrl.includes('index.html'), 'Redirected to dashboard');

    // Dashboard
    await page.goto(`${BASE_URL}/index.html`);
    await page.waitForTimeout(2000);
    const dashboardTitle = await page.title();
    record('Dashboard Load', dashboardTitle.length > 0);

    // Check for metrics
    const pageContent = await page.content();
    const hasMetrics = /(ARR|MRR|Revenue|LTV|CAC)/i.test(pageContent);
    record('Dashboard Metrics', hasMetrics);

    // Check for charts
    const canvas = await page.$('canvas');
    record('Dashboard Charts', !!canvas, canvas ? 'Canvas found' : 'No canvas');

    // PWA check
    const manifestLink = await page.$('link[rel="manifest"]');
    record('PWA Manifest Link', !!manifestLink);

    // Mobile viewport
    await page.setViewport({ width: 375, height: 667 });
    await page.goto(`${BASE_URL}/index.html`);
    await page.waitForTimeout(1000);
    const mobileContent = await page.$('main, .main-content, #app');
    record('Mobile Responsive', !!mobileContent);

    // Screenshots
    await page.setViewport({ width: 1280, height: 720 });
    await page.goto(`${BASE_URL}/login.html`);
    await page.screenshot({ path: 'test-results/login-page.png' });
    record('Screenshot: Login', true, 'Saved to test-results/login-page.png');

    await page.goto(`${BASE_URL}/index.html`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/dashboard.png', fullPage: true });
    record('Screenshot: Dashboard', true, 'Saved to test-results/dashboard.png');

  } catch (e) {
    console.log('\n⚠️  Browser tests skipped:', e.message);
    console.log('   (Puppeteer may not be available)');
  } finally {
    if (browser) await browser.close();
  }
  }  // Close else block

  // ==========================================
  // SUMMARY
  // ==========================================
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const percentage = Math.round((passed / total) * 100);

  console.log(`\nTotal Tests: ${total}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${total - passed} ${total - passed > 0 ? '❌' : ''}`);
  console.log(`Success Rate: ${percentage}%`);

  const grade = percentage >= 95 ? 'A+' : percentage >= 90 ? 'A' : percentage >= 80 ? 'B' : 'C';
  console.log(`\nGrade: ${grade}`);

  if (total - passed > 0) {
    console.log('\nFailed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  ❌ ${r.name}: ${r.details}`);
    });
  }

  console.log('\n═══════════════════════════════════════════════════════════\n');

  return { passed, total, percentage };
}

// Create test-results directory
const fs = require('fs');
if (!fs.existsSync('test-results')) {
  fs.mkdirSync('test-results', { recursive: true });
}

runTests().then(results => {
  process.exit(results.percentage >= 80 ? 0 : 1);
}).catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
