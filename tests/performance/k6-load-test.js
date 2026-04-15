/**
 * k6 Load Testing Script for Subscription Revenue Simulator API
 * 
 * Run with: k6 run k6-load-test.js
 * Or with custom options: k6 run --vus 100 --duration 5m k6-load-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');
const successfulRequests = new Counter('successful_requests');

// Test configuration
export const options = {
    stages: [
        { duration: '2m', target: 50 },   // Ramp up to 50 users
        { duration: '5m', target: 50 },   // Stay at 50 users
        { duration: '2m', target: 100 },  // Ramp up to 100 users
        { duration: '5m', target: 100 },  // Stay at 100 users
        { duration: '2m', target: 200 },  // Ramp up to 200 users
        { duration: '5m', target: 200 },  // Stay at 200 users
        { duration: '2m', target: 0 },    // Ramp down
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'], // 95% of requests must be under 500ms
        http_req_failed: ['rate<0.01'],    // Error rate must be below 1%
        errors: ['rate<0.05'],              // Custom error rate below 5%
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

export default function () {
    group('Health Check', () => {
        const start = Date.now();
        const response = http.get(`${BASE_URL}/api/health`);
        const duration = Date.now() - start;
        
        apiResponseTime.add(duration);
        
        const success = check(response, {
            'health status is 200': (r) => r.status === 200,
            'health response time < 100ms': (r) => r.timings.duration < 100,
            'health status is ok': (r) => r.json('status') === 'ok',
        });
        
        errorRate.add(!success);
        if (success) successfulRequests.add(1);
        
        sleep(1);
    });

    group('Security Check', () => {
        const start = Date.now();
        const response = http.get(`${BASE_URL}/api/security`);
        const duration = Date.now() - start;
        
        apiResponseTime.add(duration);
        
        const success = check(response, {
            'security status is 200': (r) => r.status === 200,
            'security response time < 100ms': (r) => r.timings.duration < 100,
            'security headers present': (r) => r.json('status') === 'secure',
        });
        
        errorRate.add(!success);
        if (success) successfulRequests.add(1);
        
        sleep(1);
    });

    group('Metrics API', () => {
        const start = Date.now();
        const response = http.get(`${BASE_URL}/api/metrics`);
        const duration = Date.now() - start;
        
        apiResponseTime.add(duration);
        
        const success = check(response, {
            'metrics status is 200': (r) => r.status === 200,
            'metrics response time < 300ms': (r) => r.timings.duration < 300,
            'metrics has required fields': (r) => {
                const body = r.json();
                return body.customers !== undefined && 
                       body.monthly_revenue !== undefined;
            },
        });
        
        errorRate.add(!success);
        if (success) successfulRequests.add(1);
        
        sleep(2);
    });

    group('Calculate Projections', () => {
        const payload = JSON.stringify({
            price: 99,
            churn: 5,
            adSpend: 5000,
            growthRate: 10,
            initialCustomers: 100,
            cac: 500,
            months: 12
        });

        const params = {
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const start = Date.now();
        const response = http.post(
            `${BASE_URL}/api/metrics/calculate`,
            payload,
            params
        );
        const duration = Date.now() - start;
        
        apiResponseTime.add(duration);
        
        const success = check(response, {
            'calculate status is 200': (r) => r.status === 200,
            'calculate response time < 400ms': (r) => r.timings.duration < 400,
            'calculate has projection data': (r) => {
                const body = r.json();
                return body.projection && 
                       body.projection.revenue && 
                       body.projection.customers;
            },
        });
        
        errorRate.add(!success);
        if (success) successfulRequests.add(1);
        
        sleep(3);
    });

    group('List Scenarios', () => {
        const start = Date.now();
        const response = http.get(`${BASE_URL}/api/scenarios`);
        const duration = Date.now() - start;
        
        apiResponseTime.add(duration);
        
        const success = check(response, {
            'scenarios status is 200': (r) => r.status === 200,
            'scenarios response time < 300ms': (r) => r.timings.duration < 300,
            'scenarios returns array': (r) => Array.isArray(r.json('scenarios')),
        });
        
        errorRate.add(!success);
        if (success) successfulRequests.add(1);
        
        sleep(2);
    });

    group('API Root', () => {
        const start = Date.now();
        const response = http.get(`${BASE_URL}/api`);
        const duration = Date.now() - start;
        
        apiResponseTime.add(duration);
        
        const success = check(response, {
            'api root status is 200': (r) => r.status === 200,
            'api root has endpoints': (r) => r.json('endpoints') !== undefined,
        });
        
        errorRate.add(!success);
        if (success) successfulRequests.add(1);
        
        sleep(1);
    });
}

// Test lifecycle hooks
export function setup() {
    console.log('Starting load test...');
    console.log(`Base URL: ${BASE_URL}`);
    
    // Verify server is up
    const health = http.get(`${BASE_URL}/api/health`);
    if (health.status !== 200) {
        console.error('Server is not healthy, aborting test');
        return { abort: true };
    }
    
    return { startTime: Date.now() };
}

export function teardown(data) {
    const duration = (Date.now() - data.startTime) / 1000;
    console.log(`\nLoad test completed in ${duration}s`);
    console.log('Check the summary above for detailed metrics');
}
