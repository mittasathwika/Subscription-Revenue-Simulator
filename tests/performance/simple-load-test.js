/**
 * Simple Node.js Load Test Script
 * No external dependencies required - just run: node simple-load-test.js
 */

const http = require('http');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const CONCURRENT_USERS = parseInt(process.env.CONCURRENT_USERS) || 50;
const REQUESTS_PER_USER = parseInt(process.env.REQUESTS_PER_USER) || 20;

// Parse URL
const url = new URL(BASE_URL);
const options = {
    hostname: url.hostname,
    port: url.port || 3001,
    method: 'GET',
    timeout: 10000,
};

// Results tracking
const results = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    responseTimes: [],
    errors: [],
    startTime: null,
    endTime: null,
};

// Make a single request
function makeRequest(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const requestOptions = {
            ...options,
            path,
            method,
            headers: body ? {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
            } : {},
        };

        const req = http.request(requestOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                const responseTime = Date.now() - startTime;
                resolve({
                    statusCode: res.statusCode,
                    responseTime,
                    data,
                    success: res.statusCode >= 200 && res.statusCode < 300,
                });
            });
        });

        req.on('error', (error) => {
            reject({ error: error.message, responseTime: Date.now() - startTime });
        });

        req.on('timeout', () => {
            req.destroy();
            reject({ error: 'Request timeout', responseTime: Date.now() - startTime });
        });

        if (body) {
            req.write(body);
        }
        req.end();
    });
}

// Simulate a single user
async function simulateUser(userId) {
    const userResults = {
        requests: 0,
        successes: 0,
        failures: 0,
        totalResponseTime: 0,
    };

    for (let i = 0; i < REQUESTS_PER_USER; i++) {
        try {
            // Health check
            const health = await makeRequest('/api/health');
            userResults.requests++;
            userResults.totalResponseTime += health.responseTime;
            if (health.success) userResults.successes++;
            else userResults.failures++;

            // Metrics
            await new Promise(r => setTimeout(r, 100));
            const metrics = await makeRequest('/api/metrics');
            userResults.requests++;
            userResults.totalResponseTime += metrics.responseTime;
            if (metrics.success) userResults.successes++;
            else userResults.failures++;

            // Calculate (POST request)
            await new Promise(r => setTimeout(r, 200));
            const calcBody = JSON.stringify({
                price: 99,
                churn: 5,
                adSpend: 5000,
                growthRate: 10,
                initialCustomers: 100,
                cac: 500,
                months: 12
            });
            const calculate = await makeRequest('/api/metrics/calculate', 'POST', calcBody);
            userResults.requests++;
            userResults.totalResponseTime += calculate.responseTime;
            if (calculate.success) userResults.successes++;
            else userResults.failures++;

            // Scenarios
            await new Promise(r => setTimeout(r, 150));
            const scenarios = await makeRequest('/api/scenarios');
            userResults.requests++;
            userResults.totalResponseTime += scenarios.responseTime;
            if (scenarios.success) userResults.successes++;
            else userResults.failures++;

        } catch (error) {
            userResults.requests++;
            userResults.failures++;
            results.errors.push(`User ${userId}: ${error.error}`);
        }

        // Small delay between requests
        await new Promise(r => setTimeout(r, 100));
    }

    return userResults;
}

// Run the load test
async function runLoadTest() {
    console.log('🚀 Starting Simple Load Test\n');
    console.log(`Configuration:`);
    console.log(`  Base URL: ${BASE_URL}`);
    console.log(`  Concurrent Users: ${CONCURRENT_USERS}`);
    console.log(`  Requests per User: ${REQUESTS_PER_USER}`);
    console.log(`  Total Expected Requests: ${CONCURRENT_USERS * REQUESTS_PER_USER * 4}\n`);

    results.startTime = Date.now();

    // Create user promises
    const userPromises = [];
    for (let i = 0; i < CONCURRENT_USERS; i++) {
        userPromises.push(simulateUser(i + 1));
    }

    // Run all users concurrently
    const userResults = await Promise.all(userPromises);

    results.endTime = Date.now();

    // Aggregate results
    userResults.forEach(user => {
        results.totalRequests += user.requests;
        results.successfulRequests += user.successes;
        results.failedRequests += user.failures;
        results.responseTimes.push(user.totalResponseTime / user.requests);
    });

    // Print results
    printResults();
}

// Print test results
function printResults() {
    const duration = (results.endTime - results.startTime) / 1000;
    const avgResponseTime = results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length;
    const requestsPerSecond = results.totalRequests / duration;
    const successRate = (results.successfulRequests / results.totalRequests * 100).toFixed(2);

    console.log('\n' + '='.repeat(60));
    console.log('📊 LOAD TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`\nTest Duration: ${duration.toFixed(2)} seconds`);
    console.log(`Total Requests: ${results.totalRequests}`);
    console.log(`Successful Requests: ${results.successfulRequests}`);
    console.log(`Failed Requests: ${results.failedRequests}`);
    console.log(`Success Rate: ${successRate}%`);
    console.log(`Requests/Second: ${requestsPerSecond.toFixed(2)}`);
    console.log(`Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`\nConcurrency:`);
    console.log(`  Concurrent Users: ${CONCURRENT_USERS}`);
    console.log(`  Requests per User: ${REQUESTS_PER_USER}`);

    if (results.errors.length > 0) {
        console.log(`\n❌ Errors (${results.errors.length}):`);
        results.errors.slice(0, 10).forEach(err => console.log(`  - ${err}`));
        if (results.errors.length > 10) {
            console.log(`  ... and ${results.errors.length - 10} more`);
        }
    }

    console.log('\n' + '='.repeat(60));
    
    // Performance rating
    if (successRate >= 99 && avgResponseTime < 300) {
        console.log('✅ EXCELLENT: High success rate and fast response times');
    } else if (successRate >= 95 && avgResponseTime < 500) {
        console.log('✅ GOOD: Acceptable performance for production');
    } else if (successRate >= 90 && avgResponseTime < 1000) {
        console.log('⚠️  FAIR: May need optimization for high traffic');
    } else {
        console.log('❌ POOR: Requires significant optimization');
    }
    
    console.log('='.repeat(60) + '\n');
}

// Health check before starting
async function healthCheck() {
    try {
        const health = await makeRequest('/api/health');
        if (health.success) {
            console.log('✅ Server is healthy\n');
            return true;
        }
    } catch (error) {
        console.error('❌ Server is not responding. Please ensure the server is running on', BASE_URL);
        return false;
    }
}

// Main
async function main() {
    const isHealthy = await healthCheck();
    if (isHealthy) {
        await runLoadTest();
    }
}

main().catch(console.error);
