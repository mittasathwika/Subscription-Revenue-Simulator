const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../models/database');
const MetricsEngine = require('../utils/metricsEngine');
const { optionalAuth, authenticateToken } = require('../middleware/auth');
const { scenarioValidation } = require('../middleware/validator');

// GET /api/scenarios - List all scenarios for user
router.get('/', optionalAuth, async (req, res) => {
    try {
        const db = getDatabase();
        const userId = req.headers['x-user-id'] || 'demo@example.com';
        
        db.all(
            `SELECT s.*, u.email as user_email 
             FROM scenarios s 
             JOIN users u ON s.user_id = u.id 
             WHERE u.email = ? 
             ORDER BY s.updated_at DESC`,
            [userId],
            (err, rows) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                const scenarios = rows.map(row => ({
                    id: row.id,
                    name: row.name,
                    inputs: {
                        price: row.price,
                        churn_rate: row.churn_rate,
                        ad_spend: row.ad_spend,
                        growth_rate: row.growth_rate,
                        initial_customers: row.initial_customers,
                        cac: row.cac
                    },
                    created_at: row.created_at,
                    updated_at: row.updated_at
                }));
                
                res.json({ scenarios, count: scenarios.length });
            }
        );
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/scenarios/:id - Get specific scenario
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const db = getDatabase();
        const { id } = req.params;
        
        db.get(
            `SELECT s.* FROM scenarios s WHERE s.id = ?`,
            [id],
            (err, row) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                if (!row) {
                    return res.status(404).json({ error: 'Scenario not found' });
                }
                
                // Recalculate projection
                const inputs = {
                    price: row.price,
                    churn: row.churn_rate,
                    adSpend: row.ad_spend,
                    growthRate: row.growth_rate,
                    initialCustomers: row.initial_customers,
                    cac: row.cac,
                    months: 12
                };
                
                const projection = MetricsEngine.calculateProjections(inputs);
                
                res.json({
                    id: row.id,
                    name: row.name,
                    inputs,
                    projection,
                    created_at: row.created_at,
                    updated_at: row.updated_at
                });
            }
        );
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/scenarios - Create new scenario (protected)
router.post('/', authenticateToken, scenarioValidation.create, async (req, res) => {
    try {
        const db = getDatabase();
        const userId = req.headers['x-user-id'] || 'demo@example.com';
        const scenarioId = uuidv4();
        
        const { name, price, churn_rate, ad_spend, growth_rate, initial_customers, cac } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Scenario name is required' });
        }
        
        db.get('SELECT id FROM users WHERE email = ?', [userId], (err, user) => {
            if (err || !user) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            db.run(
                `INSERT INTO scenarios (id, user_id, name, price, churn_rate, ad_spend, growth_rate, initial_customers, cac) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [scenarioId, user.id, name, price || 99, churn_rate || 0.05, ad_spend || 5000, growth_rate || 0.10, initial_customers || 100, cac || 500],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    
                    res.status(201).json({
                        success: true,
                        id: scenarioId,
                        name,
                        message: 'Scenario created successfully'
                    });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/scenarios/:id - Update scenario (protected)
router.put('/:id', authenticateToken, scenarioValidation.update, async (req, res) => {
    try {
        const db = getDatabase();
        const { id } = req.params;
        const { name, price, churn_rate, ad_spend, growth_rate, initial_customers, cac } = req.body;
        
        db.run(
            `UPDATE scenarios 
             SET name = COALESCE(?, name),
                 price = COALESCE(?, price),
                 churn_rate = COALESCE(?, churn_rate),
                 ad_spend = COALESCE(?, ad_spend),
                 growth_rate = COALESCE(?, growth_rate),
                 initial_customers = COALESCE(?, initial_customers),
                 cac = COALESCE(?, cac),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [name, price, churn_rate, ad_spend, growth_rate, initial_customers, cac, id],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                if (this.changes === 0) {
                    return res.status(404).json({ error: 'Scenario not found' });
                }
                
                res.json({
                    success: true,
                    id,
                    message: 'Scenario updated successfully'
                });
            }
        );
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/scenarios/:id - Delete scenario (protected)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const db = getDatabase();
        const { id } = req.params;
        
        db.run('DELETE FROM scenarios WHERE id = ?', [id], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Scenario not found' });
            }
            
            res.json({
                success: true,
                message: 'Scenario deleted successfully'
            });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/scenarios/compare - Compare multiple scenarios (protected)
router.post('/compare', optionalAuth, scenarioValidation.compare, async (req, res) => {
    try {
        const { scenario_ids } = req.body;
        
        if (!scenario_ids || !Array.isArray(scenario_ids) || scenario_ids.length < 2) {
            return res.status(400).json({ error: 'At least 2 scenario IDs required for comparison' });
        }
        
        const db = getDatabase();
        const placeholders = scenario_ids.map(() => '?').join(',');
        
        db.all(
            `SELECT * FROM scenarios WHERE id IN (${placeholders})`,
            scenario_ids,
            (err, rows) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                const comparisons = rows.map(row => {
                    const inputs = {
                        price: row.price,
                        churn: row.churn_rate,
                        adSpend: row.ad_spend,
                        growthRate: row.growth_rate,
                        initialCustomers: row.initial_customers,
                        cac: row.cac,
                        months: 12
                    };
                    
                    const projection = MetricsEngine.calculateProjections(inputs);
                    
                    return {
                        id: row.id,
                        name: row.name,
                        inputs,
                        summary: {
                            final_customers: projection.customers[11],
                            final_revenue: projection.revenue[11],
                            arr: projection.revenue[11] * 12,
                            total_revenue_12mo: projection.revenue.reduce((a, b) => a + b, 0),
                            ltv: MetricsEngine.calculateLTV(row.price, row.churn_rate),
                            ltv_cac_ratio: MetricsEngine.calculateLTV(row.price, row.churn_rate) / row.cac
                        }
                    };
                });
                
                res.json({
                    comparison: comparisons,
                    best_scenario: comparisons.reduce((best, current) => 
                        current.summary.total_revenue_12mo > best.summary.total_revenue_12mo ? current : best
                    )
                });
            }
        );
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
