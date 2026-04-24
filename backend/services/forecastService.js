const ss = require('simple-statistics');
const { getDatabase: getDb } = require('../models/database');

class ForecastService {
    constructor() {
        this.defaultForecastMonths = 12;
    }

    async generateForecast(userId, months = this.defaultForecastMonths) {
        const db = getDb();
        
        // Get historical monthly data
        const historicalData = await this.getHistoricalData(userId, 24); // Last 24 months
        
        if (historicalData.length < 3) {
            return {
                error: 'Insufficient data. Need at least 3 months of data.',
                minimum_required: 3,
                current_data_points: historicalData.length
            };
        }
        
        const revenueData = historicalData.map(d => d.revenue);
        const customerData = historicalData.map(d => d.customers);
        const monthsLabels = historicalData.map(d => d.month);
        
        // Generate forecasts
        const revenueForecast = this.forecastSeries(revenueData, months);
        const customerForecast = this.forecastSeries(customerData, months);
        
        // Calculate confidence intervals
        const revenueCI = this.calculateConfidenceIntervals(revenueData, revenueForecast.forecast);
        const customerCI = this.calculateConfidenceIntervals(customerData, customerForecast.forecast);
        
        // Generate future month labels
        const lastMonth = monthsLabels[monthsLabels.length - 1];
        const futureMonths = this.generateFutureMonths(lastMonth, months);
        
        return {
            historical: {
                months: monthsLabels,
                revenue: revenueData,
                customers: customerData
            },
            forecast: {
                months: futureMonths,
                revenue: {
                    point_estimate: revenueForecast.forecast,
                    confidence_80: revenueCI.confidence80,
                    confidence_95: revenueCI.confidence95,
                    trend: revenueForecast.trend,
                    growth_rate: revenueForecast.growthRate
                },
                customers: {
                    point_estimate: customerForecast.forecast,
                    confidence_80: customerCI.confidence80,
                    confidence_95: customerCI.confidence95,
                    trend: customerForecast.trend,
                    growth_rate: customerForecast.growthRate
                }
            },
            accuracy: {
                historical_mape: revenueForecast.mape,
                model_type: revenueForecast.modelType,
                r_squared: revenueForecast.rSquared
            },
            insights: this.generateInsights(revenueForecast, customerForecast)
        };
    }

    forecastSeries(historical, monthsAhead) {
        const n = historical.length;
        
        // Create time series (x = 0, 1, 2, ..., n-1)
        const x = Array.from({ length: n }, (_, i) => i);
        
        // Try linear regression first
        const linearRegression = ss.linearRegression(x.map((xi, i) => [xi, historical[i]]));
        const linearLine = ss.linearRegressionLine(linearRegression);
        
        // Calculate linear forecast
        const linearForecast = Array.from({ length: monthsAhead }, (_, i) => {
            const futureX = n + i;
            return Math.max(0, linearLine(futureX));
        });
        
        // Calculate linear regression metrics
        const linearPredictions = x.map(xi => linearLine(xi));
        const linearMape = this.calculateMAPE(historical, linearPredictions);
        const linearRSquared = ss.rSquared(x.map((xi, i) => [xi, historical[i]]), linearLine);
        
        // Calculate trend
        const firstHalf = historical.slice(0, Math.floor(n / 2));
        const secondHalf = historical.slice(Math.floor(n / 2));
        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        const trend = secondAvg > firstAvg ? 'growth' : secondAvg < firstAvg ? 'decline' : 'stable';
        
        // Calculate growth rate
        const growthRate = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
        
        return {
            forecast: linearForecast,
            modelType: 'linear_regression',
            mape: linearMape,
            rSquared: linearRSquared,
            trend: trend,
            growthRate: growthRate,
            slope: linearRegression.m,
            intercept: linearRegression.b
        };
    }

    calculateConfidenceIntervals(historical, forecast) {
        // Calculate standard error from historical volatility
        const mean = ss.mean(historical);
        const stdDev = ss.standardDeviation(historical);
        const standardError = stdDev / Math.sqrt(historical.length);
        
        // 80% CI: mean ± 1.28 * SE
        // 95% CI: mean ± 1.96 * SE
        const confidence80 = forecast.map(f => ({
            lower: Math.max(0, f - 1.28 * standardError),
            upper: f + 1.28 * standardError
        }));
        
        const confidence95 = forecast.map(f => ({
            lower: Math.max(0, f - 1.96 * standardError),
            upper: f + 1.96 * standardError
        }));
        
        return { confidence80, confidence95 };
    }

    calculateMAPE(actual, predicted) {
        let sum = 0;
        let count = 0;
        for (let i = 0; i < actual.length; i++) {
            if (actual[i] !== 0) {
                sum += Math.abs((actual[i] - predicted[i]) / actual[i]);
                count++;
            }
        }
        return count > 0 ? (sum / count) * 100 : 0;
    }

