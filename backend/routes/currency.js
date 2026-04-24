const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticateToken: authenticate } = require('../middleware/auth');
const currencyService = require('../services/currencyService');

// Get supported currencies
router.get('/supported', async (req, res) => {
    try {
        const currencies = [
            { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
            { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
            { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
            { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', flag: '🇨🇦' },
            { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
            { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
            { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', flag: '🇨🇭' }
        ];
        
        res.json({
            success: true,
            currencies
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch supported currencies'
        });
    }
});

// Get current exchange rates
router.get('/rates', async (req, res) => {
    try {
        const base = req.query.base || 'USD';
        const rates = await currencyService.getAllRates(base);
        
        res.json({
            success: true,
            base,
            rates,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch exchange rates'
        });
    }
});

// Convert amount between currencies
router.post('/convert', [
    body('amount').isNumeric(),
    body('from').isLength({ min: 3, max: 3 }),
    body('to').isLength({ min: 3, max: 3 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }
        
        const { amount, from, to } = req.body;
        
        const converted = await currencyService.convert(amount, from, to);
        const rate = await currencyService.getExchangeRate(from, to);
        
        res.json({
            success: true,
            original: {
                amount: parseFloat(amount),
                currency: from
            },
            converted: {
                amount: converted,
                currency: to
            },
            rate,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get user's currency preference
router.get('/preference', authenticate, async (req, res) => {
    try {
        const currency = await currencyService.getUserCurrency(req.user.id);
        
        res.json({
            success: true,
            currency
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch currency preference'
        });
    }
});

// Update user's currency preference
router.put('/preference', authenticate, [
    body('currency').isLength({ min: 3, max: 3 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }
        
        const { currency } = req.body;
        await currencyService.updateUserCurrency(req.user.id, currency);
        
        res.json({
            success: true,
            message: 'Currency preference updated',
            currency
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
