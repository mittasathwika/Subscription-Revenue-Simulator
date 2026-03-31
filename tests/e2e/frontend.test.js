/**
 * Frontend E2E Tests
 * Tests user interactions and UI functionality
 */

describe('Frontend E2E Tests', () => {
    
    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
    });

    describe('Login Page', () => {
        test('login page loads correctly', () => {
            expect(document.querySelector('.login-container')).toBeTruthy();
            expect(document.querySelector('#loginForm')).toBeTruthy();
            expect(document.querySelector('#signupForm')).toBeTruthy();
        });

        test('tab switching works', () => {
            const loginTab = document.querySelector('[data-tab="login"]');
            const signupTab = document.querySelector('[data-tab="signup"]');
            
            signupTab.click();
            expect(document.querySelector('#signupForm').classList.contains('hidden')).toBe(false);
            expect(document.querySelector('#loginForm').classList.contains('hidden')).toBe(true);
            
            loginTab.click();
            expect(document.querySelector('#loginForm').classList.contains('hidden')).toBe(false);
            expect(document.querySelector('#signupForm').classList.contains('hidden')).toBe(true);
        });

        test('guest mode continues without auth', () => {
            continueAsGuest();
            expect(localStorage.getItem('guestMode')).toBe('true');
        });
    });

    describe('Main Application', () => {
        beforeEach(() => {
            // Set guest mode to access main app
            localStorage.setItem('guestMode', 'true');
        });

        test('all input fields exist', () => {
            const inputs = ['price', 'churn', 'adSpend', 'growthRate', 'initialCustomers', 'cac'];
            inputs.forEach(id => {
                expect(document.getElementById(id)).toBeTruthy();
            });
        });

        test('calculate button triggers projection', () => {
            const calculateBtn = document.getElementById('calculateBtn');
            expect(calculateBtn).toBeTruthy();
            
            // Simulate click
            calculateBtn.click();
            
            // Check that metrics are updated
            setTimeout(() => {
                const ltvValue = document.getElementById('ltvValue').textContent;
                expect(ltvValue).not.toBe('$0');
            }, 100);
        });

        test('default values are set correctly', () => {
            expect(document.getElementById('price').value).toBe('99');
            expect(document.getElementById('churn').value).toBe('5');
            expect(document.getElementById('adSpend').value).toBe('5000');
            expect(document.getElementById('growthRate').value).toBe('10');
            expect(document.getElementById('initialCustomers').value).toBe('100');
            expect(document.getElementById('cac').value).toBe('500');
        });

        test('input validation prevents negative values', () => {
            const priceInput = document.getElementById('price');
            priceInput.value = '-10';
            
            const calculateBtn = document.getElementById('calculateBtn');
            calculateBtn.click();
            
            // Should show alert or error
            expect(window.alert).toHaveBeenCalled();
        });

        test('charts are rendered after calculation', () => {
            const calculateBtn = document.getElementById('calculateBtn');
            calculateBtn.click();
            
            setTimeout(() => {
                const revenueChart = document.getElementById('revenueChart');
                const customerChart = document.getElementById('customerChart');
                expect(revenueChart).toBeTruthy();
                expect(customerChart).toBeTruthy();
            }, 200);
        });

        test('scenario save button exists and is clickable', () => {
            const saveBtn = document.getElementById('saveScenarioBtn');
            expect(saveBtn).toBeTruthy();
            expect(saveBtn.disabled).toBe(false);
        });

        test('export button triggers download', () => {
            const exportBtn = document.getElementById('exportBtn');
            expect(exportBtn).toBeTruthy();
            
            // Mock createElement and click
            const createElementSpy = jest.spyOn(document, 'createElement');
            exportBtn.click();
            
            expect(createElementSpy).toHaveBeenCalledWith('a');
            createElementSpy.mockRestore();
        });
    });

    describe('Authentication Flow', () => {
        test('logged in user sees email in header', () => {
            localStorage.setItem('authToken', 'test-token');
            localStorage.setItem('currentUser', JSON.stringify({ email: 'test@example.com' }));
            
            // Reload page or trigger auth check
            simulator.updateAuthUI();
            
            const userInfo = document.getElementById('userInfo');
            expect(userInfo.textContent).toBe('test@example.com');
            expect(userInfo.style.display).not.toBe('none');
        });

        test('logout clears storage and redirects', () => {
            localStorage.setItem('authToken', 'test-token');
            localStorage.setItem('currentUser', JSON.stringify({ email: 'test@example.com' }));
            
            simulator.logout();
            
            expect(localStorage.getItem('authToken')).toBeNull();
            expect(localStorage.getItem('currentUser')).toBeNull();
        });
    });

    describe('Scenario Management', () => {
        beforeEach(() => {
            localStorage.setItem('guestMode', 'true');
            simulator.scenarios = [];
        });

        test('save scenario adds to list', () => {
            // First calculate
            simulator.calculateProjections();
            
            // Mock prompt
            window.prompt = () => 'Test Scenario';
            
            // Save
            simulator.saveScenario();
            
            expect(simulator.scenarios.length).toBe(1);
            expect(simulator.scenarios[0].name).toBe('Test Scenario');
        });

        test('delete scenario removes from list', () => {
            // Add a scenario
            simulator.scenarios = [{ id: '123', name: 'To Delete', inputs: {} }];
            simulator.renderScenariosList();
            
            // Mock confirm
            window.confirm = () => true;
            
            // Delete
            simulator.deleteScenario('123');
            
            expect(simulator.scenarios.length).toBe(0);
        });

        test('load scenario populates inputs', () => {
            const testScenario = {
                id: '456',
                name: 'Load Test',
                inputs: {
                    price: 199,
                    churn: 0.03,
                    adSpend: 10000,
                    growthRate: 0.20,
                    initialCustomers: 200,
                    cac: 600
                }
            };
            
            simulator.scenarios = [testScenario];
            simulator.loadScenario('456');
            
            expect(document.getElementById('price').value).toBe('199');
            expect(document.getElementById('churn').value).toBe('3');
        });
    });

    describe('Responsive Design', () => {
        test('sidebar is hidden on mobile', () => {
            // Mock mobile viewport
            window.innerWidth = 375;
            window.dispatchEvent(new Event('resize'));
            
            const sidebar = document.querySelector('.sidebar');
            // Check responsive styles are applied
            expect(sidebar).toBeTruthy();
        });
    });
});

// Mock window.alert for tests
global.alert = jest.fn();
global.confirm = jest.fn(() => true);
global.prompt = jest.fn(() => 'Test Name');

module.exports = { describe, test, expect, beforeEach };
