const rateLimit = require('express-rate-limit');

/**
 * General API Rate Limiter
 * 100 requests per 15 minutes per IP
 */
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many requests from this IP. Please try again later.',
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
    }
});

/**
 * Strict Rate Limiter for Authentication Endpoints
 * 20 requests per hour per IP
 */
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // limit each IP to 20 requests per windowMs
    message: {
        error: 'Too many authentication attempts. Please try again after an hour.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many authentication attempts. Please try again after an hour.',
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
    }
});

/**
 * Medium Rate Limiter for Calculation Endpoints
 * 50 requests per 15 minutes per IP
 */
const calculationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // limit each IP to 50 requests per windowMs
    message: {
        error: 'Too many calculation requests. Please try again later.',
        code: 'CALC_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Custom rate limiter factory
 */
const createRateLimiter = (windowMs, max, message) => {
    return rateLimit({
        windowMs,
        max,
        message: {
            error: message || 'Too many requests. Please try again later.',
            code: 'RATE_LIMIT_EXCEEDED'
        },
        standardHeaders: true,
        legacyHeaders: false
    });
};

module.exports = {
    generalLimiter,
    authLimiter,
    calculationLimiter,
    createRateLimiter
};
