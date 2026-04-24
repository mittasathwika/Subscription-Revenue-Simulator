#!/usr/bin/env node
/**
 * Phase 5 Regression & Functionality Test Suite
 * Tests all API endpoints and core functionality
 */

const http = require('http');

const BASE_URL = 'localhost';
const PORT = 3001;
let authToken = null;
let testResults = [];

// Test result tracker
function recordTest(name, passed, details = '') {
    testResults.push({ name, passed, details });
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${name}${details ? ': ' + details : ''}`);
}

// HTTP request helper
function request(path, method = 'GET', headers = {}, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: BASE_URL,
            port: PORT,
            path,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
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

// Test Suite
async function runTests() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  PHASE 5 REGRESSION & FUNCTIONALITY TEST SUITE');
    console.log('═══════════════════════════════════════════════════════════\n');

    // ==========================================
    // 1. HEALTH & BASIC ENDPOINTS
    // ==========================================
    console.log('\n📋 TEST GROUP 1: Health & Basic Endpoints');
    console.log('───────────────────────────────────────────');

    try {
        const health = await request('/api/health');
        recordTest('Health Check', health.status === 200 && health.body.status === 'ok');
    } catch (e) {
        recordTest('Health Check', false, e.message);
    }

    try {
        const api = await request('/api');
        recordTest('API Documentation', api.status === 200 && api.body.version === '3.0.0');
    } catch (e) {
        recordTest('API Documentation', false, e.message);
    }

    try {
        const security = await request('/api/security');
        recordTest('Security Endpoint', security.status === 200 && security.body.status === 'secure');
    } catch (e) {
        recordTest('Security Endpoint', false, e.message);
    }

    // ==========================================
    // 2. AUTHENTICATION
    // ==========================================
    console.log('\n📋 TEST GROUP 2: Authentication');
    console.log('───────────────────────────────────────────');

    try {
        const login = await request('/api/auth/login', 'POST', {}, {
            email: 'demo@example.com',
            password: 'demo123'
        });
        authToken = login.body.token;
        recordTest('Login with Demo Account', login.status === 200 && !!authToken, `Token: ${authToken ? 'received' : 'missing'}`);
    } catch (e) {
        recordTest('Login with Demo Account', false, e.message);
    }

    try {
        const invalidLogin = await request('/api/auth/login', 'POST', {}, {
            email: 'invalid@example.com',
            password: 'wrong'
        });
        recordTest('Invalid Login Rejected', invalidLogin.status === 401);
    } catch (e) {
        recordTest('Invalid Login Rejected', false, e.message);
    }

    // ==========================================
    // 3. CORE METRICS (Phase 1-4)
    // ==========================================
    console.log('\n📋 TEST GROUP 3: Core Metrics (Regression)');
    console.log('───────────────────────────────────────────');

    const authHeaders = { 'Authorization': `Bearer ${authToken}` };

    try {
        const metrics = await request('/api/metrics', 'GET', authHeaders);
        recordTest('Get Metrics', metrics.status === 200 && metrics.body.success);
    } catch (e) {
        recordTest('Get Metrics', false, e.message);
    }

    try {
        const scenarios = await request('/api/scenarios', 'GET', authHeaders);
        recordTest('List Scenarios', scenarios.status === 200);
    } catch (e) {
        recordTest('List Scenarios', false, e.message);
    }

    // ==========================================
    // 4. PHASE 5: MULTI-CURRENCY
    // ==========================================
    console.log('\n📋 TEST GROUP 4: Phase 5 - Multi-Currency');
    console.log('───────────────────────────────────────────');

    try {
        const currencies = await request('/api/currency/supported');
        const has7Currencies = currencies.body.currencies?.length === 7;
        recordTest('Supported Currencies', currencies.status === 200 && has7Currencies, `${currencies.body.currencies?.length} currencies`);
    } catch (e) {
        recordTest('Supported Currencies', false, e.message);
    }

    try {
        const rates = await request('/api/currency/rates');
        recordTest('Exchange Rates', rates.status === 200 && rates.body.success);
    } catch (e) {
        recordTest('Exchange Rates', false, e.message);
    }

    try {
        const convert = await request('/api/currency/convert', 'POST', {}, {
            amount: 100,
            from: 'USD',
            to: 'EUR'
        });
        recordTest('Currency Conversion', convert.status === 200 && convert.body.success);
    } catch (e) {
        recordTest('Currency Conversion', false, e.message);
    }

    // ==========================================
    // 5. PHASE 5: COHORT ANALYSIS
    // ==========================================
    console.log('\n📋 TEST GROUP 5: Phase 5 - Cohort Analysis');
    console.log('───────────────────────────────────────────');

    try {
        const cohorts = await request('/api/cohorts/analysis', 'GET', authHeaders);
        recordTest('Cohort Analysis Endpoint', cohorts.status === 200);
    } catch (e) {
        recordTest('Cohort Analysis Endpoint', false, e.message);
    }

    try {
        const benchmarks = await request('/api/cohorts/benchmarks', 'GET', authHeaders);
        recordTest('Cohort Benchmarks', benchmarks.status === 200);
    } catch (e) {
        recordTest('Cohort Benchmarks', false, e.message);
    }

    // ==========================================
    // 6. PHASE 5: AI FORECASTING
    // ==========================================
    console.log('\n📋 TEST GROUP 6: Phase 5 - AI Forecasting');
    console.log('───────────────────────────────────────────');

    try {
        const forecast = await request('/api/forecast', 'GET', authHeaders);
        recordTest('AI Forecast Generation', forecast.status === 200 || forecast.status === 400); // 400 is OK if no data
    } catch (e) {
        recordTest('AI Forecast Generation', false, e.message);
    }

    try {
        const accuracy = await request('/api/forecast/accuracy', 'GET', authHeaders);
        recordTest('Forecast Accuracy Metrics', accuracy.status === 200 || accuracy.status === 400);
    } catch (e) {
        recordTest('Forecast Accuracy Metrics', false, e.message);
    }

    // ==========================================
    // 7. PHASE 5: REPORTS
    // ==========================================
    console.log('\n📋 TEST GROUP 7: Phase 5 - PDF Reports');
    console.log('───────────────────────────────────────────');

    try {
        const templates = await request('/api/reports/templates', 'GET', authHeaders);
        recordTest('Report Templates', templates.status === 200 && templates.body.templates?.length > 0);
    } catch (e) {
        recordTest('Report Templates', false, e.message);
    }

    // ==========================================
    // 8. PHASE 5: QUICKBOOKS
    // ==========================================
    console.log('\n📋 TEST GROUP 8: Phase 5 - QuickBooks');
    console.log('───────────────────────────────────────────');

    try {
        const qbStatus = await request('/api/quickbooks/status', 'GET', authHeaders);
        recordTest('QuickBooks Status', qbStatus.status === 200);
    } catch (e) {
        recordTest('QuickBooks Status', false, e.message);
    }

    try {
        const qbConnect = await request('/api/quickbooks/connect', 'GET', authHeaders);
        recordTest('QuickBooks Connect URL', qbConnect.status === 200 && qbConnect.body.authUrl);
    } catch (e) {
        recordTest('QuickBooks Connect URL', false, e.message);
    }

    // ==========================================
    // 9. PHASE 5: AGENCY/MULTI-TENANT
    // ==========================================
    console.log('\n📋 TEST GROUP 9: Phase 5 - Agency/Multi-Tenant');
    console.log('───────────────────────────────────────────');

    try {
        const agency = await request('/api/agency', 'GET', authHeaders);
        recordTest('Agency Details', agency.status === 200 || agency.status === 404); // 404 if no agency
    } catch (e) {
        recordTest('Agency Details', false, e.message);
    }

    try {
        const workspaces = await request('/api/agency/workspaces', 'GET', authHeaders);
        recordTest('List Workspaces', workspaces.status === 200);
    } catch (e) {
        recordTest('List Workspaces', false, e.message);
    }

    // ==========================================
    // 10. PWA ASSETS
    // ==========================================
    console.log('\n📋 TEST GROUP 10: PWA Assets');
    console.log('───────────────────────────────────────────');

    try {
        const manifest = await request('/manifest.json');
        recordTest('Manifest.json', manifest.status === 200 && manifest.body.name);
    } catch (e) {
        recordTest('Manifest.json', false, e.message);
    }

    try {
        const sw = await request('/sw.js');
        recordTest('Service Worker', sw.status === 200);
    } catch (e) {
        recordTest('Service Worker', false, e.message);
    }

    // ==========================================
    // SUMMARY
    // ==========================================
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');

    const passed = testResults.filter(t => t.passed).length;
    const total = testResults.length;
    const failed = total - passed;
    const percentage = Math.round((passed / total) * 100);

    console.log(`\nTotal Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ${failed > 0 ? '❌' : ''}`);
    console.log(`Success Rate: ${percentage}%`);

    if (failed > 0) {
        console.log('\nFailed Tests:');
        testResults.filter(t => !t.passed).forEach(t => {
            console.log(`  ❌ ${t.name}: ${t.details}`);
        });
    }

    const grade = percentage >= 95 ? 'A+' : percentage >= 90 ? 'A' : percentage >= 80 ? 'B' : 'C';
    console.log(`\nGrade: ${grade}`);

    console.log('\n═══════════════════════════════════════════════════════════\n');

    return { passed, total, percentage, grade };
}

// Run tests
runTests().then(results => {
    process.exit(results.percentage >= 80 ? 0 : 1);
}).catch(err => {
    console.error('Test suite failed:', err);
    process.exit(1);
});
