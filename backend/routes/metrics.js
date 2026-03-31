const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../models/database');
const MetricsEngine = require('../utils/metricsEngine');

// GET /api/metrics - Get real metrics for user
router.get('/', async (req, res) => {
    try {
        const db = getDatabase();
        const userId = req.headers['x-user-id'] || 'demo';
        
        // Get latest real metrics
        db.get(
            `SELECT * FROM real_metrics 
             WHERE user_id = (SELECT id FROM users WHERE email = ?) 
             ORDER BY recorded_at DESC LIMIT 1`,
            [userId === 'demo' ? 'demo@example.com' : userId],
            (err, row) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                if (!row) {
                    // Return default metrics if none exist
                    return res.json({
                        customers: 100,
                        monthly_revenue: 9900,
                        churn_rate: 0.05,
                        ad_spend: 5000,
                        cac: 500,
                        source: 'default'
                    });
                }
                
                // Calculate derived metrics
                const metrics = {
                    customers: row.customers,
                    monthly_revenue: row.monthly_revenue,
                    churn_rate: row.churn_rate,
                    ad_spend: row.ad_spend,
                    cac: row.cac,
                    arr: row.monthly_revenue * 12,
                    arpu: row.monthly_revenue / row.customers,
                    ltv: MetricsEngine.calculateLTV(row.monthly_revenue / row.customers, row.churn_rate),
                    ltv_cac_ratio: 0,
                    payback_period: 0,
                    source: 'real_data',
                    recorded_at: row.recorded_at
                };
                
                metrics.ltv_cac_ratio = metrics.ltv / row.cac;
                metrics.payback_period = MetricsEngine.calculatePaybackPeriod(metrics.arpu, row.cac);
                
                res.json(metrics);
            }
        );
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/metrics/calculate - Calculate projections based on inputs
router.post('/calculate', async (req, res) => {
    try {
        const inputs = {
            price: parseFloat(req.body.price) || 99,
            churn: parseFloat(req.body.churn) / 100 || 0.05,
            adSpend: parseFloat(req.body.adSpend) || 5000,
            growthRate: parseFloat(req.body.growthRate) / 100 || 0.10,
            initialCustomers: parseInt(req.body.initialCustomers) || 100,
            cac: parseFloat(req.body.cac) || 500,
            months: parseInt(req.body.months) || 12
        };
        
        // Validate inputs
        const errors = [];
        if (inputs.price <= 0) errors.push('Price must be greater than 0');
        if (inputs.churn < 0 || inputs.churn > 1) errors.push('Churn rate must be between 0% and 100%');
        if (inputs.adSpend < 0) errors.push('Ad spend cannot be negative');
        if (inputs.growthRate < 0) errors.push('Growth rate cannot be negative');
        if (inputs.initialCustomers < 0) errors.push('Initial customers cannot be negative');
        if (inputs.cac <= 0) errors.push('CAC must be greater than 0');
        
        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }
        
        // Calculate projections using the metrics engine
        const projection = MetricsEngine.calculateProjections(inputs);
        
        res.json({
            inputs: req.body,
            projection,
            summary: {
                final_customers: projection.customers[projection.customers.length - 1],
                final_revenue: projection.revenue[projection.revenue.length - 1],
                total_revenue: projection.revenue.reduce((a, b) => a + b, 0),
                avg_monthly_growth: ((projection.customers[projection.customers.length - 1] - inputs.initialCustomers) / inputs.initialCustomers / inputs.months * 100).toFixed(1) + '%'
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/metrics/real - Update real metrics (simulated Stripe connection)
router.post('/real', async (req, res) => {
    try {
        const db = getDatabase();
        const userId = req.headers['x-user-id'] || 'demo@example.com';
        const metricsId = uuidv4();
        
        const { customers, monthly_revenue, churn_rate, ad_spend, cac } = req.body;
        
        db.get('SELECT id FROM users WHERE email = ?', [userId], (err, user) => {
            if (err || !user) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            db.run(
                `INSERT INTO real_metrics (id, user_id, customers, monthly_revenue, churn_rate, ad_spend, cac) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [metricsId, user.id, customers, monthly_revenue, churn_rate, ad_spend, cac],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    res.json({ 
                        success: true, 
                        id: metricsId,
                        message: 'Real metrics updated successfully'
                    });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/metrics/compare - Compare real vs simulated data
router.get('/compare', async (req, res) => {
    try {
        const db = getDatabase();
        const userId = req.headers['x-user-id'] || 'demo@example.com';
        
        // Get real metrics
        db.get(
            `SELECT * FROM real_metrics 
             WHERE user_id = (SELECT id FROM users WHERE email = ?) 
             ORDER BY recorded_at DESC LIMIT 1`,
            [userId],
            (err, realData) => {
                if (err || !realData) {
                    return res.status(404).json({ error: 'No real data found' });
                }
                
                // Generate simulated projection based on real data
                const inputs = {
                    price: realData.monthly_revenue / realData.customers,
                    churn: realData.churn_rate,
                    adSpend: realData.ad_spend,
                    growthRate: 0.10, // Default growth assumption
                    initialCustomers: realData.customers,
                    cac: realData.cac,
                    months: 12
                };
                
                const simulated = MetricsEngine.calculateProjections(inputs);
                
                res.json({
                    real: {
                        customers: realData.customers,
                        monthly_revenue: realData.monthly_revenue,
                        arr: realData.monthly_revenue * 12,
                        churn_rate: realData.churn_rate,
                        recorded_at: realData.recorded_at
                    },
                    simulated: {
                        projection: simulated,
                        summary: {
                            projected_arr_12mo: simulated.revenue[11] * 12,
                            customer_growth: ((simulated.customers[11] - realData.customers) / realData.customers * 100).toFixed(1) + '%'
                        }
                    },
                    comparison: {
                        revenue_difference: simulated.revenue[11] * 12 - (realData.monthly_revenue * 12),
                        customer_difference: simulated.customers[11] - realData.customers
                    }
                });
            }
        );
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
