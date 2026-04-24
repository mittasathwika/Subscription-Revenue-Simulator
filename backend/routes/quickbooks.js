const express = require('express');
const router = express.Router();
const { authenticateToken: authenticate } = require('../middleware/auth');
const quickbooksService = require('../services/quickbooksService');

// Get QuickBooks connection status
router.get('/status', authenticate, async (req, res) => {
    try {
        const status = await quickbooksService.getConnectionStatus(req.user.id);
        
        res.json({
            success: true,
            ...status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get QuickBooks OAuth URL
router.get('/connect', authenticate, async (req, res) => {
    try {
        const authUrl = quickbooksService.getAuthUrl(req.user.id);
        
        res.json({
            success: true,
            authUrl
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to generate auth URL'
        });
    }
});

// Handle OAuth callback
router.get('/callback', async (req, res) => {
    try {
        const { code, state, realmId } = req.query;
        
        if (!code || !state) {
            return res.status(400).send('Invalid callback parameters');
        }
        
        const result = await quickbooksService.handleCallback(code, state);
        
        // Redirect to frontend with success
        res.redirect(`/settings.html?quickbooks=connected&realm=${result.realmId}`);
    } catch (error) {
        console.error('QuickBooks callback error:', error);
        res.redirect('/settings.html?quickbooks=error');
    }
});

// Sync revenue from QuickBooks
router.post('/sync/revenue', authenticate, async (req, res) => {
    try {
        const result = await quickbooksService.syncRevenue(req.user.id);
        
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Sync expenses from QuickBooks
router.post('/sync/expenses', authenticate, async (req, res) => {
    try {
        const result = await quickbooksService.syncExpenses(req.user.id);
        
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Full sync (revenue + expenses)
router.post('/sync/all', authenticate, async (req, res) => {
    try {
        const [revenue, expenses] = await Promise.all([
            quickbooksService.syncRevenue(req.user.id),
            quickbooksService.syncExpenses(req.user.id)
        ]);
        
        res.json({
            success: true,
            revenue,
            expenses
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Disconnect QuickBooks
router.delete('/disconnect', authenticate, async (req, res) => {
    try {
        await quickbooksService.disconnect(req.user.id);
        
        res.json({
            success: true,
            message: 'QuickBooks disconnected successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
