const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticateToken: authenticate } = require('../middleware/auth');
const pdfReportService = require('../services/pdfReportService');
const { getDatabase: getDb } = require('../models/database');

// Generate investor report
router.post('/investor', authenticate, [
    body('companyName').optional().isString(),
    body('includeForecast').optional().isBoolean()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const db = getDb();
        
        // Get user data
        const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
        
        // Get latest metrics
        const metrics = await db.get(
            `SELECT * FROM user_metrics WHERE user_id = ? ORDER BY date DESC LIMIT 1`,
            [req.user.id]
        );
        
        // Get scenarios
        const scenarios = await db.all(
            `SELECT * FROM scenarios WHERE user_id = ? ORDER BY created_at DESC LIMIT 5`,
            [req.user.id]
        );
        
        // Calculate additional metrics
        const enhancedMetrics = {
            ...metrics,
            arr: metrics?.mrr ? metrics.mrr * 12 : 0,
            arpu: metrics?.mrr && metrics?.active_customers 
                ? metrics.mrr / metrics.active_customers 
                : 0,
            ltv: metrics?.mrr && metrics?.churn 
                ? (metrics.mrr / metrics.active_customers) * (1 / (metrics.churn / 100)) 
                : 0,
            ltvCacRatio: metrics?.ltv && metrics?.cac 
                ? metrics.ltv / metrics.cac 
                : 0
        };
        
        // Generate PDF
        const pdfBuffer = await pdfReportService.generateInvestorReport(
            req.user.id,
            user,
            enhancedMetrics,
            scenarios,
            req.body
        );
        
        // Set headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=investor-report-${Date.now()}.pdf`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Report generation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate investor report'
        });
    }
});

// Generate monthly report
router.get('/monthly', authenticate, async (req, res) => {
    try {
        const db = getDb();
        
        // Get user data
        const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
        
        // Get this month's metrics
        const thisMonth = await db.get(
            `SELECT * FROM user_metrics 
             WHERE user_id = ? 
             AND strftime('%Y-%m', date) = strftime('%Y-%m', 'now')
             ORDER BY date DESC LIMIT 1`,
            [req.user.id]
        );
        
        // Get last month's metrics for comparison
        const lastMonth = await db.get(
            `SELECT * FROM user_metrics 
             WHERE user_id = ? 
             AND strftime('%Y-%m', date) = strftime('%Y-%m', 'now', '-1 month')
             ORDER BY date DESC LIMIT 1`,
            [req.user.id]
        );
        
        // Calculate new customers
        const newCustomers = thisMonth && lastMonth 
            ? (thisMonth.active_customers || 0) - (lastMonth.active_customers || 0)
            : 0;
        
        const metrics = {
            ...thisMonth,
            newCustomers: Math.max(0, newCustomers),
            netRevenueRetention: thisMonth && lastMonth && lastMonth.mrr > 0
                ? ((thisMonth.mrr / lastMonth.mrr) * 100).toFixed(1)
                : 100
        };
        
        // Generate PDF
        const pdfBuffer = await pdfReportService.generateMonthlyReport(
            req.user.id,
            user,
            metrics
        );
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=monthly-report-${Date.now()}.pdf`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Monthly report error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate monthly report'
        });
    }
});

// List available report templates
router.get('/templates', authenticate, async (req, res) => {
    try {
        const templates = [
            {
                id: 'investor',
                name: 'Investor Report',
                description: 'Comprehensive report for investors with key metrics and projections',
                format: 'PDF'
            },
            {
                id: 'monthly',
                name: 'Monthly Performance',
                description: 'Monthly performance summary with key metrics',
                format: 'PDF'
            },
            {
                id: 'executive',
                name: 'Executive Summary',
                description: 'One-page executive summary of business health',
                format: 'PDF'
            }
        ];
        
        res.json({
            success: true,
            templates
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch templates'
        });
    }
});

module.exports = router;
