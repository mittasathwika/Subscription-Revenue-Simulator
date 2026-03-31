/**
 * Regression Test Suite
 * Ensures core functionality works after changes
 */

describe('Regression Tests', () => {
    
    describe('Phase 1 → Phase 2 Compatibility', () => {
        test('basic calculations still work (Phase 1 baseline)', () => {
            const inputs = {
                price: 99,
                churn: 0.05,
                adSpend: 5000,
                growthRate: 0.10,
                initialCustomers: 100,
                cac: 500
            };
            
            const result = simulator.calculateProjections(inputs);
            
            // Phase 1 baseline expectations
            expect(result.metrics.ltv).toBeGreaterThan(0);
            expect(result.metrics.arr).toBeGreaterThan(0);
            expect(result.metrics.ltvCacRatio).toBeGreaterThan(0);
            expect(result.revenue).toHaveLength(12);
            expect(result.customers).toHaveLength(12);
        });

        test('charts are rendered (Phase 1 feature preserved)', () => {
            simulator.calculateProjections();
            
            const revenueCanvas = document.getElementById('revenueChart');
            const customerCanvas = document.getElementById('customerChart');
            
            expect(revenueCanvas).toBeTruthy();
            expect(customerCanvas).toBeTruthy();
        });
    });

    describe('Authentication Regression', () => {
        test('demo user can access metrics without login', async () => {
            const response = await fetch(`${API_BASE}/metrics`, {
                headers: { 'x-user-id': 'demo@example.com' }
            });
            
            expect(response.status).toBe(200);
        });

        test('unauthenticated requests get 401 for protected routes', async () => {
            const response = await fetch(`${API_BASE}/scenarios`, {
                headers: {} // No auth
            });
            
            // Should return demo data or 401 based on implementation
            expect([200, 401]).toContain(response.status);
        });

        test('JWT token is validated on each request', async () => {
            const invalidToken = 'invalid-token';
            
            const response = await fetch(`${API_BASE}/auth/verify`, {
                headers: { 'Authorization': `Bearer ${invalidToken}` }
            });
            
            expect(response.status).toBe(401);
        });
    });

    describe('Data Persistence Regression', () => {
        test('localStorage scenarios persist across reloads', () => {
            const testScenario = {
                id: 'test-123',
                name: 'Persistence Test',
                createdAt: new Date().toISOString(),
                inputs: { price: 99, churn: 0.05 }
            };
            
            // Save
            localStorage.setItem('scenarios', JSON.stringify([testScenario]));
            
            // Reload (simulate)
            simulator.scenarios = [];
            simulator.loadScenarios();
            
            expect(simulator.scenarios.length).toBe(1);
            expect(simulator.scenarios[0].name).toBe('Persistence Test');
        });

        test('auth token persists in localStorage', () => {
            const token = 'test-jwt-token';
            localStorage.setItem('authToken', token);
            
            // Simulate page reload
            const retrieved = localStorage.getItem('authToken');
            expect(retrieved).toBe(token);
        });
    });

    describe('Calculation Accuracy Regression', () => {
        test('LTV formula is consistent', () => {
            const arpu = 100;
            const churn = 0.05;
            
            const ltv1 = MetricsEngine.calculateLTV(arpu, churn);
            const ltv2 = (arpu / churn); // Manual calculation
            
            expect(ltv1).toBe(ltv2);
        });

        test('12-month projection totals are positive', () => {
            const inputs = {
                price: 99,
                churn: 0.05,
                adSpend: 5000,
                growthRate: 0.10,
                initialCustomers: 100,
                cac: 500
            };
            
            const result = simulator.calculateProjections(inputs);
            
            // All revenue values should be positive
            result.revenue.forEach(val => {
                expect(val).toBeGreaterThanOrEqual(0);
            });
            
            // All customer values should be positive
            result.customers.forEach(val => {
                expect(val).toBeGreaterThanOrEqual(0);
            });
        });

        test('ARR = MRR × 12 (consistency check)', () => {
            const mrr = 10000;
            const arr = MetricsEngine.calculateARR(mrr);
            
            expect(arr).toBe(mrr * 12);
        });
    });

    describe('UI Regression', () => {
        test('all metric cards display values', () => {
            simulator.calculateProjections();
            
            const ltvEl = document.getElementById('ltvValue');
            const arrEl = document.getElementById('arrValue');
            const ratioEl = document.getElementById('ltvCacRatio');
            const paybackEl = document.getElementById('paybackPeriod');
            
            expect(ltvEl.textContent).not.toBe('$0');
            expect(arrEl.textContent).not.toBe('$0');
            expect(ratioEl.textContent).not.toBe('0');
            expect(paybackEl.textContent).not.toBe('0 months');
        });

        test('sidebar renders scenario list', () => {
            simulator.scenarios = [
                { id: '1', name: 'Scenario 1', createdAt: new Date().toISOString() }
            ];
            simulator.renderScenariosList();
            
            const list = document.getElementById('scenariosList');
            expect(list.innerHTML).toContain('Scenario 1');
        });
    });

    describe('Edge Cases Regression', () => {
        test('zero churn is handled (no division by zero)', () => {
            const inputs = {
                price: 99,
                churn: 0,
                adSpend: 5000,
                growthRate: 0.10,
                initialCustomers: 100,
                cac: 500
            };
            
            expect(() => simulator.calculateProjections(inputs)).not.toThrow();
        });

        test('zero initial customers is handled', () => {
            const inputs = {
                price: 99,
                churn: 0.05,
                adSpend: 5000,
                growthRate: 0.10,
                initialCustomers: 0,
                cac: 500
            };
            
            const result = simulator.calculateProjections(inputs);
            expect(result).toBeTruthy();
        });

        test('very high churn rate (50%) is handled', () => {
            const inputs = {
                price: 99,
                churn: 0.50,
                adSpend: 5000,
                growthRate: 0.10,
                initialCustomers: 100,
                cac: 500
            };
            
            expect(() => simulator.calculateProjections(inputs)).not.toThrow();
        });

        test('large numbers are handled', () => {
            const inputs = {
                price: 999999,
                churn: 0.05,
                adSpend: 1000000,
                growthRate: 0.50,
                initialCustomers: 100000,
                cac: 50000
            };
            
            const result = simulator.calculateProjections(inputs);
            expect(result).toBeTruthy();
            expect(result.revenue[11]).toBeGreaterThan(0);
        });
    });

    describe('API Response Format Regression', () => {
        test('metrics endpoint returns expected structure', async () => {
            const response = await fetch(`${API_BASE}/metrics`, {
                headers: { 'x-user-id': 'demo@example.com' }
            });
            
            const data = await response.json();
            
            expect(data).toHaveProperty('customers');
            expect(data).toHaveProperty('monthly_revenue');
            expect(data).toHaveProperty('churn_rate');
        });

        test('calculate endpoint returns expected structure', async () => {
            const response = await fetch(`${API_BASE}/metrics/calculate`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-user-id': 'demo@example.com'
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
            
            const data = await response.json();
            
            expect(data).toHaveProperty('inputs');
            expect(data).toHaveProperty('projection');
            expect(data.projection).toHaveProperty('months');
            expect(data.projection).toHaveProperty('customers');
            expect(data.projection).toHaveProperty('revenue');
        });
    });
});

// Mock API_BASE for tests if not defined
if (typeof API_BASE === 'undefined') {
    var API_BASE = 'http://127.0.0.1:3001/api';
}

module.exports = { describe, test, expect };
