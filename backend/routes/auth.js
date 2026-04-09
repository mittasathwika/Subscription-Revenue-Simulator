const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../models/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Authentication middleware
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        
        req.user = decoded;
        next();
    });
};

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
    try {
        const db = getDatabase();
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        // Check if user exists
        db.get('SELECT id FROM users WHERE email = ?', [email], (err, row) => {
            if (row) {
                return res.status(409).json({ error: 'User already exists' });
            }
            
            const userId = uuidv4();
            const passwordHash = bcrypt.hashSync(password, 10);
            
            db.run(
                'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)',
                [userId, email, passwordHash],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    
                    const token = jwt.sign({ userId, email, role: 'user', status: 'active' }, JWT_SECRET, { expiresIn: '24h' });
                    
                    res.status(201).json({
                        success: true,
                        token,
                        user: { id: userId, email, role: 'user', status: 'active' }
                    });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const db = getDatabase();
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
            if (err || !user) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            
            const validPassword = bcrypt.compareSync(password, user.password_hash);
            if (!validPassword) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            
            // Update last login
            db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
            
            const token = jwt.sign({ 
                userId: user.id, 
                email, 
                role: user.role || 'user',
                status: user.status || 'active'
            }, JWT_SECRET, { expiresIn: '24h' });
            
            res.json({
                success: true,
                token,
                user: { 
                    id: user.id, 
                    email: user.email,
                    role: user.role || 'user',
                    status: user.status || 'active'
                }
            });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/auth/verify - Verify token
router.get('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(401).json({ error: 'Invalid token' });
            }
            
            res.json({ valid: true, user: decoded });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = { router, authenticate };
