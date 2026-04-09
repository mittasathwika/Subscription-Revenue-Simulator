/**
 * Metrics Calculation Engine
 * Handles all financial calculations for real data and simulations
 */

class MetricsEngine {
    /**
     * Calculate LTV (Lifetime Value)
     * Formula: LTV = ARPU / Churn Rate
     */
    static calculateLTV(arpu, churnRate) {
        if (churnRate === 0 || churnRate === 0.00) {
            return arpu * 24; // Cap at 24 months if no churn
        }
        return arpu / churnRate;
    }

    /**
     * Calculate Payback Period
     * Formula: CAC / Monthly Contribution
     */
    static calculatePaybackPeriod(monthlyContribution, cac) {
        if (monthlyContribution <= 0) return Infinity;
        return cac / monthlyContribution;
    }

    /**
     * Calculate ARR (Annual Recurring Revenue)
     * Formula: MRR × 12
     */
    static calculateARR(mrr) {
        return mrr * 12;
    }

    /**
     * Calculate Churn Rate
     * Formula: (Customers Lost / Total Customers) × 100
     */
    static calculateChurnRate(customersLost, totalCustomers) {
        if (totalCustomers === 0) return 0;
        return (customersLost / totalCustomers);
    }

    /**
     * Calculate CAC (Customer Acquisition Cost)
     * Formula: Total Marketing Spend / New Customers
     */
    static calculateCAC(totalMarketingSpend, newCustomers) {
        if (newCustomers === 0) return 0;
        return totalMarketingSpend / newCustomers;
    }

    /**
     * Calculate 12-month projections
     */
    static calculateProjections(inputs) {
        const months = inputs.months || 12;
        const customers = [];
        const revenue = [];
        const newCustomersArr = [];
        const churnedCustomersArr = [];
        
        let currentCustomers = inputs.initialCustomers;
        
        for (let month = 0; month < months; month++) {
            // Calculate new customers from ad spend and growth
            const monthlyNewCustomers = Math.floor(
                (inputs.adSpend / inputs.cac) * (1 + inputs.growthRate * month)
            );
            
            // Calculate churned customers
            const monthlyChurned = Math.floor(currentCustomers * inputs.churn);
            
            // Update customer count
            currentCustomers = currentCustomers - monthlyChurned + monthlyNewCustomers;
            currentCustomers = Math.max(0, currentCustomers);
            
            // Calculate monthly revenue
            const monthlyRevenue = currentCustomers * inputs.price;
            
            customers.push(currentCustomers);
            revenue.push(monthlyRevenue);
            newCustomersArr.push(monthlyNewCustomers);
            churnedCustomersArr.push(monthlyChurned);
        }
        
        // Calculate key metrics from final month
        const finalMonth = months - 1;
        const finalRevenue = revenue[finalMonth];
        const finalCustomers = customers[finalMonth];
        const mrr = finalRevenue;
        const arr = this.calculateARR(mrr);
        const arpu = finalCustomers > 0 ? mrr / finalCustomers : 0;
        const ltv = this.calculateLTV(arpu, inputs.churn);
        const ltvCacRatio = inputs.cac > 0 ? ltv / inputs.cac : 0;
        const paybackPeriod = this.calculatePaybackPeriod(inputs.price, inputs.cac);
        
        return {
            months: Array.from({length: months}, (_, i) => i + 1),
            customers,
            revenue,
            newCustomers: newCustomersArr,
            churnedCustomers: churnedCustomersArr,
            metrics: {
                mrr,
                arr,
                arpu,
                ltv,
                ltv_cac_ratio: ltvCacRatio,
                payback_period: paybackPeriod
            }
        };
    }

    /**
     * Validate simulation inputs
     */
    static validateInputs(inputs) {
        const errors = [];
        const warnings = [];
        
        if (inputs.price <= 0) errors.push('Price must be greater than 0');
        if (inputs.churn < 0 || inputs.churn > 1) errors.push('Churn rate must be between 0% and 100%');
        if (inputs.adSpend < 0) errors.push('Ad spend cannot be negative');
        if (inputs.growthRate < 0) errors.push('Growth rate cannot be negative');
        if (inputs.initialCustomers < 0) errors.push('Initial customers cannot be negative');
        if (inputs.cac <= 0) errors.push('CAC must be greater than 0');
        
        if (inputs.churn > 0.20) warnings.push('Churn rate is very high (>20%)');
        if (inputs.ltvCacRatio < 3) warnings.push('LTV:CAC ratio is below 3:1 benchmark');
        if (inputs.paybackPeriod > 12) warnings.push('Payback period exceeds 12 months');
        
        return { valid: errors.length === 0, errors, warnings };
    }
}

module.exports = MetricsEngine;
