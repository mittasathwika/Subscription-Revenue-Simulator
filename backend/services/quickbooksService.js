const QuickBooks = require('quickbooks-node-promise');
const { getDatabase: getDb } = require('../models/database');

class QuickBooksService {
    constructor() {
        this.clientId = process.env.QUICKBOOKS_CLIENT_ID;
        this.clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;
        this.redirectUri = process.env.QUICKBOOKS_REDIRECT_URI || 'http://localhost:3001/api/quickbooks/callback';
        this.environment = process.env.NODE_ENV === 'production' ? 'production' : 'sandbox';
    }

    getAuthUrl(userId) {
        const scopes = [
            'com.intuit.quickbooks.accounting',
            'com.intuit.quickbooks.payment'
        ];
        
        const qbo = new QuickBooks(
            this.clientId,
            this.clientSecret,
            '', // no access token yet
            false, // no token secret for OAuth2
            '', // no realm id yet
            this.environment === 'production', // use production?
            true, // debug
            null, // minor version
            '2.0', // OAuth version
            '', // refresh token
            scopes
        );
        
        // Generate state parameter with user ID
        const state = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString('base64');
        
        return qbo.authorizationUri + '?client_id=' + this.clientId + 
               '&redirect_uri=' + encodeURIComponent(this.redirectUri) +
               '&scope=' + encodeURIComponent(scopes.join(' ')) +
               '&response_type=code' +
               '&state=' + encodeURIComponent(state);
    }

    async handleCallback(code, state) {
        try {
            const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
            const userId = stateData.userId;
            
            // Exchange code for tokens
            const tokenResponse = await this.exchangeCodeForTokens(code);
            
            // Save tokens to database
            await this.saveTokens(userId, tokenResponse);
            
            return {
                success: true,
                userId,
                realmId: tokenResponse.realmId
            };
        } catch (error) {
            console.error('QuickBooks callback error:', error);
            throw error;
        }
    }

    async exchangeCodeForTokens(code) {
        const tokenEndpoint = this.environment === 'production' 
            ? 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'
            : 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
        
        const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
        
        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: this.redirectUri
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to exchange code for tokens');
        }
        
