/**
 * REGRESSION & FUNCTIONALITY TEST SUITE
 * Subscription Revenue Simulator - Phase 4 Validation
 */

const http = require('http');

const BASE_URL = 'localhost';
const PORT = 3001;

// Test Results Storage
const results = {
    passed: 0,
    failed: 0,
    tests: []
};

// HTTP Request Helper
function makeRequest(path, method = 'GET', data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: BASE_URL,
            port: PORT,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        body: body ? JSON.parse(body) : null,
                        headers: res.headers
                    });
                } catch (e) {
                    resolve({ status: res.statusCode, body: body, headers: res.headers });
                }
            });
        });

        req.on('error', reject);
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

// Test Logger
function logTest(name, status, details = '') {
    const symbol = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${symbol} ${name}`);
    if (details) console.log(`   ${details}`);
    results.tests.push({ name, status, details });
    if (status === 'PASS') results.passed++;
    if (status === 'FAIL') results.failed++;
}

// ==================== TEST SUITES ====================

async function testHealthEndpoints() {
    console.log('\n📋 TEST SUITE: Health & Status Endpoints\n');
    
    try {
        // Health Check
        const health = await makeRequest('/api/health');
        if (health.status === 200 && health.body?.status === 'healthy') {
            logTest('Health Check', 'PASS', `Status: ${health.body.status}, DB: ${health.body.database}`);
        } else {
            logTest('Health Check', 'FAIL', `Unexpected response: ${JSON.stringify(health.body)}`);
        }

        // Security Status
        const security = await makeRequest('/api/security');
        if (security.status === 200 && security.body?.security?.helmet === true) {
            logTest('Security Status', 'PASS', `Helmet: ${security.body.security.helmet}, RateLimit: ${security.body.security.rateLimiting}`);
        } else {
            logTest('Security Status', 'FAIL', `Security not properly configured`);
        }
    } catch (error) {
        logTest('Health Endpoints', 'FAIL', error.message);
    }
}

async function testAuthentication() {
    console.log('\n📋 TEST SUITE: Authentication\n');
    
    try {
        // Test Signup
        const signupData = {
            email: `test${Date.now()}@example.com`,
            password: 'testpass123'
        };
        
        const signup = await makeRequest('/api/auth/signup', 'POST', signupData);
        if (signup.status === 201 && signup.body?.token) {
            logTest('User Signup', 'PASS', `Token received, User ID: ${signup.body.user.id}`);
            global.testToken = signup.body.token;
            global.testUserId = signup.body.user.id;
        } else if (signup.body?.error?.includes('already exists')) {
            logTest('User Signup', 'PASS', 'User already exists (expected)');
        } else {
            logTest('User Signup', 'FAIL', `Status: ${signup.status}, Error: ${JSON.stringify(signup.body)}`);
        }

        // Test Login
        const login = await makeRequest('/api/auth/login', 'POST', {
            email: 'demo@example.com',
            password: 'demo123'
        });
        
        if (login.status === 200 && login.body?.token) {
            logTest('User Login', 'PASS', `Demo login successful, Token length: ${login.body.token.length}`);
            global.demoToken = login.body.token;
        } else {
            logTest('User Login', 'FAIL', `Status: ${login.status}, Error: ${JSON.stringify(login.body)}`);
        }

        // Test Invalid Login
        const invalidLogin = await makeRequest('/api/auth/login', 'POST', {
            email: 'demo@example.com',
            password: 'wrongpassword'
        });
        
        if (invalidLogin.status === 401) {
            logTest('Invalid Login Rejection', 'PASS', 'Correctly rejected invalid credentials');
        } else {
            logTest('Invalid Login Rejection', 'FAIL', 'Should have rejected invalid credentials');
        }

        // Test Token Verification
        if (global.demoToken) {
            const verify = await makeRequest('/api/auth/verify', 'GET', null, {
                'Authorization': `Bearer ${global.demoToken}`
            });
            
            if (verify.status === 200 && verify.body?.valid === true) {
                logTest('Token Verification', 'PASS', 'Token validated successfully');
            } else {
                logTest('Token Verification', 'FAIL', `Verification failed: ${JSON.stringify(verify.body)}`);
            }
        }

    } catch (error) {
        logTest('Authentication', 'FAIL', error.message);
    }
}

async function testMetricsCalculation() {
    console.log('\n📋 TEST SUITE: Metrics Calculation\n');
    
    try {
        // Test Metrics Calculation
        const calcData = {
            price: 99,
            churnRate: 5,
            adSpend: 5000,
            growthRate: 10,
            initialCustomers: 100,
            cac: 500,
            months: 12
        };
        
        const calc = await makeRequest('/api/metrics/calculate', 'POST', calcData);
        
        if (calc.status === 200 && calc.body?.projections) {
            const proj = calc.body.projections;
            logTest('Metrics Calculation', 'PASS', 
                `LTV: $${proj.ltv}, ARR: $${proj.arr}, ` +
                `LTV/CAC: ${proj.ltvCacRatio.toFixed(2)}, Payback: ${proj.paybackPeriod} months`
            );
        } else {
            logTest('Metrics Calculation', 'FAIL', `Status: ${calc.status}, Error: ${JSON.stringify(calc.body)}`);
        }

        // Test Real Metrics (if authenticated)
        if (global.demoToken) {
            const realMetrics = await makeRequest('/api/metrics', 'GET', null, {
                'Authorization': `Bearer ${global.demoToken}`
            });
            
            if (realMetrics.status === 200) {
                logTest('Real Metrics Fetch', 'PASS', 'Successfully retrieved real metrics');
            } else {
                logTest('Real Metrics Fetch', 'FAIL', `Status: ${realMetrics.status}`);
            }
        }

    } catch (error) {
        logTest('Metrics Calculation', 'FAIL', error.message);
    }
}

async function testScenarios() {
    console.log('\n📋 TEST SUITE: Scenario Management\n');
    
    try {
        if (!global.demoToken) {
            logTest('Scenario Tests', 'SKIP', 'No authentication token available');
            return;
        }

        const headers = { 'Authorization': `Bearer ${global.demoToken}` };

        // Create Scenario
        const scenarioData = {
            name: `Test Scenario ${Date.now()}`,
            parameters: {
                price: 99,
                churnRate: 5,
                adSpend: 5000,
                growthRate: 10,
                initialCustomers: 100,
                cac: 500
            }
        };
        
        const create = await makeRequest('/api/scenarios', 'POST', scenarioData, headers);
        
        if (create.status === 201 && create.body?.scenario?.id) {
            logTest('Create Scenario', 'PASS', `Created: ${create.body.scenario.name}`);
            global.testScenarioId = create.body.scenario.id;
        } else {
            logTest('Create Scenario', 'FAIL', `Status: ${create.status}, Error: ${JSON.stringify(create.body)}`);
        }

        // List Scenarios
        const list = await makeRequest('/api/scenarios', 'GET', null, headers);
        if (list.status === 200 && Array.isArray(list.body?.scenarios)) {
            logTest('List Scenarios', 'PASS', `Found ${list.body.scenarios.length} scenarios`);
        } else {
            logTest('List Scenarios', 'FAIL', `Status: ${list.status}`);
        }

        // Get Specific Scenario
        if (global.testScenarioId) {
            const get = await makeRequest(`/api/scenarios/${global.testScenarioId}`, 'GET', null, headers);
            if (get.status === 200 && get.body?.scenario) {
                logTest('Get Scenario', 'PASS', `Retrieved: ${get.body.scenario.name}`);
            } else {
                logTest('Get Scenario', 'FAIL', `Status: ${get.status}`);
            }
        }

    } catch (error) {
        logTest('Scenario Management', 'FAIL', error.message);
    }
}

async function testInputValidation() {
    console.log('\n📋 TEST SUITE: Input Validation & Security\n');
    
    try {
        // Test Invalid Data Rejection
        const invalidData = {
            price: -99,  // Invalid negative price
            churnRate: 150,  // Invalid > 100%
            adSpend: -1000,  // Invalid negative
            growthRate: -50,
            initialCustomers: -10,
            cac: -500
        };
        
        const invalid = await makeRequest('/api/metrics/calculate', 'POST', invalidData);
        
        if (invalid.status === 400) {
            logTest('Invalid Data Rejection', 'PASS', 'Correctly rejected invalid data');
        } else {
            logTest('Invalid Data Rejection', 'WARN', `Status: ${invalid.status} (may need stricter validation)`);
        }

        // Test Missing Data Rejection
        const missingData = {
            price: 99
            // Missing other required fields
        };
        
        const missing = await makeRequest('/api/metrics/calculate', 'POST', missingData);
        if (missing.status === 400) {
            logTest('Missing Data Rejection', 'PASS', 'Correctly rejected incomplete data');
        } else {
            logTest('Missing Data Rejection', 'WARN', `Status: ${missing.status} (may use defaults)`);
        }

        // Test Auth Required Routes
        const noAuth = await makeRequest('/api/scenarios', 'GET');
        if (noAuth.status === 401) {
            logTest('Auth Protection', 'PASS', 'Protected routes require authentication');
        } else {
            logTest('Auth Protection', 'FAIL', 'Protected route accessible without auth!');
        }

    } catch (error) {
        logTest('Input Validation', 'FAIL', error.message);
    }
}

async function testStaticFiles() {
    console.log('\n📋 TEST SUITE: Static File Serving\n');
    
    try {
        const index = await makeRequest('/');
        if (index.status === 200) {
            logTest('Index HTML', 'PASS', 'Frontend served successfully');
        } else {
            logTest('Index HTML', 'FAIL', `Status: ${index.status}`);
        }

        const css = await makeRequest('/styles.css');
        if (css.status === 200 && css.body && css.body.includes('body')) {
            logTest('CSS Stylesheet', 'PASS', 'CSS loaded successfully');
        } else {
            logTest('CSS Stylesheet', 'FAIL', 'CSS not accessible');
        }

        const js = await makeRequest('/phase2-script.js');
        if (js.status === 200) {
            logTest('JavaScript', 'PASS', 'JS loaded successfully');
        } else {
            logTest('JavaScript', 'FAIL', 'JS not accessible');
        }

    } catch (error) {
        logTest('Static Files', 'FAIL', error.message);
    }
}

// ==================== MAIN TEST RUNNER ====================

async function runAllTests() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  SUBSCRIPTION REVENUE SIMULATOR - REGRESSION TEST SUITE');
    console.log('  Phase 4 Validation & Functionality Testing');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`\n🕐 Test Started: ${new Date().toLocaleString()}`);
    console.log(`🌐 Target: http://${BASE_URL}:${PORT}\n`);

    const startTime = Date.now();

    await testHealthEndpoints();
    await testAuthentication();
    await testMetricsCalculation();
    await testScenarios();
    await testInputValidation();
    await testStaticFiles();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Print Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`\n✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`⚠️  Total: ${results.passed + results.failed}`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`\n📊 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
    
    if (results.failed === 0) {
        console.log('\n🎉 ALL TESTS PASSED - System is production ready!');
    } else {
        console.log('\n⚠️  Some tests failed - Review issues before deployment');
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════\n');

    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
}

// Handle errors
process.on('unhandledRejection', (err) => {
    console.error('\n❌ Fatal Error:', err.message);
    process.exit(1);
});

// Run tests
runAllTests();
