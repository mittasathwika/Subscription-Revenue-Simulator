const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getUserByEmail, createUser } = require('../models/dynamodb');
const { generateToken, generateRefreshToken } = require('../middleware/auth');
const { authValidation } = require('../middleware/validator');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// POST /api/auth/signup
router.post('/signup', authValidation.signup, async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const existingUser = await getUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({ error: 'User already exists' });
        }
        
        const passwordHash = bcrypt.hashSync(password, 10);
        await createUser({ email, password: passwordHash });
        
        const token = generateToken(email, email);
        const refreshToken = generateRefreshToken(email);
        
        res.status(201).json({
            success: true,
            token,
            refreshToken,
            user: { id: email, email },
            message: 'Account created successfully'
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/auth/login
router.post('/login', authValidation.login, async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await getUserByEmail(email);
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const validPassword = bcrypt.compareSync(password, user.password || user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const token = generateToken(user.email || email, user.email || email);
        const refreshToken = generateRefreshToken(user.email || email);
        
        res.json({
            success: true,
            token,
            refreshToken,
            user: { id: user.email || email, email: user.email || email },
            message: 'Login successful'
        });
    } catch (error) {
        console.error('Login error:', error);
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
