/**
 * Test Runner
 * Runs all test suites and generates report
 */

class TestRunner {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            skipped: 0,
            total: 0,
            suites: []
        };
        this.currentSuite = null;
    }

    describe(name, fn) {
        this.currentSuite = {
            name,
            tests: [],
            passed: 0,
            failed: 0
        };
        
        fn();
        
        this.results.suites.push(this.currentSuite);
        this.results.total += this.currentSuite.tests.length;
        this.results.passed += this.currentSuite.passed;
        this.results.failed += this.currentSuite.failed;
    }

    test(name, fn) {
        const startTime = Date.now();
        
        try {
            fn();
            this.currentSuite.tests.push({
                name,
                status: 'passed',
                duration: Date.now() - startTime
            });
            this.currentSuite.passed++;
        } catch (error) {
            this.currentSuite.tests.push({
                name,
                status: 'failed',
                error: error.message,
                duration: Date.now() - startTime
            });
            this.currentSuite.failed++;
        }
    }

    beforeEach(fn) {
        // Store for execution before each test
        this._beforeEach = fn;
    }

    expect(value) {
        return {
            toBe: (expected) => {
                if (value !== expected) {
                    throw new Error(`Expected ${expected}, got ${value}`);
                }
            },
            toBeGreaterThan: (expected) => {
                if (!(value > expected)) {
                    throw new Error(`Expected ${value} to be greater than ${expected}`);
                }
            },
            toBeGreaterThanOrEqual: (expected) => {
                if (!(value >= expected)) {
                    throw new Error(`Expected ${value} to be >= ${expected}`);
                }
            },
            toBeLessThan: (expected) => {
                if (!(value < expected)) {
                    throw new Error(`Expected ${value} to be less than ${expected}`);
                }
            },
            toBeCloseTo: (expected, precision) => {
                const diff = Math.abs(value - expected);
                if (diff > Math.pow(10, -precision)) {
                    throw new Error(`Expected ${value} to be close to ${expected}`);
                }
            },
            toBeDefined: () => {
                if (value === undefined) {
                    throw new Error(`Expected value to be defined`);
                }
            },
            toBeNull: () => {
                if (value !== null) {
                    throw new Error(`Expected null, got ${value}`);
                }
            },
            toBeTruthy: () => {
                if (!value) {
                    throw new Error(`Expected truthy value, got ${value}`);
                }
            },
            toBeFalsy: () => {
                if (value) {
                    throw new Error(`Expected falsy value, got ${value}`);
                }
            },
            toHaveLength: (expected) => {
                if (value.length !== expected) {
                    throw new Error(`Expected length ${expected}, got ${value.length}`);
                }
            },
            toHaveProperty: (prop) => {
                if (!(prop in value)) {
                    throw new Error(`Expected object to have property ${prop}`);
                }
            },
            toContain: (expected) => {
                if (!value.includes(expected)) {
                    throw new Error(`Expected ${value} to contain ${expected}`);
                }
            },
            toEqual: (expected) => {
                if (JSON.stringify(value) !== JSON.stringify(expected)) {
                    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(value)}`);
                }
            }
        };
    }

    run() {
        console.log('\n' + '='.repeat(60));
        console.log('TEST SUITE RESULTS');
        console.log('='.repeat(60) + '\n');

        this.results.suites.forEach(suite => {
            console.log(`\n📦 ${suite.name}`);
            console.log('-'.repeat(40));
            
            suite.tests.forEach(test => {
                const icon = test.status === 'passed' ? '✅' : '❌';
                const duration = `(${test.duration}ms)`;
                console.log(`  ${icon} ${test.name} ${duration}`);
                
                if (test.error) {
                    console.log(`     Error: ${test.error}`);
                }
            });
            
            console.log(`\n  Suite: ${suite.passed} passed, ${suite.failed} failed`);
        });

        console.log('\n' + '='.repeat(60));
        console.log(`TOTAL: ${this.results.total} tests`);
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`📊 Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);
        console.log('='.repeat(60) + '\n');

        return this.results;
    }
}

// Global test functions for browser
globalThis.describe = (name, fn) => testRunner.describe(name, fn);
globalThis.test = (name, fn) => testRunner.test(name, fn);
globalThis.beforeEach = (fn) => testRunner.beforeEach(fn);
globalThis.expect = (value) => testRunner.expect(value);

// Initialize runner
const testRunner = new TestRunner();

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TestRunner, testRunner };
}
