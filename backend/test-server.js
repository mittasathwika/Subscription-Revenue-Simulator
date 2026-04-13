/**
 * Simple Test Server for Phase 3 Testing
 * Uses in-memory storage instead of SQLite
 */

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3001;
const JWT_SECRET = 'test-secret-key';

// In-memory storage
const db = {
  users: [
    { id: 'admin-001', email: 'admin@example.com', password_hash: bcrypt.hashSync('admin123', 10), role: 'admin', status: 'active', created_at: new Date().toISOString(), last_login: null },
    { id: 'manager-001', email: 'manager@example.com', password_hash: bcrypt.hashSync('manager123', 10), role: 'manager', status: 'active', created_at: new Date().toISOString(), last_login: null },
    { id: 'user-001', email: 'demo@example.com', password_hash: bcrypt.hashSync('demo123', 10), role: 'user', status: 'active', created_at: new Date().toISOString(), last_login: null }
  ],
  scenarios: [],
  metrics: [
    { id: 'm-001', user_id: 'user-001', customers: 150, monthly_revenue: 14850, churn_rate: 0.04, ad_spend: 6000, cac: 450 }
  ],
  admin_logs: []
};

app.use(cors());
app.use(express.json());

// Authentication middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'manager') {
    return res.status(403).json({ error: 'Admin/Manager access required' });
  }
  next();
};

const requireAdminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Auth routes
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.users.find(u => u.email === email);
  
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  user.last_login = new Date().toISOString();
  
  const token = jwt.sign({ 
    userId: user.id, 
    email, 
    role: user.role,
    status: user.status 
  }, JWT_SECRET, { expiresIn: '24h' });
  
  res.json({
    success: true,
    token,
    user: { id: user.id, email: user.email, role: user.role, status: user.status }
  });
});

app.post('/api/auth/signup', (req, res) => {
  const { email, password } = req.body;
  
  if (db.users.find(u => u.email === email)) {
    return res.status(409).json({ error: 'User exists' });
  }
  
  const user = {
    id: uuidv4(),
    email,
    password_hash: bcrypt.hashSync(password, 10),
    role: 'user',
    status: 'active',
    created_at: new Date().toISOString(),
    last_login: null
  };
  
  db.users.push(user);
  
  const token = jwt.sign({ userId: user.id, email, role: 'user', status: 'active' }, JWT_SECRET, { expiresIn: '24h' });
  res.status(201).json({ success: true, token, user: { id: user.id, email, role: 'user', status: 'active' } });
});

// Admin routes
app.get('/api/admin/stats', authenticate, requireAdmin, (req, res) => {
  const totalRevenue = db.metrics.reduce((sum, m) => sum + m.monthly_revenue, 0);
  const roleCounts = { admin: 0, manager: 0, user: 0 };
  db.users.filter(u => u.status === 'active').forEach(u => roleCounts[u.role]++);
  
  res.json({
    totalUsers: db.users.length,
    totalScenarios: db.scenarios.length,
    suspendedCount: db.users.filter(u => u.status === 'suspended').length,
    totalRevenue,
    avgChurnRate: 4.5,
    roleCounts
  });
});

app.get('/api/admin/users', authenticate, requireAdmin, (req, res) => {
  res.json(db.users.map(u => ({
    id: u.id,
    email: u.email,
    role: u.role,
    status: u.status,
    created_at: u.created_at,
    last_login: u.last_login
  })));
});

app.post('/api/admin/users', authenticate, requireAdmin, (req, res) => {
  const { email, password, role, status } = req.body;
  
  if (db.users.find(u => u.email === email)) {
    return res.status(409).json({ error: 'Email exists' });
  }
  
  const user = {
    id: uuidv4(),
    email,
    password_hash: bcrypt.hashSync(password, 10),
    role: role || 'user',
    status: status || 'active',
    created_at: new Date().toISOString(),
    last_login: null
  };
  
  db.users.push(user);
  
  // Log action
  db.admin_logs.push({
    id: uuidv4(),
    admin_id: req.user.userId,
    action: 'CREATE_USER',
    target_type: 'user',
    target_id: user.id,
    details: `Created user ${email}`,
    created_at: new Date().toISOString()
  });
  
  res.status(201).json({ id: user.id, email, role: user.role, status: user.status });
});

app.put('/api/admin/users/:id', authenticate, requireAdmin, (req, res) => {
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  if (req.body.email) user.email = req.body.email;
  if (req.body.password) user.password_hash = bcrypt.hashSync(req.body.password, 10);
  if (req.body.role) user.role = req.body.role;
  if (req.body.status) user.status = req.body.status;
  
  res.json({ id: user.id, email: user.email, role: user.role, status: user.status });
});

app.delete('/api/admin/users/:id', authenticate, requireAdminOnly, (req, res) => {
  if (req.params.id === req.user.userId) {
    return res.status(400).json({ error: 'Cannot delete own account' });
  }
  
  const index = db.users.findIndex(u => u.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'User not found' });
  
  db.users.splice(index, 1);
  res.json({ message: 'User deleted' });
});

app.get('/api/admin/analytics', authenticate, requireAdmin, (req, res) => {
  const totalMRR = db.metrics.reduce((sum, m) => sum + m.monthly_revenue, 0);
  const totalCustomers = db.metrics.reduce((sum, m) => sum + m.customers, 0);
  const avgChurn = db.metrics.reduce((sum, m) => sum + m.churn_rate, 0) / db.metrics.length || 0;
  const avgCAC = db.metrics.reduce((sum, m) => sum + m.cac, 0) / db.metrics.length || 0;
  
  res.json({
    totalCustomers,
    totalMRR,
    avgChurn: (avgChurn * 100).toFixed(2),
    avgCAC: Math.round(avgCAC),
    totalScenarios: db.scenarios.length,
    totalUsers: db.users.filter(u => u.role === 'user').length,
    revenueTrend: []
  });
});

app.get('/api/admin/logs', authenticate, requireAdminOnly, (req, res) => {
  const logs = db.admin_logs.map(log => {
    const admin = db.users.find(u => u.id === log.admin_id);
    return {
      ...log,
      admin_email: admin?.email || 'Unknown'
    };
  });
  res.json(logs);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
const server = app.listen(PORT, () => {
  console.log('🚀 Test Server running on port', PORT);
  console.log('📊 Ready for Phase 3 testing');
});

module.exports = { app, server, db };
