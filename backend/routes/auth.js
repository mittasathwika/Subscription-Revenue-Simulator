const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../models/database');
const { generateToken, generateRefreshToken } = require('../middleware/auth');
const { authValidation } = require('../middleware/validator');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// POST /api/auth/signup
router.post('/signup', authValidation.signup, async (req, res) => {
    try {
        const db = getDatabase();
        const { email, password } = req.body;
        
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
                    
                    const token = generateToken(userId, email);
                    const refreshToken = generateRefreshToken(userId);
                    
                    res.status(201).json({
                        success: true,
                        token,
                        refreshToken,
                        user: { id: userId, email },
                        message: 'Account created successfully'
                    });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/auth/login
router.post('/login', authValidation.login, async (req, res) => {
    try {
        const db = getDatabase();
        const { email, password } = req.body;
        
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
            
            const token = generateToken(user.id, email);
            const refreshToken = generateRefreshToken(user.id);
            
            res.json({
                success: true,
                token,
                refreshToken,
                user: { id: user.id, email: user.email },
                message: 'Login successful'
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

module.exports = router;
