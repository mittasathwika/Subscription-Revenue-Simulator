const express = require('express');
const router = express.Router();
const { authenticateToken: authenticate } = require('../middleware/auth');
const cohortService = require('../services/cohortService');

// Get cohort analysis for current user
router.get('/analysis', authenticate, async (req, res) => {
    try {
        const months = parseInt(req.query.months) || 12;
        const analysis = await cohortService.getCohortAnalysis(req.user.id, months);
        
        res.json({
            success: true,
            cohorts: analysis,
            generated_at: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to generate cohort analysis'
        });
    }
});

// Get cohort benchmarks
router.get('/benchmarks', authenticate, async (req, res) => {
    try {
        const benchmarks = await cohortService.getBenchmarks(req.user.id);
        
        res.json({
            success: true,
            benchmarks
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch benchmarks'
        });
    }
});

// Get retention curve for specific cohort
router.get('/:cohortMonth/retention', authenticate, async (req, res) => {
    try {
        const { cohortMonth } = req.params;
        
        // Validate cohort month format (YYYY-MM)
        if (!/^\d{4}-\d{2}$/.test(cohortMonth)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid cohort month format. Use YYYY-MM'
            });
        }
        
        const retention = await cohortService.calculateCohortRetention(req.user.id, cohortMonth);
        
        if (!retention) {
            return res.status(404).json({
                success: false,
                error: 'No data found for this cohort'
            });
        }
        
        res.json({
            success: true,
            cohort_month: cohortMonth,
            retention_curve: retention
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch retention data'
        });
    }
});

// Track a new customer (for manual entry or integrations)
router.post('/track-customer', authenticate, async (req, res) => {
    try {
        const { customerId, signupDate, initialRevenue } = req.body;
        
        if (!customerId || !signupDate) {
            return res.status(400).json({
                success: false,
                error: 'customerId and signupDate are required'
            });
        }
        
        await cohortService.trackCustomer(
            req.user.id,
            customerId,
            signupDate,
            initialRevenue || 0
        );
        
        res.json({
            success: true,
            message: 'Customer tracked successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Export cohort data as CSV
router.get('/export/csv', authenticate, async (req, res) => {
    try {
        const months = parseInt(req.query.months) || 12;
        const analysis = await cohortService.getCohortAnalysis(req.user.id, months);
        
        // Generate CSV
        let csv = 'Cohort Month,Total Customers,Active Customers,Churned Customers,Total Revenue,Average LTV';
        
        // Add retention month headers
        for (let i = 0; i <= 12; i++) {
            csv += `,Month ${i} Retention%`;
        }
        csv += '\n';
        
        // Add data rows
        for (const cohort of analysis) {
            csv += `${cohort.cohort_month},${cohort.total_customers},${cohort.active_customers},${cohort.churned_customers},${cohort.total_revenue.toFixed(2)},${cohort.avg_ltv.toFixed(2)}`;
            
            for (let i = 0; i <= 12; i++) {
                const monthData = cohort.retention_curve.find(r => r.month === i);
                csv += `,${monthData ? monthData.rate.toFixed(2) : '0.00'}`;
            }
            csv += '\n';
        }
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=cohort-analysis.csv');
        res.send(csv);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to export cohort data'
        });
    }
});

module.exports = router;
