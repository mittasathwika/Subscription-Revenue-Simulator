const axios = require('axios');
const { getDatabase: getDb } = require('../models/database');

const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF'];
const CACHE_DURATION_MS = 1000 * 60 * 60; // 1 hour

class CurrencyService {
    constructor() {
        this.apiKey = process.env.EXCHANGE_RATE_API_KEY;
        this.baseUrl = 'https://v6.exchangerate-api.com/v6';
    }

    async getExchangeRate(from, to) {
        if (from === to) return 1;
        
        const db = getDb();
        
        // Check cache first
        const cached = await db.get(
            'SELECT * FROM exchange_rates WHERE base_currency = ? AND target_currency = ? AND last_updated > datetime("now", "-1 hour")',
            [from, to]
        );
        
        if (cached) {
            return cached.rate;
        }
        
        // Fetch fresh rate
        try {
            const rate = await this.fetchRateFromAPI(from, to);
            
            // Cache the rate
            await db.run(
                `INSERT INTO exchange_rates (base_currency, target_currency, rate, last_updated) 
                 VALUES (?, ?, ?, datetime('now'))
                 ON CONFLICT(base_currency, target_currency) DO UPDATE SET
                 rate = excluded.rate, last_updated = datetime('now')`,
                [from, to, rate]
            );
            
            return rate;
        } catch (error) {
            console.error('Exchange rate fetch failed:', error);
            // Return cached rate even if expired, or fallback
            const expired = await db.get(
                'SELECT rate FROM exchange_rates WHERE base_currency = ? AND target_currency = ?',
                [from, to]
            );
            return expired ? expired.rate : this.getFallbackRate(from, to);
        }
    }

    async fetchRateFromAPI(from, to) {
        if (!this.apiKey) {
            // Use free API without key (limited)
            const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${from}`);
            return response.data.rates[to];
        }
        
        const response = await axios.get(`${this.baseUrl}/${this.apiKey}/pair/${from}/${to}`);
        return response.data.conversion_rate;
    }

    getFallbackRate(from, to) {
        const rates = {
            'USD': { 'EUR': 0.92, 'GBP': 0.79, 'CAD': 1.36, 'AUD': 1.52, 'JPY': 149.50, 'CHF': 0.88 },
            'EUR': { 'USD': 1.09, 'GBP': 0.86, 'CAD': 1.47, 'AUD': 1.65, 'JPY': 162.50, 'CHF': 0.96 },
            'GBP': { 'USD': 1.27, 'EUR': 1.16, 'CAD': 1.71, 'AUD': 1.92, 'JPY': 189.50, 'CHF': 1.12 },
            'CAD': { 'USD': 0.74, 'EUR': 0.68, 'GBP': 0.58, 'AUD': 1.12, 'JPY': 110.50, 'CHF': 0.65 },
            'AUD': { 'USD': 0.66, 'EUR': 0.61, 'GBP': 0.52, 'CAD': 0.89, 'JPY': 98.50, 'CHF': 0.58 },
            'JPY': { 'USD': 0.0067, 'EUR': 0.0062, 'GBP': 0.0053, 'CAD': 0.0090, 'AUD': 0.010, 'CHF': 0.0059 },
            'CHF': { 'USD': 1.14, 'EUR': 1.04, 'GBP': 0.89, 'CAD': 1.54, 'AUD': 1.73, 'JPY': 169.50 }
        };
        
        if (from === to) return 1;
        return rates[from]?.[to] || 1;
    }

    async convert(amount, from, to) {
        if (from === to) return amount;
        const rate = await this.getExchangeRate(from, to);
        return amount * rate;
    }

    async getAllRates(base = 'USD') {
        const rates = {};
        for (const currency of SUPPORTED_CURRENCIES) {
            if (currency !== base) {
                rates[currency] = await this.getExchangeRate(base, currency);
            }
        }
        return rates;
    }

    async updateUserCurrency(userId, currency) {
        if (!SUPPORTED_CURRENCIES.includes(currency)) {
            throw new Error(`Unsupported currency: ${currency}`);
        }
        
        const db = getDb();
        await db.run('UPDATE users SET currency = ? WHERE id = ?', [currency, userId]);
        return true;
    }

    async getUserCurrency(userId) {
        const db = getDb();
        const user = await db.get('SELECT currency FROM users WHERE id = ?', [userId]);
        return user?.currency || 'USD';
    }

    formatAmount(amount, currency) {
        const symbols = {
            'USD': '$', 'EUR': '€', 'GBP': '£', 'CAD': 'CA$',
            'AUD': 'A$', 'JPY': '¥', 'CHF': 'Fr'
        };
        
        const symbol = symbols[currency] || '$';
        const formatted = new Intl.NumberFormat('en-US', {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
        
        return `${symbol}${formatted}`;
    }
}

module.exports = new CurrencyService();
