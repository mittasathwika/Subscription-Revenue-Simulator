const { test, expect } = require('@playwright/test');

test.describe('API Endpoints', () => {
  test.describe('Public API', () => {
    test('health endpoint returns ok', async ({ request }) => {
      const response = await request.get('/api/health');
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.status).toBe('ok');
    });

    test('api root returns version info', async ({ request }) => {
      const response = await request.get('/api');
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.version).toBe('3.0.0');
      expect(data.phase).toContain('5');
    });

    test('security endpoint returns secure', async ({ request }) => {
      const response = await request.get('/api/security');
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.status).toBe('secure');
    });
  });

  test.describe('Currency API', () => {
    test('GET /api/currency/supported returns 7 currencies', async ({ request }) => {
      const response = await request.get('/api/currency/supported');
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.currencies).toHaveLength(7);
      
      const codes = data.currencies.map(c => c.code);
      expect(codes).toContain('USD');
      expect(codes).toContain('EUR');
      expect(codes).toContain('GBP');
    });

    test('GET /api/currency/rates returns exchange rates', async ({ request }) => {
      const response = await request.get('/api/currency/rates');
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.base).toBe('USD');
      expect(data.rates).toBeDefined();
    });

    test('POST /api/currency/convert converts currency', async ({ request }) => {
      const response = await request.post('/api/currency/convert', {
        data: { amount: 100, from: 'USD', to: 'EUR' }
      });
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.original.amount).toBe(100);
      expect(data.converted.currency).toBe('EUR');
    });
  });

  test.describe('Authenticated API', () => {
    let authToken;

    test.beforeAll(async ({ request }) => {
      const loginResponse = await request.post('/api/auth/login', {
        data: { email: 'demo@example.com', password: 'demo123' }
      });
      
      expect(loginResponse.ok()).toBeTruthy();
      const data = await loginResponse.json();
      authToken = data.token;
      expect(authToken).toBeTruthy();
    });

    test('GET /api/metrics returns user metrics', async ({ request }) => {
      const response = await request.get('/api/metrics', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    test('GET /api/scenarios returns scenarios', async ({ request }) => {
      const response = await request.get('/api/scenarios', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    test('GET /api/cohorts/benchmarks returns benchmarks', async ({ request }) => {
      const response = await request.get('/api/cohorts/benchmarks', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.benchmarks).toBeDefined();
    });

    test('GET /api/forecast returns forecast data', async ({ request }) => {
      const response = await request.get('/api/forecast?months=6', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      // May return 200 with data or 400 if insufficient data
      expect([200, 400]).toContain(response.status());
    });

    test('GET /api/reports/templates returns templates', async ({ request }) => {
      const response = await request.get('/api/reports/templates', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.templates).toBeInstanceOf(Array);
      expect(data.templates.length).toBeGreaterThan(0);
    });

    test('GET /api/quickbooks/status returns status', async ({ request }) => {
      const response = await request.get('/api/quickbooks/status', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.connected).toBeDefined();
    });

    test('GET /api/quickbooks/connect returns auth URL', async ({ request }) => {
      const response = await request.get('/api/quickbooks/connect', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.authUrl).toBeTruthy();
    });

    test('GET /api/agency/workspaces returns workspaces', async ({ request }) => {
      const response = await request.get('/api/agency/workspaces', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.workspaces).toBeInstanceOf(Array);
    });
  });

  test.describe('PWA Assets', () => {
    test('manifest.json is valid', async ({ request }) => {
      const response = await request.get('/manifest.json');
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.name).toBeTruthy();
      expect(data.short_name).toBeTruthy();
      expect(data.start_url).toBeTruthy();
      expect(data.icons).toBeInstanceOf(Array);
    });

    test('service worker is accessible', async ({ request }) => {
      const response = await request.get('/sw.js');
      expect(response.ok()).toBeTruthy();
      
      const content = await response.text();
      expect(content.length).toBeGreaterThan(0);
    });
  });
});
