const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * JWT Authentication Middleware
 * Verifies token and attaches user info to request
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
        return res.status(401).json({ 
            error: 'Access denied. No token provided.',
            code: 'NO_TOKEN'
        });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        req.userId = decoded.userId;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                error: 'Token expired. Please login again.',
                code: 'TOKEN_EXPIRED'
            });
        }
        return res.status(403).json({ 
            error: 'Invalid token.',
            code: 'INVALID_TOKEN'
        });
    }
};

/**
 * Optional Authentication Middleware
 * Attaches user info if token exists, but doesn't require it
 */
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
            req.userId = decoded.userId;
        } catch (error) {
            // Invalid token is OK for optional auth
            req.user = null;
            req.userId = null;
        }
    } else {
        req.user = null;
        req.userId = null;
    }
    
    next();
};

/**
 * Generate JWT Token
 */
const generateToken = (userId, email, firstName, lastName, expiresIn = '7d') => {
    return jwt.sign({ userId, email, firstName, lastName }, JWT_SECRET, { expiresIn });
};

/**
 * Generate Refresh Token
 */
const generateRefreshToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
};

module.exports = {
    authenticateToken,
    optionalAuth,
    generateToken,
    generateRefreshToken,
    JWT_SECRET
};
