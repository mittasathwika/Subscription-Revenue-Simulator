/**
 * Phase 3 Manual Test Script
 * Run with: node phase3-manual-test.js
 */

const http = require('http');

const API_URL = 'localhost';
const API_PORT = 3001;

// Test users
const TEST_USERS = {
  admin: { email: 'admin@example.com', password: 'admin123' },
  manager: { email: 'manager@example.com', password: 'manager123' },
  user: { email: 'demo@example.com', password: 'demo123' }
};

// Helper function to make HTTP requests
function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_URL,
      port: API_PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data: responseData });
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

// Test functions
async function runTests() {
  console.log('🧪 Phase 3 Test Suite\n');
  console.log('=' .repeat(50));
  
  let passed = 0;
  let failed = 0;
  let adminToken = null;
  let managerToken = null;
  let userToken = null;
  let testUserId = null;

  // Test 1: Health check
  try {
    console.log('\n1. Testing API Health...');
    const result = await makeRequest('GET', '/api/health');
    if (result.status === 200 && result.data.status === 'ok') {
      console.log('   ✅ Health check passed');
      passed++;
    } else {
      console.log('   ❌ Health check failed');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Health check error:', error.message);
    failed++;
  }

  // Test 2: Admin login
  try {
    console.log('\n2. Testing Admin Login...');
    const result = await makeRequest('POST', '/api/auth/login', TEST_USERS.admin);
    if (result.status === 200 && result.data.user.role === 'admin') {
      console.log('   ✅ Admin login passed');
      console.log('   Role:', result.data.user.role);
      adminToken = result.data.token;
      passed++;
    } else {
      console.log('   ❌ Admin login failed');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Admin login error:', error.message);
    failed++;
  }

  // Test 3: Manager login
  try {
    console.log('\n3. Testing Manager Login...');
    const result = await makeRequest('POST', '/api/auth/login', TEST_USERS.manager);
    if (result.status === 200 && result.data.user.role === 'manager') {
      console.log('   ✅ Manager login passed');
      console.log('   Role:', result.data.user.role);
      managerToken = result.data.token;
      passed++;
    } else {
      console.log('   ❌ Manager login failed');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Manager login error:', error.message);
    failed++;
  }

  // Test 4: User login
  try {
    console.log('\n4. Testing User Login...');
    const result = await makeRequest('POST', '/api/auth/login', TEST_USERS.user);
    if (result.status === 200 && result.data.user.role === 'user') {
      console.log('   ✅ User login passed');
      console.log('   Role:', result.data.user.role);
      userToken = result.data.token;
      passed++;
    } else {
      console.log('   ❌ User login failed');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ User login error:', error.message);
    failed++;
  }

  // Test 5: Invalid credentials
  try {
    console.log('\n5. Testing Invalid Credentials...');
    const result = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@example.com',
      password: 'wrongpassword'
    });
    if (result.status === 401) {
      console.log('   ✅ Invalid credentials rejected');
      passed++;
    } else {
      console.log('   ❌ Should have rejected invalid credentials');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    failed++;
  }

  // Test 6: Admin stats access
  if (adminToken) {
    try {
      console.log('\n6. Testing Admin Stats Access...');
      const result = await makeRequest('GET', '/api/admin/stats', null, adminToken);
      if (result.status === 200 && result.data.totalUsers !== undefined) {
        console.log('   ✅ Admin can access stats');
        console.log('   Total Users:', result.data.totalUsers);
        console.log('   Role Counts:', JSON.stringify(result.data.roleCounts));
        passed++;
      } else {
        console.log('   ❌ Admin stats access failed');
        failed++;
      }
    } catch (error) {
      console.log('   ❌ Admin stats error:', error.message);
      failed++;
    }
  }

  // Test 7: Manager stats access
  if (managerToken) {
    try {
      console.log('\n7. Testing Manager Stats Access...');
      const result = await makeRequest('GET', '/api/admin/stats', null, managerToken);
      if (result.status === 200) {
        console.log('   ✅ Manager can access stats');
        passed++;
      } else {
        console.log('   ❌ Manager stats access failed');
        failed++;
      }
    } catch (error) {
      console.log('   ❌ Manager stats error:', error.message);
      failed++;
    }
  }

  // Test 8: User cannot access admin stats
  if (userToken) {
    try {
      console.log('\n8. Testing User Cannot Access Admin Stats...');
      const result = await makeRequest('GET', '/api/admin/stats', null, userToken);
      if (result.status === 403) {
        console.log('   ✅ User correctly denied access');
        passed++;
      } else {
        console.log('   ❌ User should be denied (status:', result.status + ')');
        failed++;
      }
    } catch (error) {
      console.log('   ❌ Error:', error.message);
      failed++;
    }
  }

  // Test 9: Admin list users
  if (adminToken) {
    try {
      console.log('\n9. Testing Admin List Users...');
      const result = await makeRequest('GET', '/api/admin/users', null, adminToken);
      if (result.status === 200 && Array.isArray(result.data)) {
        console.log('   ✅ Admin can list users');
        console.log('   User count:', result.data.length);
        const roles = result.data.map(u => u.role);
        console.log('   Roles found:', [...new Set(roles)].join(', '));
        passed++;
      } else {
        console.log('   ❌ List users failed');
        failed++;
      }
    } catch (error) {
      console.log('   ❌ List users error:', error.message);
      failed++;
    }
  }

  // Test 10: Admin create user
  if (adminToken) {
    try {
      console.log('\n10. Testing Admin Create User...');
      const newUser = {
        email: `test_${Date.now()}@example.com`,
        password: 'testpass123',
        role: 'user',
        status: 'active'
      };
      const result = await makeRequest('POST', '/api/admin/users', newUser, adminToken);
      if (result.status === 201 && result.data.id) {
        console.log('   ✅ Admin can create user');
        console.log('   Created user ID:', result.data.id);
        testUserId = result.data.id;
        passed++;
      } else {
        console.log('   ❌ Create user failed:', result.data);
        failed++;
      }
    } catch (error) {
      console.log('   ❌ Create user error:', error.message);
      failed++;
    }
  }

  // Test 11: Admin update user role
  if (adminToken && testUserId) {
    try {
      console.log('\n11. Testing Admin Update User Role...');
      const result = await makeRequest('PUT', `/api/admin/users/${testUserId}`, {
        role: 'manager'
      }, adminToken);
      if (result.status === 200 && result.data.role === 'manager') {
        console.log('   ✅ Admin can update user role');
        console.log('   New role:', result.data.role);
        passed++;
      } else {
        console.log('   ❌ Update role failed:', result.data);
        failed++;
      }
    } catch (error) {
      console.log('   ❌ Update role error:', error.message);
      failed++;
    }
  }

  // Test 12: Admin suspend user
  if (adminToken && testUserId) {
    try {
      console.log('\n12. Testing Admin Suspend User...');
      const result = await makeRequest('PUT', `/api/admin/users/${testUserId}`, {
        status: 'suspended'
      }, adminToken);
      if (result.status === 200 && result.data.status === 'suspended') {
        console.log('   ✅ Admin can suspend user');
        console.log('   Status:', result.data.status);
        passed++;
      } else {
        console.log('   ❌ Suspend user failed:', result.data);
        failed++;
      }
    } catch (error) {
      console.log('   ❌ Suspend user error:', error.message);
      failed++;
    }
  }

  // Test 13: Admin delete user
  if (adminToken && testUserId) {
    try {
      console.log('\n13. Testing Admin Delete User...');
      const result = await makeRequest('DELETE', `/api/admin/users/${testUserId}`, null, adminToken);
      if (result.status === 200) {
        console.log('   ✅ Admin can delete user');
        passed++;
      } else {
        console.log('   ❌ Delete user failed:', result.data);
        failed++;
      }
    } catch (error) {
      console.log('   ❌ Delete user error:', error.message);
      failed++;
    }
  }

  // Test 14: Admin analytics access
  if (adminToken) {
    try {
      console.log('\n14. Testing Admin Analytics Access...');
      const result = await makeRequest('GET', '/api/admin/analytics', null, adminToken);
      if (result.status === 200 && result.data.totalMRR !== undefined) {
        console.log('   ✅ Admin can access analytics');
        console.log('   Total MRR:', result.data.totalMRR);
        console.log('   Avg Churn:', result.data.avgChurn + '%');
        passed++;
      } else {
        console.log('   ❌ Analytics access failed');
        failed++;
      }
    } catch (error) {
      console.log('   ❌ Analytics error:', error.message);
      failed++;
    }
  }

  // Test 15: Manager analytics access
  if (managerToken) {
    try {
      console.log('\n15. Testing Manager Analytics Access...');
      const result = await makeRequest('GET', '/api/admin/analytics', null, managerToken);
      if (result.status === 200) {
        console.log('   ✅ Manager can access analytics');
        passed++;
      } else {
        console.log('   ❌ Manager analytics failed');
        failed++;
      }
    } catch (error) {
      console.log('   ❌ Manager analytics error:', error.message);
      failed++;
    }
  }

  // Test 16: User cannot access analytics
  if (userToken) {
    try {
      console.log('\n16. Testing User Cannot Access Analytics...');
      const result = await makeRequest('GET', '/api/admin/analytics', null, userToken);
      if (result.status === 403) {
        console.log('   ✅ User correctly denied analytics access');
        passed++;
      } else {
        console.log('   ❌ User should be denied (status:', result.status + ')');
        failed++;
      }
    } catch (error) {
      console.log('   ❌ Error:', error.message);
      failed++;
    }
  }

  // Test 17: Admin audit logs access
  if (adminToken) {
    try {
      console.log('\n17. Testing Admin Audit Logs Access...');
      const result = await makeRequest('GET', '/api/admin/logs', null, adminToken);
      if (result.status === 200 && Array.isArray(result.data)) {
        console.log('   ✅ Admin can access audit logs');
        console.log('   Log entries:', result.data.length);
        passed++;
      } else {
        console.log('   ❌ Audit logs access failed');
        failed++;
      }
    } catch (error) {
      console.log('   ❌ Audit logs error:', error.message);
      failed++;
    }
  }

  // Test 18: Manager cannot access audit logs
  if (managerToken) {
    try {
      console.log('\n18. Testing Manager Cannot Access Audit Logs...');
      const result = await makeRequest('GET', '/api/admin/logs', null, managerToken);
      if (result.status === 403) {
        console.log('   ✅ Manager correctly denied audit logs');
        passed++;
      } else {
        console.log('   ❌ Manager should be denied (status:', result.status + ')');
        failed++;
      }
    } catch (error) {
      console.log('   ❌ Error:', error.message);
      failed++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All Phase 3 tests passed!');
  } else {
    console.log(`\n⚠️ ${failed} test(s) failed. Please review.`);
  }
}

runTests().catch(console.error);