        return await response.json();
    }

    async saveTokens(userId, tokens) {
        const db = getDb();
        
        // Store tokens securely
        await db.run(
            `INSERT INTO quickbooks_connections 
             (user_id, realm_id, access_token, refresh_token, expires_at, created_at)
             VALUES (?, ?, ?, ?, datetime('now', '+${tokens.expires_in} seconds'), datetime('now'))
             ON CONFLICT(user_id) DO UPDATE SET
             realm_id = excluded.realm_id,
             access_token = excluded.access_token,
             refresh_token = excluded.refresh_token,
             expires_at = excluded.expires_at,
             updated_at = datetime('now')`,
            [userId, tokens.realmId, tokens.access_token, tokens.refresh_token]
        );
    }

    async getClient(userId) {
        const db = getDb();
        
        const connection = await db.get(
            'SELECT * FROM quickbooks_connections WHERE user_id = ?',
            [userId]
        );
        
        if (!connection) {
            throw new Error('QuickBooks not connected');
        }
        
        // Check if token is expired and refresh if needed
        let accessToken = connection.access_token;
        const isExpired = new Date(connection.expires_at) <= new Date();
        
        if (isExpired) {
            accessToken = await this.refreshToken(userId, connection.refresh_token);
        }
        
        const qbo = new QuickBooks(
            this.clientId,
            this.clientSecret,
            accessToken,
            false,
            connection.realm_id,
            this.environment === 'production',
            true,
            null,
            '2.0',
            connection.refresh_token
        );
        
        return qbo;
    }

    async refreshToken(userId, refreshToken) {
        const tokenEndpoint = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
        
        const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
        
        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to refresh token');
        }
        
        const tokens = await response.json();
        await this.saveTokens(userId, tokens);
        
        return tokens.access_token;
    }

    async syncRevenue(userId) {
        try {
            const qbo = await this.getClient(userId);
            
            // Get invoices from QuickBooks
            const invoices = await qbo.findInvoices({
                limit: 1000,
                order_by: 'MetaData.LastUpdatedTime',
                sort_order: 'DESC'
            });
            
            // Process and store revenue data
            const revenueData = invoices.QueryResponse?.Invoice || [];
            
            await this.processRevenueData(userId, revenueData);
            
            return {
                success: true,
                invoices_synced: revenueData.length
            };
        } catch (error) {
            console.error('QuickBooks sync error:', error);
            throw error;
        }
    }

    async syncExpenses(userId) {
        try {
            const qbo = await this.getClient(userId);
            
            // Get expenses/bills from QuickBooks
            const purchases = await qbo.findPurchases({
                limit: 1000,
                order_by: 'MetaData.LastUpdatedTime',
                sort_order: 'DESC'
            });
            
            const expensesData = purchases.QueryResponse?.Purchase || [];
            
            await this.processExpenseData(userId, expensesData);
            
            return {
                success: true,
                expenses_synced: expensesData.length
            };
        } catch (error) {
            console.error('QuickBooks expense sync error:', error);
            throw error;
        }
    }

    async processRevenueData(userId, invoices) {
        const db = getDb();
        
        // Aggregate monthly revenue
        const monthlyRevenue = {};
        
        for (const invoice of invoices) {
            if (invoice.TxnDate && invoice.TotalAmt) {
                const month = invoice.TxnDate.substring(0, 7); // YYYY-MM
                monthlyRevenue[month] = (monthlyRevenue[month] || 0) + invoice.TotalAmt;
            }
        }
        
        // Store in user_metrics
        for (const [month, revenue] of Object.entries(monthlyRevenue)) {
            await db.run(
                `INSERT INTO user_metrics (user_id, date, mrr, data_source)
                 VALUES (?, ?, ?, 'quickbooks')
                 ON CONFLICT(user_id, date) DO UPDATE SET
                 mrr = excluded.mrr,
                 data_source = 'quickbooks',
                 updated_at = datetime('now')`,
                [userId, `${month}-01`, revenue]
            );
        }
    }

    async processExpenseData(userId, purchases) {
        const db = getDb();
        
        // Filter marketing/sales expenses for CAC calculation
        const marketingExpenseAccounts = ['Advertising', 'Marketing', 'Sales'];
        
        const monthlyExpenses = {};
        
        for (const purchase of purchases) {
            const account = purchase.AccountRef?.name || '';
            if (marketingExpenseAccounts.some(m => account.toLowerCase().includes(m.toLowerCase()))) {
                const month = purchase.TxnDate?.substring(0, 7);
                if (month && purchase.TotalAmt) {
                    monthlyExpenses[month] = (monthlyExpenses[month] || 0) + purchase.TotalAmt;
                }
            }
        }
        
        // Store marketing spend
        for (const [month, spend] of Object.entries(monthlyExpenses)) {
            await db.run(
                `UPDATE user_metrics 
                 SET ad_spend = ?,
                     updated_at = datetime('now')
                 WHERE user_id = ? AND date = ?`,
                [spend, userId, `${month}-01`]
            );
        }
    }

    async getConnectionStatus(userId) {
        const db = getDb();
        
        const connection = await db.get(
            'SELECT * FROM quickbooks_connections WHERE user_id = ?',
            [userId]
        );
        
        if (!connection) {
            return { connected: false };
        }
        
        const isExpired = new Date(connection.expires_at) <= new Date();
        
        return {
            connected: true,
            realmId: connection.realm_id,
            lastSync: connection.last_sync,
            expiresAt: connection.expires_at,
            needsRefresh: isExpired
        };
    }

    async disconnect(userId) {
        const db = getDb();
        
        await db.run(
            'DELETE FROM quickbooks_connections WHERE user_id = ?',
            [userId]
        );
        
        return { success: true };
    }
}

module.exports = new QuickBooksService();
