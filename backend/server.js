const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

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

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 API endpoints:`);
    console.log(`   - GET  /api/health`);
    console.log(`   - GET  /api/metrics`);
    console.log(`   - POST /api/metrics/calculate`);
    console.log(`   - GET  /api/scenarios`);
    console.log(`   - POST /api/scenarios`);
    console.log(`   - POST /api/auth/login`);
});

module.exports = app;
