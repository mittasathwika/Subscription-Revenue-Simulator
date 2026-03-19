class RevenueSimulator {
    constructor() {
        this.scenarios = [];
        this.currentProjection = null;
        this.revenueChart = null;
        this.customerChart = null;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        document.getElementById('calculateBtn').addEventListener('click', () => this.calculateProjections());
        document.getElementById('saveScenarioBtn').addEventListener('click', () => this.saveScenario());
        document.getElementById('compareBtn').addEventListener('click', () => this.toggleScenariosSection());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportToCSV());
        document.getElementById('clearScenariosBtn').addEventListener('click', () => this.clearScenarios());
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

    calculateProjections() {
        // Add loading state
        const calculateBtn = document.getElementById('calculateBtn');
        const originalText = calculateBtn.textContent;
        calculateBtn.textContent = 'Calculating...';
        calculateBtn.disabled = true;
        calculateBtn.classList.add('loading-pulse');
        
        // Simulate calculation delay for better UX
        setTimeout(() => {
            const inputs = this.getInputValues();
            const months = 12;
            
            // Initialize arrays for projections
            const customers = [];
            const revenue = [];
            const newCustomers = [];
            const churnedCustomers = [];
            
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
                newCustomers.push(monthlyNewCustomers);
                churnedCustomers.push(monthlyChurned);
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
                newCustomers,
                churnedCustomers,
                ltv,
                arr,
                ltvCacRatio,
                paybackPeriod
            };
            
            // Update UI with animation
            this.updateMetricsDisplay();
            this.updateCharts();
            
            // Reset button state
            calculateBtn.textContent = originalText;
            calculateBtn.disabled = false;
            calculateBtn.classList.remove('loading-pulse');
            
            // Show success feedback
            this.showNotification('Projections calculated successfully!', 'success');
        }, 800);
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
        
        const metrics = [
            { id: 'ltvValue', value: `$${this.currentProjection.ltv.toFixed(0)}`, suffix: '' },
            { id: 'arrValue', value: `$${(this.currentProjection.arr / 1000).toFixed(0)}K`, suffix: '' },
            { id: 'ltvCacRatio', value: this.currentProjection.ltvCacRatio.toFixed(2), suffix: '' },
            { id: 'paybackPeriod', value: `${this.currentProjection.paybackPeriod.toFixed(1)} months`, suffix: '' }
        ];
        
        metrics.forEach((metric, index) => {
            const element = document.getElementById(metric.id);
            setTimeout(() => {
                element.style.transform = 'scale(0.8)';
                element.style.opacity = '0';
                
                setTimeout(() => {
                    element.textContent = metric.value;
                    element.style.transform = 'scale(1)';
                    element.style.opacity = '1';
                }, 150);
            }, index * 100);
        });
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 24px;
            background: ${type === 'success' ? 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
            color: white;
            border-radius: 12px;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
            z-index: 1000;
            transform: translateX(400px);
            transition: transform 0.3s ease;
            font-weight: 600;
            max-width: 300px;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    updateCharts() {
        if (!this.currentProjection) return;
        
        const months = Array.from({length: 12}, (_, i) => `Month ${i + 1}`);
        
        // Enhanced chart configuration
        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    borderRadius: 8,
                    titleFont: {
                        size: 14,
                        weight: '600'
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y.toLocaleString();
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 12,
                            weight: '500'
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        font: {
                            size: 12,
                            weight: '500'
                        }
                    }
                }
            },
            animation: {
                duration: 1500,
                easing: 'easeInOutQuart'
            }
        };
        
        // Revenue Chart
        const revenueCtx = document.getElementById('revenueChart').getContext('2d');
        if (this.revenueChart) {
            this.revenueChart.destroy();
        }
        
        const revenueOptions = JSON.parse(JSON.stringify(chartOptions));
        revenueOptions.plugins.title = {
            display: true,
            text: 'Revenue Projection',
            font: {
                size: 16,
                weight: '700'
            },
            color: '#2d3748',
            padding: 20
        };
        revenueOptions.scales.y.ticks.callback = function(value) {
            return '$' + (value / 1000).toFixed(0) + 'K';
        };
        
        this.revenueChart = new Chart(revenueCtx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'Monthly Revenue ($)',
                    data: this.currentProjection.revenue,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 4,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#667eea',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: revenueOptions
        });
        
        // Customer Chart
        const customerCtx = document.getElementById('customerChart').getContext('2d');
        if (this.customerChart) {
            this.customerChart.destroy();
        }
        
        const customerOptions = JSON.parse(JSON.stringify(chartOptions));
        customerOptions.plugins.title = {
            display: true,
            text: 'Customer Growth',
            font: {
                size: 16,
                weight: '700'
            },
            color: '#2d3748',
            padding: 20
        };
        
        this.customerChart = new Chart(customerCtx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'Total Customers',
                    data: this.currentProjection.customers,
                    borderColor: '#48bb78',
                    backgroundColor: 'rgba(72, 187, 120, 0.1)',
                    borderWidth: 4,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#48bb78',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: customerOptions
        });
    }

    saveScenario() {
        if (!this.currentProjection) {
            alert('Please calculate projections first!');
            return;
        }
        
        const scenarioName = prompt('Enter a name for this scenario:');
        if (!scenarioName) return;
        
        const scenario = {
            id: Date.now(),
            name: scenarioName,
            timestamp: new Date().toLocaleString(),
            ...this.currentProjection
        };
        
        this.scenarios.push(scenario);
        this.updateScenariosDisplay();
        alert('Scenario saved successfully!');
    }

    toggleScenariosSection() {
        const section = document.getElementById('scenariosSection');
        section.style.display = section.style.display === 'none' ? 'block' : 'none';
        this.updateScenariosDisplay();
    }

    updateScenariosDisplay() {
        const container = document.getElementById('scenariosList');
        
        if (this.scenarios.length === 0) {
            container.innerHTML = '<p>No scenarios saved yet.</p>';
            return;
        }
        
        container.innerHTML = this.scenarios.map(scenario => `
            <div class="scenario-item">
                <h4>${scenario.name}</h4>
                <p><small>Saved: ${scenario.timestamp}</small></p>
                <div class="scenario-metrics">
                    <div class="scenario-metric">
                        <strong>Price:</strong> $${scenario.inputs.price}/mo
                    </div>
                    <div class="scenario-metric">
                        <strong>Churn:</strong> ${(scenario.inputs.churn * 100).toFixed(1)}%
                    </div>
                    <div class="scenario-metric">
                        <strong>LTV:</strong> $${scenario.ltv.toFixed(0)}
                    </div>
                    <div class="scenario-metric">
                        <strong>ARR:</strong> $${(scenario.arr / 1000).toFixed(0)}K
                    </div>
                    <div class="scenario-metric">
                        <strong>LTV/CAC:</strong> ${scenario.ltvCacRatio.toFixed(2)}
                    </div>
                    <div class="scenario-metric">
                        <strong>12mo Revenue:</strong> $${(scenario.revenue[11] / 1000).toFixed(0)}K
                    </div>
                </div>
                <button onclick="simulator.deleteScenario(${scenario.id})" class="btn-secondary" style="margin-top: 10px; padding: 8px 16px; font-size: 0.9rem;">Delete</button>
            </div>
        `).join('');
    }

    deleteScenario(id) {
        this.scenarios = this.scenarios.filter(s => s.id !== id);
        this.updateScenariosDisplay();
    }

    clearScenarios() {
        if (confirm('Are you sure you want to clear all scenarios?')) {
            this.scenarios = [];
            this.updateScenariosDisplay();
        }
    }

    exportToCSV() {
        if (!this.currentProjection) {
            alert('Please calculate projections first!');
            return;
        }
        
        let csv = 'Month,Customers,Revenue,New Customers,Churned Customers\n';
        
        for (let i = 0; i < 12; i++) {
            csv += `${i + 1},${this.currentProjection.customers[i]},`;
            csv += `${this.currentProjection.revenue[i]},`;
            csv += `${this.currentProjection.newCustomers[i]},`;
            csv += `${this.currentProjection.churnedCustomers[i]}\n`;
        }
        
        // Add summary data
        csv += '\nSummary\n';
        csv += `LTV,${this.currentProjection.ltv}\n`;
        csv += `ARR,${this.currentProjection.arr}\n`;
        csv += `LTV/CAC Ratio,${this.currentProjection.ltvCacRatio}\n`;
        csv += `Payback Period (months),${this.currentProjection.paybackPeriod}\n`;
        
        // Add input parameters
        csv += '\nInput Parameters\n';
        csv += `Price ($),${this.currentProjection.inputs.price}\n`;
        csv += `Churn Rate (%),${this.currentProjection.inputs.churn * 100}\n`;
        csv += `Ad Spend ($),${this.currentProjection.inputs.adSpend}\n`;
        csv += `Growth Rate (%),${this.currentProjection.inputs.growthRate * 100}\n`;
        csv += `Initial Customers,${this.currentProjection.inputs.initialCustomers}\n`;
        csv += `CAC ($),${this.currentProjection.inputs.cac}\n`;
        
        // Create and download file
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `revenue-projection-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }
}

// Initialize the simulator when the page loads
const simulator = new RevenueSimulator();

// Calculate initial projections on page load
window.addEventListener('load', () => {
    simulator.calculateProjections();
    initializeScrollAnimations();
    addInputAnimations();
    addButtonEffects();
});

// Scroll animations
function initializeScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
    });
}

// Input field animations
function addInputAnimations() {
    const inputs = document.querySelectorAll('input[type="number"]');
    
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.style.transform = 'scale(1.02)';
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.style.transform = 'scale(1)';
        });
        
        input.addEventListener('input', function() {
            if (this.value && this.value !== this.defaultValue) {
                this.style.borderColor = '#48bb78';
            } else {
                this.style.borderColor = '';
            }
        });
    });
}

// Button ripple effects
function addButtonEffects() {
    const buttons = document.querySelectorAll('button');
    
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.6);
                left: ${x}px;
                top: ${y}px;
                pointer-events: none;
                transform: scale(0);
                animation: ripple 0.6s ease-out;
            `;
            
            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);
            
            setTimeout(() => ripple.remove(), 600);
        });
    });
}

// Add CSS for ripple animation
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
