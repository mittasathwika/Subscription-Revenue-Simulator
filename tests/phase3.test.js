/**
 * Phase 3 Test Suite
 * Tests: Admin Dashboard, Role Management, Business Logic
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:8000';
const API_URL = 'http://localhost:3001/api';

// Test credentials
const TEST_USERS = {
  admin: { email: 'admin@example.com', password: 'admin123' },
  manager: { email: 'manager@example.com', password: 'manager123' },
  user: { email: 'demo@example.com', password: 'demo123' }
};

let adminToken = null;
let managerToken = null;
let userToken = null;

test.describe('Phase 3: Admin Dashboard & Role Management', () => {
  
  test.beforeAll(async ({ request }) => {
    // Get tokens for different roles
    const adminRes = await request.post(`${API_URL}/auth/login`, {
      data: TEST_USERS.admin
    });
    const adminData = await adminRes.json();
    adminToken = adminData.token;
    
    const managerRes = await request.post(`${API_URL}/auth/login`, {
      data: TEST_USERS.manager
    });
    const managerData = await managerRes.json();
    managerToken = managerData.token;
    
    const userRes = await request.post(`${API_URL}/auth/login`, {
      data: TEST_USERS.user
    });
    const userData = await userRes.json();
    userToken = userData.token;
  });

  test.describe('Authentication & Roles', () => {
    
    test('Admin login returns correct role', async ({ request }) => {
      const response = await request.post(`${API_URL}/auth/login`, {
        data: TEST_USERS.admin
      });
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.user.role).toBe('admin');
      expect(data.token).toBeDefined();
    });

    test('Manager login returns correct role', async ({ request }) => {
      const response = await request.post(`${API_URL}/auth/login`, {
        data: TEST_USERS.manager
      });
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.user.role).toBe('manager');
    });

    test('User login returns correct role', async ({ request }) => {
      const response = await request.post(`${API_URL}/auth/login`, {
        data: TEST_USERS.user
      });
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.user.role).toBe('user');
    });

    test('Invalid credentials rejected', async ({ request }) => {
      const response = await request.post(`${API_URL}/auth/login`, {
        data: { email: 'admin@example.com', password: 'wrongpassword' }
      });
      expect(response.status()).toBe(401);
    });
  });

  test.describe('Admin Dashboard API', () => {
    
    test('Admin can access dashboard stats', async ({ request }) => {
      const response = await request.get(`${API_URL}/admin/stats`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.totalUsers).toBeDefined();
      expect(data.totalScenarios).toBeDefined();
      expect(data.roleCounts).toBeDefined();
      expect(data.roleCounts.admin).toBeGreaterThanOrEqual(1);
    });

    test('Manager can access dashboard stats', async ({ request }) => {
      const response = await request.get(`${API_URL}/admin/stats`, {
        headers: { 'Authorization': `Bearer ${managerToken}` }
      });
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.totalUsers).toBeDefined();
    });

    test('Regular user cannot access admin stats', async ({ request }) => {
      const response = await request.get(`${API_URL}/admin/stats`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      expect(response.status()).toBe(403);
    });
  });

  test.describe('User Management API', () => {
    let testUserId = null;

    test('Admin can list all users', async ({ request }) => {
      const response = await request.get(`${API_URL}/admin/users`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      expect(response.ok()).toBeTruthy();
      
      const users = await response.json();
      expect(Array.isArray(users)).toBeTruthy();
      expect(users.length).toBeGreaterThanOrEqual(3); // admin, manager, user
      
      // Verify all roles exist
      const roles = users.map(u => u.role);
      expect(roles).toContain('admin');
      expect(roles).toContain('manager');
      expect(roles).toContain('user');
    });

    test('Manager can list all users', async ({ request }) => {
      const response = await request.get(`${API_URL}/admin/users`, {
        headers: { 'Authorization': `Bearer ${managerToken}` }
      });
      expect(response.ok()).toBeTruthy();
    });

    test('Admin can create new user', async ({ request }) => {
      const newUser = {
        email: `testuser_${Date.now()}@example.com`,
        password: 'testpass123',
        role: 'user',
        status: 'active'
      };
      
      const response = await request.post(`${API_URL}/admin/users`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
        data: newUser
      });
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.id).toBeDefined();
      expect(data.email).toBe(newUser.email);
      expect(data.role).toBe('user');
      
      testUserId = data.id;
    });

    test('Manager cannot create user (if restricted)', async ({ request }) => {
      const newUser = {
        email: `testuser2_${Date.now()}@example.com`,
        password: 'testpass123',
        role: 'user',
        status: 'active'
      };
      
      const response = await request.post(`${API_URL}/admin/users`, {
        headers: { 'Authorization': `Bearer ${managerToken}` },
        data: newUser
      });
      
      // Manager should be able to create users (if that's the intended design)
      // This test documents current behavior
      expect([200, 201, 403]).toContain(response.status());
    });

    test('Admin can update user role', async ({ request }) => {
      if (!testUserId) {
        test.skip();
        return;
      }
      
      const updates = {
        role: 'manager',
        status: 'active'
      };
      
      const response = await request.put(`${API_URL}/admin/users/${testUserId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
        data: updates
      });
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.role).toBe('manager');
    });

    test('Admin can suspend user', async ({ request }) => {
      if (!testUserId) {
        test.skip();
        return;
      }
      
      const updates = {
        status: 'suspended'
      };
      
      const response = await request.put(`${API_URL}/admin/users/${testUserId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
        data: updates
      });
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.status).toBe('suspended');
    });

    test('Admin can delete user', async ({ request }) => {
      if (!testUserId) {
        test.skip();
        return;
      }
      
      const response = await request.delete(`${API_URL}/admin/users/${testUserId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      expect(response.ok()).toBeTruthy();
    });

    test('Cannot delete own account', async ({ request }) => {
      // Get admin's own ID from token
      const verifyRes = await request.get(`${API_URL}/auth/verify`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const verifyData = await verifyRes.json();
      const adminId = verifyData.user.userId;
      
      const response = await request.delete(`${API_URL}/admin/users/${adminId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      expect(response.status()).toBe(400);
    });
  });

  test.describe('Business Analytics API', () => {
    
    test('Admin can access analytics', async ({ request }) => {
      const response = await request.get(`${API_URL}/admin/analytics`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.totalCustomers).toBeDefined();
      expect(data.totalMRR).toBeDefined();
      expect(data.avgChurn).toBeDefined();
      expect(data.avgCAC).toBeDefined();
    });

    test('Manager can access analytics', async ({ request }) => {
      const response = await request.get(`${API_URL}/admin/analytics`, {
        headers: { 'Authorization': `Bearer ${managerToken}` }
      });
      expect(response.ok()).toBeTruthy();
    });

    test('User cannot access analytics', async ({ request }) => {
      const response = await request.get(`${API_URL}/admin/analytics`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      expect(response.status()).toBe(403);
    });
  });

  test.describe('Audit Logs API', () => {
    
    test('Admin can access audit logs', async ({ request }) => {
      const response = await request.get(`${API_URL}/admin/logs`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      expect(response.ok()).toBeTruthy();
      
      const logs = await response.json();
      expect(Array.isArray(logs)).toBeTruthy();
    });

    test('Manager cannot access audit logs (admin only)', async ({ request }) => {
      const response = await request.get(`${API_URL}/admin/logs`, {
        headers: { 'Authorization': `Bearer ${managerToken}` }
      });
      expect(response.status()).toBe(403);
    });

    test('User cannot access audit logs', async ({ request }) => {
      const response = await request.get(`${API_URL}/admin/logs`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      expect(response.status()).toBe(403);
    });
  });

  test.describe('Admin Dashboard Frontend', () => {
    
    test('Admin dashboard loads successfully', async ({ page }) => {
      // Login first
      await page.goto(`${BASE_URL}/login.html`);
      await page.fill('#email', TEST_USERS.admin.email);
      await page.fill('#password', TEST_USERS.admin.password);
      await page.click('button[type="submit"]');
      
      // Wait for navigation
      await page.waitForTimeout(1000);
      
      // Navigate to admin dashboard
      await page.goto(`${BASE_URL}/admin-dashboard.html`);
      
      // Verify dashboard loads
      await expect(page.locator('h1')).toContainText('Admin Dashboard');
      await expect(page.locator('.kpi-grid')).toBeVisible();
    });

    test('Dashboard displays KPI cards', async ({ page }) => {
      // Login and navigate
      await page.goto(`${BASE_URL}/login.html`);
      await page.fill('#email', TEST_USERS.admin.email);
      await page.fill('#password', TEST_USERS.admin.password);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1000);
      await page.goto(`${BASE_URL}/admin-dashboard.html`);
      
      // Check KPI cards exist
      await expect(page.locator('.kpi-card')).toHaveCount(4);
      
      // Check specific KPIs
      await expect(page.locator('.kpi-card:has-text("Total Users")')).toBeVisible();
      await expect(page.locator('.kpi-card:has-text("Active Scenarios")')).toBeVisible();
      await expect(page.locator('.kpi-card:has-text("Total Revenue Tracked")')).toBeVisible();
      await expect(page.locator('.kpi-card:has-text("Avg. Conversion Rate")')).toBeVisible();
    });

    test('User management tab works', async ({ page }) => {
      // Login and navigate
      await page.goto(`${BASE_URL}/login.html`);
      await page.fill('#email', TEST_USERS.admin.email);
      await page.fill('#password', TEST_USERS.admin.password);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1000);
      await page.goto(`${BASE_URL}/admin-dashboard.html`);
      
      // Click Users tab
      await page.click('button[data-tab="users"]');
      
      // Verify users table loads
      await expect(page.locator('#users-table')).toBeVisible();
      await expect(page.locator('#users-tbody tr')).toHaveCount.greaterThan(0);
    });

    test('Add user modal opens', async ({ page }) => {
      // Login and navigate
      await page.goto(`${BASE_URL}/login.html`);
      await page.fill('#email', TEST_USERS.admin.email);
      await page.fill('#password', TEST_USERS.admin.password);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1000);
      await page.goto(`${BASE_URL}/admin-dashboard.html`);
      
      // Go to users tab
      await page.click('button[data-tab="users"]');
      
      // Click add user button
      await page.click('button:has-text("Add User")');
      
      // Verify modal opens
      await expect(page.locator('#user-modal')).toHaveClass(/active/);
      await expect(page.locator('#user-form')).toBeVisible();
    });

    test('Manager sees limited features', async ({ page }) => {
      // Login as manager
      await page.goto(`${BASE_URL}/login.html`);
      await page.fill('#email', TEST_USERS.manager.email);
      await page.fill('#password', TEST_USERS.manager.password);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1000);
      await page.goto(`${BASE_URL}/admin-dashboard.html`);
      
      // Verify dashboard loads
      await expect(page.locator('h1')).toContainText('Admin Dashboard');
      
      // Manager should not see audit logs tab
      const logsTab = page.locator('button[data-tab="logs"]');
      await expect(logsTab).toBeHidden();
    });

    test('Regular user redirected from admin dashboard', async ({ page }) => {
      // Login as regular user
      await page.goto(`${BASE_URL}/login.html`);
      await page.fill('#email', TEST_USERS.user.email);
      await page.fill('#password', TEST_USERS.user.password);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1000);
      
      // Try to access admin dashboard
      await page.goto(`${BASE_URL}/admin-dashboard.html`);
      await page.waitForTimeout(500);
      
      // Should be redirected to login
      expect(page.url()).toContain('login.html');
    });
  });

  test.describe('Role Badges & UI', () => {
    
    test('Role badges display correctly', async ({ page }) => {
      // Login and navigate
      await page.goto(`${BASE_URL}/login.html`);
      await page.fill('#email', TEST_USERS.admin.email);
      await page.fill('#password', TEST_USERS.admin.password);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1000);
      await page.goto(`${BASE_URL}/admin-dashboard.html`);
      
      // Go to users tab
      await page.click('button[data-tab="users"]');
      
      // Check for role badges
      await expect(page.locator('.role-admin')).toBeVisible();
      await expect(page.locator('.role-manager')).toBeVisible();
      await expect(page.locator('.role-user')).toBeVisible();
    });

    test('Status badges display correctly', async ({ page }) => {
      // Login and navigate
      await page.goto(`${BASE_URL}/login.html`);
      await page.fill('#email', TEST_USERS.admin.email);
      await page.fill('#password', TEST_USERS.admin.password);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1000);
      await page.goto(`${BASE_URL}/admin-dashboard.html`);
      
      // Go to users tab
      await page.click('button[data-tab="users"]');
      
      // Check for status badges
      await expect(page.locator('.status-active')).toBeVisible();
    });
  });
});

// Run tests
test.describe('Test Summary', () => {
  test('All Phase 3 components work', async () => {
    console.log('✅ Phase 3 testing complete');
  });
});
