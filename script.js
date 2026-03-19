class RevenueSimulator {
    constructor() {
        this.currentProjection = null;
        this.revenueChart = null;
        this.customerChart = null;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        document.getElementById('calculateBtn').addEventListener('click', () => this.calculateProjections());
    }

    getInputValues() {
        return {
            price: parseFloat(document.getElementById('price').value) || 99,
            churn: parseFloat(document.getElementById('churn').value) / 100 || 0.05,
            adSpend: parseFloat(document.getElementById('adSpend').value) || 5000,
            growthRate: parseFloat(document.getElementById('growthRate').value) / 100 || 0.10,
            initialCustomers: parseInt(document.getElementById('initialCustomers').value) || 100,
            cac: parseFloat(document.getElementById('cac').value) || 500
        };
    }

    validateInputs(inputs) {
        const errors = [];
        
        if (inputs.price <= 0) errors.push('Price must be greater than 0');
        if (inputs.churn < 0 || inputs.churn > 1) errors.push('Churn rate must be between 0% and 100%');
        if (inputs.adSpend < 0) errors.push('Ad spend cannot be negative');
        if (inputs.growthRate < 0) errors.push('Growth rate cannot be negative');
        if (inputs.initialCustomers < 0) errors.push('Initial customers cannot be negative');
        if (inputs.cac <= 0) errors.push('CAC must be greater than 0');
        
        return errors;
    }

    calculateProjections() {
        const inputs = this.getInputValues();
        const errors = this.validateInputs(inputs);
        
        if (errors.length > 0) {
            alert('Please fix the following errors:\n' + errors.join('\n'));
            return;
        }
        
        const months = 12;
        
        // Initialize arrays for projections
        const customers = [];
        const revenue = [];
        
        let currentCustomers = inputs.initialCustomers;
        
        for (let month = 0; month < months; month++) {
            // Calculate new customers from ad spend and growth
            const monthlyNewCustomers = Math.floor((inputs.adSpend / inputs.cac) * (1 + inputs.growthRate * month));
            
            // Calculate churned customers
            const monthlyChurned = Math.floor(currentCustomers * inputs.churn);
            
            // Update customer count
            currentCustomers = currentCustomers - monthlyChurned + monthlyNewCustomers;
            currentCustomers = Math.max(0, currentCustomers);
            
            // Calculate monthly revenue
            const monthlyRevenue = currentCustomers * inputs.price;
            
            customers.push(currentCustomers);
            revenue.push(monthlyRevenue);
        }
        
        // Calculate key metrics
        const ltv = this.calculateLTV(inputs.price, inputs.churn);
        const arr = revenue[11] * 12; // Use last month revenue for ARR
        const ltvCacRatio = ltv / inputs.cac;
        const paybackPeriod = this.calculatePaybackPeriod(inputs.price, inputs.cac, inputs.churn);
        
        // Store projection
        this.currentProjection = {
            inputs,
            customers,
            revenue,
            ltv,
            arr,
            ltvCacRatio,
            paybackPeriod
        };
        
        // Update UI
        this.updateMetricsDisplay();
        this.updateCharts();
    }

    calculateLTV(price, churn) {
        if (churn === 0) return Infinity;
        return (price / churn);
    }

    calculatePaybackPeriod(price, cac, churn) {
        if (churn === 0) return Infinity;
        const monthlyContribution = price;
        return cac / monthlyContribution;
    }

    updateMetricsDisplay() {
        if (!this.currentProjection) return;
        
        document.getElementById('ltvValue').textContent = 
            `$${this.currentProjection.ltv.toFixed(0)}`;
        document.getElementById('arrValue').textContent = 
            `$${(this.currentProjection.arr / 1000).toFixed(0)}K`;
        document.getElementById('ltvCacRatio').textContent = 
            this.currentProjection.ltvCacRatio.toFixed(2);
        document.getElementById('paybackPeriod').textContent = 
            `${this.currentProjection.paybackPeriod.toFixed(1)} months`;
    }

    updateCharts() {
        if (!this.currentProjection) return;
        
        const months = Array.from({length: 12}, (_, i) => `Month ${i + 1}`);
        
        // Revenue Chart
        const revenueCtx = document.getElementById('revenueChart').getContext('2d');
        if (this.revenueChart) {
            this.revenueChart.destroy();
        }
        
        this.revenueChart = new Chart(revenueCtx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'Monthly Revenue ($)',
                    data: this.currentProjection.revenue,
                    borderColor: '#3182ce',
                    backgroundColor: 'rgba(49, 130, 206, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Revenue Projection'
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + (value / 1000).toFixed(0) + 'K';
                            }
                        }
                    }
                }
            }
        });
        
        // Customer Chart
        const customerCtx = document.getElementById('customerChart').getContext('2d');
        if (this.customerChart) {
            this.customerChart.destroy();
        }
        
        this.customerChart = new Chart(customerCtx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'Total Customers',
                    data: this.currentProjection.customers,
                    borderColor: '#48bb78',
                    backgroundColor: 'rgba(72, 187, 120, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Customer Growth'
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

// Initialize the simulator when the page loads
const simulator = new RevenueSimulator();

// Calculate initial projections on page load
window.addEventListener('load', () => {
    simulator.calculateProjections();
});
