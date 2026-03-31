/**
 * API Integration Tests
 * Tests all backend API endpoints
 */

const API_BASE = 'http://127.0.0.1:3001/api';

describe('API Integration Tests', () => {
    let authToken = null;
    let testUserId = null;
    let testScenarioId = null;

    // Test user credentials
    const testEmail = `test_${Date.now()}@example.com`;
    const testPassword = 'testpassword123';

    describe('Health Check', () => {
        test('GET /api/health returns status ok', async () => {
            const response = await fetch(`${API_BASE}/health`);
            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.status).toBe('ok');
            expect(data.timestamp).toBeDefined();
        });
    });

    describe('Authentication', () => {
        test('POST /api/auth/signup creates new user', async () => {
            const response = await fetch(`${API_BASE}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: testEmail,
                    password: testPassword
                })
            });

            expect(response.status).toBe(201);
            const data = await response.json();
            expect(data.success).toBe(true);
            expect(data.token).toBeDefined();
            expect(data.user).toBeDefined();
            expect(data.user.email).toBe(testEmail);
            
            authToken = data.token;
            testUserId = data.user.id;
        });

        test('POST /api/auth/signup rejects duplicate email', async () => {
            const response = await fetch(`${API_BASE}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: testEmail,
                    password: testPassword
                })
            });

            expect(response.status).toBe(409);
            const data = await response.json();
            expect(data.error).toBe('User already exists');
        });

        test('POST /api/auth/login with valid credentials', async () => {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: testEmail,
                    password: testPassword
                })
            });

            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.success).toBe(true);
            expect(data.token).toBeDefined();
            expect(data.user.email).toBe(testEmail);
        });

        test('POST /api/auth/login rejects invalid credentials', async () => {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: testEmail,
                    password: 'wrongpassword'
                })
            });

            expect(response.status).toBe(401);
            const data = await response.json();
            expect(data.error).toBe('Invalid credentials');
        });

        test('GET /api/auth/verify validates token', async () => {
            const response = await fetch(`${API_BASE}/auth/verify`, {
                headers: { 
                    'Authorization': `Bearer ${authToken}` 
                }
            });

            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.valid).toBe(true);
        });
    });

    describe('Metrics API', () => {
        test('GET /api/metrics returns demo data when not authenticated', async () => {
            const response = await fetch(`${API_BASE}/metrics`, {
                headers: { 'x-user-id': 'demo@example.com' }
            });

            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.customers).toBeDefined();
            expect(data.monthly_revenue).toBeDefined();
            expect(data.churn_rate).toBeDefined();
        });

        test('POST /api/metrics/calculate returns projections', async () => {
            const response = await fetch(`${API_BASE}/metrics/calculate`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}` 
                },
                body: JSON.stringify({
                    price: 99,
                    churn: 5,
                    adSpend: 5000,
                    growthRate: 10,
                    initialCustomers: 100,
                    cac: 500
                })
            });

            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.inputs).toBeDefined();
            expect(data.projection).toBeDefined();
            expect(data.summary).toBeDefined();
        });

        test('POST /api/metrics/calculate validates inputs', async () => {
            const response = await fetch(`${API_BASE}/metrics/calculate`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}` 
                },
                body: JSON.stringify({
                    price: -10,
                    churn: 5,
                    adSpend: 5000,
                    growthRate: 10,
                    initialCustomers: 100,
                    cac: 500
                })
            });

            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.errors).toBeDefined();
        });
    });

    describe('Scenarios API', () => {
        test('POST /api/scenarios creates scenario', async () => {
            const response = await fetch(`${API_BASE}/scenarios`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}` 
                },
                body: JSON.stringify({
                    name: 'Test Scenario',
                    price: 99,
                    churn_rate: 0.05,
                    ad_spend: 5000,
                    growth_rate: 0.10,
                    initial_customers: 100,
                    cac: 500
                })
            });

            expect(response.status).toBe(201);
            const data = await response.json();
            expect(data.success).toBe(true);
            expect(data.id).toBeDefined();
            testScenarioId = data.id;
        });

        test('POST /api/scenarios requires name', async () => {
            const response = await fetch(`${API_BASE}/scenarios`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}` 
                },
                body: JSON.stringify({
                    price: 99,
                    churn_rate: 0.05
                })
            });

            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toBe('Scenario name is required');
        });

        test('GET /api/scenarios lists user scenarios', async () => {
            const response = await fetch(`${API_BASE}/scenarios`, {
                headers: { 
                    'Authorization': `Bearer ${authToken}` 
                }
            });

            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.scenarios).toBeDefined();
            expect(Array.isArray(data.scenarios)).toBe(true);
            expect(data.count).toBeGreaterThanOrEqual(1);
        });

        test('GET /api/scenarios/:id retrieves specific scenario', async () => {
            const response = await fetch(`${API_BASE}/scenarios/${testScenarioId}`, {
                headers: { 
                    'Authorization': `Bearer ${authToken}` 
                }
            });

            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.id).toBe(testScenarioId);
            expect(data.name).toBe('Test Scenario');
            expect(data.projection).toBeDefined();
        });

        test('PUT /api/scenarios/:id updates scenario', async () => {
            const response = await fetch(`${API_BASE}/scenarios/${testScenarioId}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}` 
                },
                body: JSON.stringify({
                    name: 'Updated Test Scenario',
                    price: 149
                })
            });

            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.success).toBe(true);
        });

        test('POST /api/scenarios/compare compares scenarios', async () => {
            // Create second scenario for comparison
            const createResponse = await fetch(`${API_BASE}/scenarios`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}` 
                },
                body: JSON.stringify({
                    name: 'Comparison Scenario',
                    price: 199,
                    churn_rate: 0.03,
                    ad_spend: 10000,
                    growth_rate: 0.20,
                    initial_customers: 200,
                    cac: 600
                })
            });
            const newScenario = await createResponse.json();

            const response = await fetch(`${API_BASE}/scenarios/compare`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}` 
                },
                body: JSON.stringify({
                    scenario_ids: [testScenarioId, newScenario.id]
                })
            });

            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.comparison).toBeDefined();
            expect(data.comparison.length).toBe(2);
            expect(data.best_scenario).toBeDefined();
        });

        test('DELETE /api/scenarios/:id removes scenario', async () => {
            const response = await fetch(`${API_BASE}/scenarios/${testScenarioId}`, {
                method: 'DELETE',
                headers: { 
                    'Authorization': `Bearer ${authToken}` 
                }
            });

            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.success).toBe(true);
        });

        test('GET /api/scenarios/:id returns 404 for deleted scenario', async () => {
            const response = await fetch(`${API_BASE}/scenarios/${testScenarioId}`, {
                headers: { 
                    'Authorization': `Bearer ${authToken}` 
                }
            });

            expect(response.status).toBe(404);
        });
    });
});

// Test runner
if (typeof window !== 'undefined') {
    window.runAPITests = () => {
        console.log('Running API Integration Tests...');
        // Tests would run here
    };
}

module.exports = { describe, test, expect, API_BASE };
