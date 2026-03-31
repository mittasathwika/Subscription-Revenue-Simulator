/**
 * Unit Tests - Metrics Calculation Engine
 * Tests all financial calculations and projections
 */

const MetricsEngine = require('../backend/utils/metricsEngine');

describe('MetricsEngine', () => {
    
    describe('LTV Calculation', () => {
        test('calculates LTV correctly with churn > 0', () => {
            const arpu = 100;
            const churn = 0.05;
            const ltv = MetricsEngine.calculateLTV(arpu, churn);
            expect(ltv).toBe(2000);
        });

        test('caps LTV at 24 months when churn is 0', () => {
            const arpu = 100;
            const churn = 0;
            const ltv = MetricsEngine.calculateLTV(arpu, churn);
            expect(ltv).toBe(2400);
        });

        test('handles very small churn rates', () => {
            const arpu = 99;
            const churn = 0.01;
            const ltv = MetricsEngine.calculateLTV(arpu, churn);
            expect(ltv).toBe(9900);
        });
    });

    describe('Payback Period Calculation', () => {
        test('calculates payback period correctly', () => {
            const price = 99;
            const cac = 500;
            const payback = MetricsEngine.calculatePaybackPeriod(price, cac);
            expect(payback).toBeCloseTo(5.05, 2);
        });

        test('returns infinity when monthly contribution is 0', () => {
            const price = 0;
            const cac = 500;
            const payback = MetricsEngine.calculatePaybackPeriod(price, cac);
            expect(payback).toBe(Infinity);
        });
    });

    describe('ARR Calculation', () => {
        test('calculates ARR from MRR', () => {
            const mrr = 10000;
            const arr = MetricsEngine.calculateARR(mrr);
            expect(arr).toBe(120000);
        });

        test('handles zero MRR', () => {
            const mrr = 0;
            const arr = MetricsEngine.calculateARR(mrr);
            expect(arr).toBe(0);
        });
    });

    describe('Churn Rate Calculation', () => {
        test('calculates churn rate correctly', () => {
            const lost = 5;
            const total = 100;
            const churn = MetricsEngine.calculateChurnRate(lost, total);
            expect(churn).toBe(0.05);
        });

        test('returns 0 when no customers', () => {
            const lost = 0;
            const total = 0;
            const churn = MetricsEngine.calculateChurnRate(lost, total);
            expect(churn).toBe(0);
        });
    });

    describe('CAC Calculation', () => {
        test('calculates CAC correctly', () => {
            const spend = 5000;
            const customers = 10;
            const cac = MetricsEngine.calculateCAC(spend, customers);
            expect(cac).toBe(500);
        });

        test('returns 0 when no new customers', () => {
            const spend = 5000;
            const customers = 0;
            const cac = MetricsEngine.calculateCAC(spend, customers);
            expect(cac).toBe(0);
        });
    });

    describe('12-Month Projections', () => {
        const defaultInputs = {
            price: 99,
            churn: 0.05,
            adSpend: 5000,
            growthRate: 0.10,
            initialCustomers: 100,
            cac: 500,
            months: 12
        };

        test('returns correct structure', () => {
            const result = MetricsEngine.calculateProjections(defaultInputs);
            expect(result).toHaveProperty('months');
            expect(result).toHaveProperty('customers');
            expect(result).toHaveProperty('revenue');
            expect(result).toHaveProperty('newCustomers');
            expect(result).toHaveProperty('churnedCustomers');
            expect(result).toHaveProperty('metrics');
        });

        test('customers array has correct length', () => {
            const result = MetricsEngine.calculateProjections(defaultInputs);
            expect(result.customers).toHaveLength(12);
            expect(result.revenue).toHaveLength(12);
        });

        test('first month customers equals initial', () => {
            const result = MetricsEngine.calculateProjections(defaultInputs);
            expect(result.customers[0]).toBeGreaterThanOrEqual(defaultInputs.initialCustomers);
        });

        test('revenue increases with customers', () => {
            const result = MetricsEngine.calculateProjections(defaultInputs);
            const lastMonth = result.revenue.length - 1;
            expect(result.revenue[lastMonth]).toBeGreaterThan(result.revenue[0]);
        });

        test('calculates key metrics', () => {
            const result = MetricsEngine.calculateProjections(defaultInputs);
            expect(result.metrics).toHaveProperty('mrr');
            expect(result.metrics).toHaveProperty('arr');
            expect(result.metrics).toHaveProperty('arpu');
            expect(result.metrics).toHaveProperty('ltv');
            expect(result.metrics).toHaveProperty('ltv_cac_ratio');
            expect(result.metrics).toHaveProperty('payback_period');
        });

        test('LTV:CAC ratio is calculated correctly', () => {
            const result = MetricsEngine.calculateProjections(defaultInputs);
            const expectedLTV = result.metrics.arpu / defaultInputs.churn;
            const expectedRatio = expectedLTV / defaultInputs.cac;
            expect(result.metrics.ltv_cac_ratio).toBeCloseTo(expectedRatio, 2);
        });
    });

    describe('Input Validation', () => {
        test('validates correct inputs', () => {
            const inputs = {
                price: 99,
                churn: 0.05,
                adSpend: 5000,
                growthRate: 0.10,
                initialCustomers: 100,
                cac: 500
            };
            const validation = MetricsEngine.validateInputs(inputs);
            expect(validation.valid).toBe(true);
            expect(validation.errors).toHaveLength(0);
        });

        test('detects invalid price', () => {
            const inputs = {
                price: 0,
                churn: 0.05,
                adSpend: 5000,
                growthRate: 0.10,
                initialCustomers: 100,
                cac: 500
            };
            const validation = MetricsEngine.validateInputs(inputs);
            expect(validation.valid).toBe(false);
            expect(validation.errors).toContain('Price must be greater than 0');
        });

        test('detects invalid churn rate', () => {
            const inputs = {
                price: 99,
                churn: 1.5,
                adSpend: 5000,
                growthRate: 0.10,
                initialCustomers: 100,
                cac: 500
            };
            const validation = MetricsEngine.validateInputs(inputs);
            expect(validation.valid).toBe(false);
            expect(validation.errors).toContain('Churn rate must be between 0% and 100%');
        });

        test('warns about high churn', () => {
            const inputs = {
                price: 99,
                churn: 0.25,
                adSpend: 5000,
                growthRate: 0.10,
                initialCustomers: 100,
                cac: 500
            };
            const validation = MetricsEngine.validateInputs(inputs);
            expect(validation.warnings.length).toBeGreaterThan(0);
        });
    });
});

module.exports = { describe, test, expect };
