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

// Security Middleware
const { helmetConfig, helmetConfigDev } = require('./security/helmetConfig');
app.use(helmet(NODE_ENV === 'production' ? helmetConfig : helmetConfigDev));

// Prevent HTTP Parameter Pollution
app.use(hpp());

// CORS Configuration
const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS 
        ? process.env.ALLOWED_ORIGINS.split(',') 
        : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id']
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

// Phase 1-4 Routes
const metricsRoutes = require('./routes/metrics');
const scenariosRoutes = require('./routes/scenarios');
const authRoutes = require('./routes/auth');

// Phase 5 Routes
const currencyRoutes = require('./routes/currency');
const cohortRoutes = require('./routes/cohorts');
const forecastRoutes = require('./routes/forecast');
const reportRoutes = require('./routes/reports');
const quickbooksRoutes = require('./routes/quickbooks');
const agencyRoutes = require('./routes/agency');

app.use('/api/metrics', metricsRoutes);
app.use('/api/scenarios', scenariosRoutes);
app.use('/api/auth', authRoutes);

// Phase 5 API Routes
app.use('/api/currency', currencyRoutes);
app.use('/api/cohorts', cohortRoutes);
app.use('/api/forecast', forecastRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/quickbooks', quickbooksRoutes);
app.use('/api/agency', agencyRoutes);

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
        version: '3.0.0',
        phase: 'Phase 5 Complete',
        endpoints: {
            // Core
            'GET /api/health': 'Health check',
            'GET /api/security': 'Security status',
            // Metrics
            'GET /api/metrics': 'Get real metrics',
            'POST /api/metrics/calculate': 'Calculate projections',
            'POST /api/metrics/real': 'Update real metrics',
            'GET /api/metrics/compare': 'Compare real vs simulated',
            // Scenarios
            'GET /api/scenarios': 'List scenarios',
            'POST /api/scenarios': 'Create scenario',
            'GET /api/scenarios/:id': 'Get scenario',
            'PUT /api/scenarios/:id': 'Update scenario',
            'DELETE /api/scenarios/:id': 'Delete scenario',
            'POST /api/scenarios/compare': 'Compare scenarios',
            // Auth
            'POST /api/auth/login': 'Login',
            'POST /api/auth/signup': 'Sign up',
            'GET /api/auth/verify': 'Verify token',
            // Phase 5 - Multi-Currency
            'GET /api/currency/supported': 'List supported currencies',
            'GET /api/currency/rates': 'Get exchange rates',
            'POST /api/currency/convert': 'Convert amount',
            'GET /api/currency/preference': 'Get user currency',
            'PUT /api/currency/preference': 'Set user currency',
            // Phase 5 - Cohort Analysis
            'GET /api/cohorts/analysis': 'Get cohort analysis',
            'GET /api/cohorts/benchmarks': 'Get retention benchmarks',
            'GET /api/cohorts/:cohortMonth/retention': 'Get retention curve',
            'GET /api/cohorts/export/csv': 'Export cohort data',
            // Phase 5 - AI Forecasting
            'GET /api/forecast': 'Generate AI forecast',
            'POST /api/forecast/scenario': 'Run forecast scenario',
            'GET /api/forecast/accuracy': 'Forecast accuracy metrics',
            'GET /api/forecast/export': 'Export forecast data',
            // Phase 5 - Reports
            'POST /api/reports/investor': 'Generate investor report (PDF)',
            'GET /api/reports/monthly': 'Generate monthly report (PDF)',
            'GET /api/reports/templates': 'List report templates',
            // Phase 5 - QuickBooks
            'GET /api/quickbooks/status': 'QuickBooks connection status',
            'GET /api/quickbooks/connect': 'Get QuickBooks auth URL',
            'POST /api/quickbooks/sync/revenue': 'Sync revenue from QuickBooks',
            'POST /api/quickbooks/sync/expenses': 'Sync expenses from QuickBooks',
            'POST /api/quickbooks/sync/all': 'Full QuickBooks sync',
            'DELETE /api/quickbooks/disconnect': 'Disconnect QuickBooks',
            // Phase 5 - Agency/Multi-tenant
            'POST /api/agency/create': 'Create agency account',
            'GET /api/agency': 'Get agency details',
            'POST /api/agency/workspaces': 'Create client workspace',
            'GET /api/agency/workspaces': 'List workspaces',
            'POST /api/agency/workspaces/:id/invite': 'Invite team member'
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
    console.log(`📊 Subscription Revenue Simulator v3.0 - Phase 5 Complete!`);
    console.log(`   Phase 5 Features:`);
    console.log(`   - 💱 Multi-Currency (USD, EUR, GBP, CAD, AUD, JPY, CHF)`);
    console.log(`   - 📊 Cohort Analysis with Retention Curves`);
    console.log(`   - 🤖 AI-Powered Forecasting (12-month predictions)`);
    console.log(`   - 📱 PWA with Offline Support`);
    console.log(`   - 🏢 Multi-Tenant Agency Support`);
    console.log(`   - 📄 Investor Report Generation (PDF)`);
    console.log(`   - 🔗 QuickBooks Integration`);
    console.log(`   API endpoints available at /api`);
});

module.exports = app;
