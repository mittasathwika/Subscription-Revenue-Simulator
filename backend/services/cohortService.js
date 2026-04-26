const { getDatabase: getDb } = require('../models/database');

class CohortService {
    constructor() {
        this.maxCohortMonths = 24;
    }

    async trackCustomer(userId, customerId, signupDate, initialRevenue = 0) {
        const db = getDb();
        const cohortMonth = this.getCohortMonth(signupDate);
        
        await db.run(
            `INSERT INTO customer_cohorts 
             (user_id, cohort_month, customer_id, signup_date, total_revenue, is_active)
             VALUES (?, ?, ?, ?, ?, 1)
             ON CONFLICT(user_id, customer_id) DO UPDATE SET
             cohort_month = excluded.cohort_month,
             total_revenue = customer_cohorts.total_revenue + ?`,
            [userId, cohortMonth, customerId, signupDate, initialRevenue, initialRevenue]
        );
        
        return true;
    }

    async recordPayment(userId, customerId, amount, paymentDate) {
        const db = getDb();
        
        await db.run(
            `UPDATE customer_cohorts 
             SET total_payments = total_payments + 1,
                 total_revenue = total_revenue + ?,
                 last_payment_date = ?,
                 is_active = 1
             WHERE user_id = ? AND customer_id = ?`,
            [amount, paymentDate, userId, customerId]
        );
        
        return true;
    }

    async markChurned(userId, customerId, churnDate) {
        const db = getDb();
        
        await db.run(
            `UPDATE customer_cohorts 
             SET is_active = 0, churned_date = ?
             WHERE user_id = ? AND customer_id = ?`,
            [churnDate, userId, customerId]
        );
        
        return true;
    }

    async calculateCohortRetention(userId, cohortMonth) {
        const db = getDb();
        
        // Get all customers from this cohort
        const customers = await db.all(
            `SELECT * FROM customer_cohorts 
             WHERE user_id = ? AND cohort_month = ?`,
            [userId, cohortMonth]
        );
        
        const startingCustomers = customers.length;
        if (startingCustomers === 0) return null;
        
        const retentionData = [];
        
        // Calculate retention for each month (0-12)
        for (let month = 0; month <= 12; month++) {
            const cutoffDate = this.addMonths(cohortMonth + '-01', month);
            
            const retained = customers.filter(c => {
                // Customer is retained if:
                // 1. They haven't churned by this month, OR
                // 2. They made a payment after this month started
                if (!c.churned_date) return true;
                return new Date(c.churned_date) > cutoffDate;
            }).length;
            
            const churned = startingCustomers - retained;
            const retentionRate = startingCustomers > 0 ? (retained / startingCustomers) * 100 : 0;
            
            // Calculate revenue retained
            const revenueRetained = customers
                .filter(c => !c.churned_date || new Date(c.churned_date) > cutoffDate)
                .reduce((sum, c) => sum + c.total_revenue, 0);
            
            retentionData.push({
                month_number: month,
                starting_customers: startingCustomers,
                retained_customers: retained,
                churned_customers: churned,
                retention_rate: retentionRate,
                revenue_retained: revenueRetained
            });
            
            // Store in database
            await db.run(
                `INSERT INTO cohort_retention 
                 (user_id, cohort_month, month_number, starting_customers, retained_customers, 
                  churned_customers, retention_rate, revenue_retained)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(user_id, cohort_month, month_number) DO UPDATE SET
                 starting_customers = excluded.starting_customers,
                 retained_customers = excluded.retained_customers,
                 churned_customers = excluded.churned_customers,
                 retention_rate = excluded.retention_rate,
                 revenue_retained = excluded.revenue_retained,
                 calculated_at = datetime('now')`,
                [userId, cohortMonth, month, startingCustomers, retained, churned, retentionRate, revenueRetained]
            );
        }
        
        return retentionData;
    }

    async getCohortAnalysis(userId, monthsBack = 12) {
        const db = getDb();
        
        // Get cohort months to analyze
        const endDate = new Date();
        const cohortMonths = [];
        for (let i = 0; i < monthsBack; i++) {
            const d = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
            cohortMonths.push(this.getCohortMonth(d));
        }
        
        const analysis = [];
        
        for (const cohortMonth of cohortMonths) {
            // Ensure retention is calculated
            await this.calculateCohortRetention(userId, cohortMonth);
            
            // Get retention data
            const retention = await db.all(
                `SELECT * FROM cohort_retention 
                 WHERE user_id = ? AND cohort_month = ?
                 ORDER BY month_number`,
                [userId, cohortMonth]
            );
            
            // Get summary stats
            const customers = await db.all(
                `SELECT * FROM customer_cohorts 
                 WHERE user_id = ? AND cohort_month = ?`,
                [userId, cohortMonth]
            );
            
            const totalRevenue = customers.reduce((sum, c) => sum + c.total_revenue, 0);
            const activeCustomers = customers.filter(c => c.is_active).length;
            const churnedCustomers = customers.filter(c => !c.is_active).length;
            const avgLTV = customers.length > 0 ? totalRevenue / customers.length : 0;
            
            analysis.push({
                cohort_month: cohortMonth,
                total_customers: customers.length,
                active_customers: activeCustomers,
                churned_customers: churnedCustomers,
                total_revenue: totalRevenue,
                avg_ltv: avgLTV,
                retention_curve: retention.map(r => ({
                    month: r.month_number,
                    rate: r.retention_rate,
                    customers: r.retained_customers,
                    revenue: r.revenue_retained
                }))
            });
        }
        
        return analysis;
    }

    async getBenchmarks(userId) {
        const analysis = await this.getCohortAnalysis(userId, 6);
        
        if (analysis.length === 0) {
            return {
                avg_month_1_retention: 0,
                avg_month_3_retention: 0,
                avg_month_6_retention: 0,
                avg_ltv: 0,
                total_cohorts: 0
            };
        }
        
        const avgM1 = analysis.reduce((sum, a) => {
            const m1 = a.retention_curve.find(r => r.month === 1);
            return sum + (m1?.rate || 0);
        }, 0) / analysis.length;
        
        const avgM3 = analysis.reduce((sum, a) => {
            const m3 = a.retention_curve.find(r => r.month === 3);
            return sum + (m3?.rate || 0);
        }, 0) / analysis.length;
        
        const avgM6 = analysis.reduce((sum, a) => {
            const m6 = a.retention_curve.find(r => r.month === 6);
            return sum + (m6?.rate || 0);
        }, 0) / analysis.length;
        
        const avgLTV = analysis.reduce((sum, a) => sum + a.avg_ltv, 0) / analysis.length;
        
        return {
            avg_month_1_retention: avgM1,
            avg_month_3_retention: avgM3,
            avg_month_6_retention: avgM6,
            avg_ltv: avgLTV,
            total_cohorts: analysis.length,
            industry_benchmark: {
                month_1: 75, // Industry average ~75%
                month_3: 60,
                month_6: 45
            }
        };
    }

    getCohortMonth(date) {
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }

    addMonths(dateStr, months) {
        const d = new Date(dateStr);
        d.setMonth(d.getMonth() + months);
        return d;
    }
}

module.exports = new CohortService();
