const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const helmet = require('helmet');
const hpp = require('hpp');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Trust proxy - required for express-rate-limit behind load balancer
app.set('trust proxy', 1);

// Security Middleware
const { helmetConfig, helmetConfigDev } = require('./security/helmetConfig');
app.use(helmet(NODE_ENV === 'production' ? helmetConfig : helmetConfigDev));

// Prevent HTTP Parameter Pollution
app.use(hpp());

// CORS Configuration
const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS 
        ? process.env.ALLOWED_ORIGINS.split(',') 
        : [
            'http://localhost:3000', 
            'http://localhost:3001', 
            'http://127.0.0.1:3000',
            'http://subscription-revenue-simulator-697697503244.s3-website-us-east-1.amazonaws.com'
          ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-Requested-With', 'Accept']
};
app.use(cors(corsOptions));

// Body Parsing
app.use(express.json({ limit: '10kb' })); // Limit body size to prevent abuse
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Rate Limiting
const { generalLimiter, authLimiter } = require('./middleware/rateLimiter');
app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);

// Database setup
const { initializeDatabase } = require('./models/database');
initializeDatabase();

// Routes
const metricsRoutes = require('./routes/metrics');
const scenariosRoutes = require('./routes/scenarios');
const authRoutes = require('./routes/auth');

app.use('/api/metrics', metricsRoutes);
app.use('/api/scenarios', scenariosRoutes);
app.use('/api/auth', authRoutes);

// Security check endpoint
app.get('/api/security', (req, res) => {
    res.json({
        status: 'secure',
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
        headers: {
            contentSecurityPolicy: true,
            xFrameOptions: true,
            hsts: NODE_ENV === 'production',
            xssFilter: true,
            noSniff: true,
            referrerPolicy: true
        }
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        environment: NODE_ENV
    });
});

// API root - list all endpoints
app.get('/api', (req, res) => {
    res.json({
        message: 'Subscription Revenue Simulator API',
        version: '2.0.0',
        endpoints: {
            'GET /api/health': 'Health check',
            'GET /api/metrics': 'Get real metrics',
            'POST /api/metrics/calculate': 'Calculate projections',
            'POST /api/metrics/real': 'Update real metrics',
            'GET /api/metrics/compare': 'Compare real vs simulated',
            'GET /api/scenarios': 'List scenarios',
            'POST /api/scenarios': 'Create scenario',
            'GET /api/scenarios/:id': 'Get scenario',
            'PUT /api/scenarios/:id': 'Update scenario',
            'DELETE /api/scenarios/:id': 'Delete scenario',
            'POST /api/scenarios/compare': 'Compare scenarios',
            'POST /api/auth/login': 'Login',
            'POST /api/auth/signup': 'Sign up',
            'GET /api/auth/verify': 'Verify token'
        }
    });
});

// Serve static files from parent directory
app.use(express.static(path.join(__dirname, '..')));

// Start server
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found',
        code: 'NOT_FOUND',
        path: req.path,
        method: req.method
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    // Don't leak error details in production
    const isDev = NODE_ENV === 'development';
    
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        code: err.code || 'INTERNAL_ERROR',
        ...(isDev && { stack: err.stack })
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🛡️  Environment: ${NODE_ENV}`);
    console.log(`📊 API endpoints:`);
    console.log(`   - GET  /api/health`);
    console.log(`   - GET  /api/security`);
    console.log(`   - GET  /api/metrics`);
    console.log(`   - POST /api/metrics/calculate`);
    console.log(`   - GET  /api/scenarios`);
    console.log(`   - POST /api/scenarios`);
    console.log(`   - POST /api/auth/login`);
});

module.exports = app;
