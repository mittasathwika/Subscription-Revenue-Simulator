const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticateToken: authenticate } = require('../middleware/auth');
const forecastService = require('../services/forecastService');

// Generate AI-powered forecast
router.get('/', authenticate, async (req, res) => {
    try {
        const months = parseInt(req.query.months) || 12;
        
        if (months < 1 || months > 36) {
            return res.status(400).json({
                success: false,
                error: 'Forecast months must be between 1 and 36'
            });
        }
        
        const forecast = await forecastService.generateForecast(req.user.id, months);
        
        res.json({
            success: true,
            ...forecast
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to generate forecast'
        });
    }
});

// Run scenario simulation with AI forecast
router.post('/scenario', authenticate, [
    body('priceChange').optional().isFloat({ min: -100, max: 100 }),
    body('growthRateChange').optional().isFloat({ min: -100, max: 100 }),
    body('churnChange').optional().isFloat({ min: -100, max: 100 }),
    body('adSpendChange').optional().isFloat({ min: -100, max: 100 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }
        
        const scenario = await forecastService.simulateScenario(req.user.id, req.body);
        
        res.json({
            success: true,
            ...scenario
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to run scenario simulation'
        });
    }
});

// Get forecast accuracy metrics
router.get('/accuracy', authenticate, async (req, res) => {
    try {
        const forecast = await forecastService.generateForecast(req.user.id, 12);
        
        if (forecast.error) {
            return res.status(400).json({
                success: false,
                error: forecast.error
            });
        }
        
        res.json({
            success: true,
            accuracy: forecast.accuracy,
            insights: forecast.insights
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to calculate accuracy metrics'
        });
    }
});

// Export forecast data
router.get('/export', authenticate, async (req, res) => {
    try {
        const format = req.query.format || 'json';
        const forecast = await forecastService.generateForecast(req.user.id, 12);
        
        if (forecast.error) {
            return res.status(400).json({
                success: false,
                error: forecast.error
            });
        }
        
        if (format === 'csv') {
            let csv = 'Month,Historical Revenue,Forecast Revenue,Lower 80%,Upper 80%,Lower 95%,Upper 95%\n';
            
            // Historical data
            forecast.historical.months.forEach((month, i) => {
                csv += `${month},${forecast.historical.revenue[i]},,,,,\n`;
            });
            
            // Forecast data
            forecast.forecast.months.forEach((month, i) => {
                csv += `${month},,${forecast.forecast.revenue.point_estimate[i]},${forecast.forecast.revenue.confidence_80[i].lower},${forecast.forecast.revenue.confidence_80[i].upper},${forecast.forecast.revenue.confidence_95[i].lower},${forecast.forecast.revenue.confidence_95[i].upper}\n`;
            });
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=revenue-forecast.csv');
            res.send(csv);
        } else {
            res.json({
                success: true,
                forecast
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to export forecast'
        });
    }
});

module.exports = router;