    async getHistoricalData(userId, months) {
        const db = getDb();
        
        // Get aggregated monthly data from user_metrics
        const data = await db.all(
            `SELECT 
                strftime('%Y-%m', date) as month,
                AVG(mrr) as revenue,
                AVG(active_customers) as customers
             FROM user_metrics 
             WHERE user_id = ? 
             AND date >= date('now', '-${months} months')
             GROUP BY strftime('%Y-%m', date)
             ORDER BY month`,
            [userId]
        );
        
        // If no metrics data, generate from scenarios
        if (data.length === 0) {
            const scenarios = await db.all(
                `SELECT * FROM scenarios WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
                [userId, months]
            );
            
            return scenarios.map((s, i) => ({
                month: this.getMonthLabel(i, months),
                revenue: s.projected_revenue || 0,
                customers: s.projected_customers || 0
            })).reverse();
        }
        
        return data.map(d => ({
            month: d.month,
            revenue: d.revenue || 0,
            customers: d.customers || 0
        }));
    }

    generateFutureMonths(lastMonth, count) {
        const months = [];
        const [year, month] = lastMonth.split('-').map(Number);
        let currentYear = year;
        let currentMonth = month;
        
        for (let i = 0; i < count; i++) {
            currentMonth++;
            if (currentMonth > 12) {
                currentMonth = 1;
                currentYear++;
            }
            months.push(`${currentYear}-${String(currentMonth).padStart(2, '0')}`);
        }
        
        return months;
    }

    getMonthLabel(index, total) {
        const d = new Date();
        d.setMonth(d.getMonth() - (total - index - 1));
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }

    generateInsights(revenueForecast, customerForecast) {
        const insights = [];
        
        // Revenue trend insight
        if (revenueForecast.trend === 'growth') {
            insights.push({
                type: 'positive',
                title: 'Revenue Growth Detected',
                message: `Your revenue is trending upward with a ${revenueForecast.growthRate.toFixed(1)}% growth rate.`
            });
        } else if (revenueForecast.trend === 'decline') {
            insights.push({
                type: 'warning',
                title: 'Revenue Decline',
                message: `Your revenue has declined by ${Math.abs(revenueForecast.growthRate).toFixed(1)}%. Consider reviewing your pricing or acquisition strategy.`
            });
        }
        
        // Customer growth insight
        if (customerForecast.trend === 'growth') {
            insights.push({
                type: 'positive',
                title: 'Customer Base Expanding',
                message: `Customer acquisition is strong with ${customerForecast.growthRate.toFixed(1)}% growth.`
            });
        }
        
        // Model accuracy
        if (revenueForecast.mape < 10) {
            insights.push({
                type: 'info',
                title: 'High Forecast Confidence',
                message: 'Your historical data shows consistent patterns. Forecasts should be reliable.'
            });
        } else if (revenueForecast.mape > 25) {
            insights.push({
                type: 'warning',
                title: 'High Volatility Detected',
                message: 'Your revenue has been unpredictable. Consider reviewing your business model for stability.'
            });
        }
        
        return insights;
    }

    async simulateScenario(userId, params) {
        // Get base forecast
        const baseForecast = await this.generateForecast(userId);
        
        if (baseForecast.error) {
            return baseForecast;
        }
        
        // Apply scenario parameters
        const { priceChange, growthRateChange, churnChange, adSpendChange } = params;
        
        // Adjust growth rate
        const adjustedGrowthRate = baseForecast.forecast.revenue.growth_rate + (growthRateChange || 0);
        
        // Apply adjustments to forecast
        const adjustedRevenue = baseForecast.forecast.revenue.point_estimate.map((val, i) => {
            // Apply growth rate adjustment
            const monthFactor = 1 + (adjustedGrowthRate / 100) * (i / 12);
            // Apply price change
            const priceFactor = 1 + (priceChange || 0) / 100;
            return val * monthFactor * priceFactor;
        });
        
        return {
            ...baseForecast,
            scenario: {
                parameters: params,
                adjusted_revenue: adjustedRevenue,
                impact_vs_baseline: adjustedRevenue.map((v, i) => ({
                    month: baseForecast.forecast.months[i],
                    difference: v - baseForecast.forecast.revenue.point_estimate[i],
                    percent_change: baseForecast.forecast.revenue.point_estimate[i] > 0 
                        ? ((v - baseForecast.forecast.revenue.point_estimate[i]) / baseForecast.forecast.revenue.point_estimate[i]) * 100 
                        : 0
                }))
            }
        };
    }
}

module.exports = new ForecastService();
