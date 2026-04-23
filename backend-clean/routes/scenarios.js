const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { 
    getScenarios, 
    createScenario, 
    getScenarioById,
    updateScenario,
    deleteScenario,
    getScenariosByIds
} = require('../models/dynamodb');
const MetricsEngine = require('../utils/metricsEngine');
const { optionalAuth, authenticateToken } = require('../middleware/auth');
const { scenarioValidation } = require('../middleware/validator');

// GET /api/scenarios - List all scenarios for user
router.get('/', optionalAuth, async (req, res) => {
    try {
        const userId = req.headers['x-user-id'] || 'demo@example.com';
        
        const scenarios = await getScenarios(userId);
        const formattedScenarios = scenarios.map(item => ({
            id: item.id,
            name: item.name,
            inputs: {
                price: item.price,
                churn_rate: item.churn_rate,
                ad_spend: item.ad_spend,
                growth_rate: item.growth_rate,
                initial_customers: item.initial_customers,
                cac: item.cac
            },
            created_at: item.created_at,
            updated_at: item.updated_at
        }));
        
        res.json({ scenarios: formattedScenarios, count: formattedScenarios.length });
    } catch (error) {
        console.error('Error getting scenarios:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/scenarios/:id - Get specific scenario
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        const row = await getScenarioById(id);
        
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
    } catch (error) {
        console.error('Error getting scenario:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/scenarios - Create new scenario (protected)
router.post('/', authenticateToken, scenarioValidation.create, async (req, res) => {
    try {
        const userId = req.headers['x-user-id'] || 'demo@example.com';
        const scenarioId = uuidv4();
        
        const { name, price, churn_rate, ad_spend, growth_rate, initial_customers, cac } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Scenario name is required' });
        }
        
        const scenarioData = {
            id: scenarioId,
            name,
            price: price || 99,
            churn_rate: churn_rate || 0.05,
            ad_spend: ad_spend || 5000,
            growth_rate: growth_rate || 0.10,
            initial_customers: initial_customers || 100,
            cac: cac || 500
        };
        
        await createScenario(userId, scenarioData);
        
        res.status(201).json({
            success: true,
            id: scenarioId,
            name,
            message: 'Scenario created successfully'
        });
    } catch (error) {
        console.error('Error creating scenario:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/scenarios/:id - Update scenario (protected)
router.put('/:id', authenticateToken, scenarioValidation.update, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, churn_rate, ad_spend, growth_rate, initial_customers, cac } = req.body;
        
        const updates = {};
        if (name !== undefined) updates.name = name;
        if (price !== undefined) updates.price = price;
        if (churn_rate !== undefined) updates.churn_rate = churn_rate;
        if (ad_spend !== undefined) updates.ad_spend = ad_spend;
        if (growth_rate !== undefined) updates.growth_rate = growth_rate;
        if (initial_customers !== undefined) updates.initial_customers = initial_customers;
        if (cac !== undefined) updates.cac = cac;
        
        const result = await updateScenario(id, updates);
        
        if (!result) {
            return res.status(404).json({ error: 'Scenario not found' });
        }
        
        res.json({
            success: true,
            id,
            message: 'Scenario updated successfully'
        });
    } catch (error) {
        console.error('Error updating scenario:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/scenarios/:id - Delete scenario (protected)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await deleteScenario(id);
        
        if (!result) {
            return res.status(404).json({ error: 'Scenario not found' });
        }
        
        res.json({
            success: true,
            message: 'Scenario deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting scenario:', error);
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
        
        const rows = await getScenariosByIds(scenario_ids);
        
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
    } catch (error) {
        console.error('Error comparing scenarios:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
