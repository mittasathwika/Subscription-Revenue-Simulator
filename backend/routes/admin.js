const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../models/database');
const router = express.Router();

// Middleware to check if user is admin or manager
const requireAdmin = (req, res, next) => {
    const user = req.user;
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
        return res.status(403).json({ error: 'Admin or Manager access required' });
    }
    next();
};

// Middleware to check if user is admin only
const requireAdminOnly = (req, res, next) => {
    const user = req.user;
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// Log admin action
const logAdminAction = (adminId, action, targetType, targetId, details, ipAddress) => {
    const db = getDatabase();
    const logId = uuidv4();
    
    db.run(
        `INSERT INTO admin_logs (id, admin_id, action, target_type, target_id, details, ip_address, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [logId, adminId, action, targetType, targetId, details, ipAddress, new Date().toISOString()],
        (err) => {
            if (err) console.error('Error logging admin action:', err);
        }
    );
};

// GET /api/admin/stats - Dashboard statistics
router.get('/stats', requireAdmin, async (req, res) => {
    const db = getDatabase();
    
    try {
        const stats = await new Promise((resolve, reject) => {
            db.get(`
                SELECT 
                    (SELECT COUNT(*) FROM users) as totalUsers,
                    (SELECT COUNT(*) FROM scenarios) as totalScenarios,
                    (SELECT COUNT(*) FROM users WHERE status = 'suspended') as suspendedCount,
                    (SELECT SUM(monthly_revenue) FROM real_metrics) as totalRevenue,
                    (SELECT AVG(churn_rate) FROM real_metrics) as avgChurnRate
            `, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        // Get role counts
        const roleCounts = await new Promise((resolve, reject) => {
            db.all(`
                SELECT role, COUNT(*) as count 
                FROM users 
                WHERE status = 'active'
                GROUP BY role
            `, (err, rows) => {
                if (err) reject(err);
                else {
                    const counts = { admin: 0, manager: 0, user: 0 };
                    rows.forEach(row => counts[row.role] = row.count);
                    resolve(counts);
                }
            });
        });
        
        res.json({
            totalUsers: stats.totalUsers || 0,
            totalScenarios: stats.totalScenarios || 0,
            suspendedCount: stats.suspendedCount || 0,
            totalRevenue: stats.totalRevenue || 0,
            avgChurnRate: ((stats.avgChurnRate || 0) * 100).toFixed(2),
            roleCounts
        });
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// GET /api/admin/users - List all users
router.get('/users', requireAdmin, async (req, res) => {
    const db = getDatabase();
    
    try {
        const users = await new Promise((resolve, reject) => {
            db.all(`
                SELECT id, email, role, status, created_at, last_login 
                FROM users 
                ORDER BY created_at DESC
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// GET /api/admin/users/:id - Get single user
router.get('/users/:id', requireAdmin, async (req, res) => {
    const db = getDatabase();
    const { id } = req.params;
    
    try {
        const user = await new Promise((resolve, reject) => {
            db.get(`
                SELECT id, email, role, status, created_at, last_login 
                FROM users 
                WHERE id = ?
            `, [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// POST /api/admin/users - Create new user
router.post('/users', requireAdmin, async (req, res) => {
    const db = getDatabase();
    const { email, password, role, status } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Check if email already exists
    const existingUser = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM users WHERE email = ?', [email], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
    
    if (existingUser) {
        return res.status(409).json({ error: 'Email already exists' });
    }
    
    const userId = uuidv4();
    const passwordHash = bcrypt.hashSync(password, 10);
    
    try {
        await new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO users (id, email, password_hash, role, status, created_at, updated_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [userId, email, passwordHash, role || 'user', status || 'active', 
                 new Date().toISOString(), new Date().toISOString()],
                function(err) {
                    if (err) reject(err);
                    else resolve(this);
                }
            );
        });
        
        // Log the action
        logAdminAction(
            req.user.id,
            'CREATE_USER',
            'user',
            userId,
            `Created user ${email} with role ${role || 'user'}`,
            req.ip
        );
        
        res.status(201).json({ 
            id: userId, 
            email, 
            role: role || 'user', 
            status: status || 'active' 
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// PUT /api/admin/users/:id - Update user
router.put('/users/:id', requireAdmin, async (req, res) => {
    const db = getDatabase();
    const { id } = req.params;
    const { email, password, role, status } = req.body;
    
    try {
        // Get current user data
        const currentUser = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (!currentUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Build update query
        const updates = [];
        const params = [];
        
        if (email) {
            updates.push('email = ?');
            params.push(email);
        }
        if (password) {
            updates.push('password_hash = ?');
            params.push(bcrypt.hashSync(password, 10));
        }
        if (role) {
            updates.push('role = ?');
            params.push(role);
        }
        if (status) {
            updates.push('status = ?');
            params.push(status);
        }
        
        updates.push('updated_at = ?');
        params.push(new Date().toISOString());
        params.push(id);
        
        await new Promise((resolve, reject) => {
            db.run(
                `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
                params,
                function(err) {
                    if (err) reject(err);
                    else resolve(this);
                }
            );
        });
        
        // Log the action
        logAdminAction(
            req.user.id,
            'UPDATE_USER',
            'user',
            id,
            `Updated user ${email || currentUser.email}`,
            req.ip
        );
        
        res.json({ 
            id, 
            email: email || currentUser.email,
            role: role || currentUser.role,
            status: status || currentUser.status
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// DELETE /api/admin/users/:id - Delete user (admin only)
router.delete('/users/:id', requireAdminOnly, async (req, res) => {
    const db = getDatabase();
    const { id } = req.params;
    
    try {
        // Get user info before deleting
        const user = await new Promise((resolve, reject) => {
            db.get('SELECT email FROM users WHERE id = ?', [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Prevent deleting yourself
        if (id === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }
        
        await new Promise((resolve, reject) => {
            db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
                if (err) reject(err);
                else resolve(this);
            });
        });
        
        // Log the action
        logAdminAction(
            req.user.id,
            'DELETE_USER',
            'user',
            id,
            `Deleted user ${user.email}`,
            req.ip
        );
        
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// GET /api/admin/analytics - Business analytics
router.get('/analytics', requireAdmin, async (req, res) => {
    const db = getDatabase();
    
    try {
        const analytics = await new Promise((resolve, reject) => {
            db.get(`
                SELECT 
                    (SELECT SUM(customers) FROM real_metrics) as totalCustomers,
                    (SELECT SUM(monthly_revenue) FROM real_metrics) as totalMRR,
                    (SELECT AVG(churn_rate) FROM real_metrics) as avgChurn,
                    (SELECT AVG(cac) FROM real_metrics) as avgCAC,
                    (SELECT COUNT(*) FROM scenarios) as totalScenarios,
                    (SELECT COUNT(*) FROM users WHERE role = 'user') as totalUsers
            `, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        // Get monthly revenue trend
        const revenueTrend = await new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    strftime('%Y-%m', recorded_at) as month,
                    SUM(monthly_revenue) as revenue,
                    SUM(customers) as customers
                FROM real_metrics
                GROUP BY strftime('%Y-%m', recorded_at)
                ORDER BY month DESC
                LIMIT 12
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        res.json({
            totalCustomers: analytics.totalCustomers || 0,
            totalMRR: analytics.totalMRR || 0,
            avgChurn: ((analytics.avgChurn || 0) * 100).toFixed(2),
            avgCAC: Math.round(analytics.avgCAC || 0),
            totalScenarios: analytics.totalScenarios || 0,
            totalUsers: analytics.totalUsers || 0,
            revenueTrend
        });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// GET /api/admin/logs - Audit logs (admin only)
router.get('/logs', requireAdminOnly, async (req, res) => {
    const db = getDatabase();
    
    try {
        const logs = await new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    al.id,
                    al.action,
                    al.target_type,
                    al.target_id,
                    al.details,
                    al.ip_address,
                    al.created_at,
                    u.email as admin_email
                FROM admin_logs al
                LEFT JOIN users u ON al.admin_id = u.id
                ORDER BY al.created_at DESC
                LIMIT 100
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        res.json(logs);
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

// POST /api/admin/users/:id/reset-password - Reset user password
router.post('/users/:id/reset-password', requireAdmin, async (req, res) => {
    const db = getDatabase();
    const { id } = req.params;
    const { newPassword } = req.body;
    
    if (!newPassword) {
        return res.status(400).json({ error: 'New password is required' });
    }
    
    try {
        const user = await new Promise((resolve, reject) => {
            db.get('SELECT email FROM users WHERE id = ?', [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const passwordHash = bcrypt.hashSync(newPassword, 10);
        
        await new Promise((resolve, reject) => {
            db.run(
                'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
                [passwordHash, new Date().toISOString(), id],
                function(err) {
                    if (err) reject(err);
                    else resolve(this);
                }
            );
        });
        
        // Log the action
        logAdminAction(
            req.user.id,
            'RESET_PASSWORD',
            'user',
            id,
            `Reset password for user ${user.email}`,
            req.ip
        );
        
        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

module.exports = { router, requireAdmin, requireAdminOnly, logAdminAction };
