/**
 * Phase 2 Enhanced Revenue Simulator
 * - Real data integration (with fallback to localStorage)
 * - Metrics calculation engine
 * - Scenario saving/comparison
 * - Backend API integration (when available)
 */

class EnhancedRevenueSimulator {
    constructor() {
        // Check authentication first
        this.authToken = localStorage.getItem('authToken') || null;
        this.currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
        const guestMode = localStorage.getItem('guestMode') === 'true';
        
        this.currentProjection = null;
        this.revenueChart = null;
        this.customerChart = null;
        this.scenarios = [];
        // Dynamic API URL: localhost for dev, relative /api for CloudFront proxy, absolute for S3 direct
        this.apiBaseUrl = window.location.hostname === 'localhost' 
            ? 'http://localhost:3001/api' 
            : window.location.hostname.includes('cloudfront.net')
                ? '/api'  // CloudFront proxies /api to backend
                : 'http://subscription-simulator-api-env.eba-bwarrbi6.us-east-1.elasticbeanstalk.com/api';
        this.useBackend = false;
        
        this.initializeEventListeners();
        this.initializeAuthEventListeners();
        this.updateAuthUI();
        
        // Redirect to login page if not authenticated and not in guest mode
        if (!this.authToken && !guestMode) {
            window.location.href = 'login.html';
            return;
        }
        
        // User is authenticated, load data
        this.loadScenarios();
        this.checkBackendConnection();
    }

    async checkBackendConnection() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/health`, { 
                method: 'GET',
                signal: AbortSignal.timeout(2000)
            });
            if (response.ok) {
                this.useBackend = true;
                console.log('✅ Backend connected');
                this.loadRealMetrics();
            }
        } catch (error) {
            console.log('ℹ️ Backend not available, using localStorage mode');
            this.useBackend = false;
            this.loadLocalRealMetrics();
        }
    }

    initializeEventListeners() {
        document.getElementById('calculateBtn')?.addEventListener('click', () => this.calculateProjections());
        document.getElementById('saveScenarioBtn')?.addEventListener('click', () => this.saveScenario());
        document.getElementById('exportBtn')?.addEventListener('click', () => this.exportData());
        document.getElementById('compareBtn')?.addEventListener('click', () => this.showComparison());
    }

    // LocalStorage-based real metrics (fallback when backend unavailable)
    loadLocalRealMetrics() {
        const saved = localStorage.getItem('realMetrics');
        if (saved) {
            const metrics = JSON.parse(saved);
            this.updateRealMetricsDisplay(metrics);
        }
    }

    saveLocalRealMetrics(metrics) {
        localStorage.setItem('realMetrics', JSON.stringify(metrics));
    }

    // Backend-based real metrics
    async loadRealMetrics() {
        if (!this.useBackend) return;
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/metrics`, {
                headers: this.getAuthHeaders()
            });
            if (response.ok) {
                const metrics = await response.json();
                this.updateRealMetricsDisplay(metrics);
            }
        } catch (error) {
            console.error('Failed to load real metrics:', error);
        }
    }

    updateRealMetricsDisplay(metrics) {
        const realMetricsDiv = document.getElementById('realMetrics');
        if (!realMetricsDiv) return;

        realMetricsDiv.innerHTML = `
            <div class="metrics-grid">
                <div class="metric-card real">
                    <label>Real Customers</label>
                    <value>${metrics.customers || 0}</value>
                </div>
                <div class="metric-card real">
                    <label>Real MRR</label>
                    <value>$${(metrics.monthly_revenue || 0).toLocaleString()}</value>
                </div>
                <div class="metric-card real">
                    <label>Real ARR</label>
                    <value>$${((metrics.monthly_revenue || 0) * 12).toLocaleString()}</value>
                </div>
                <div class="metric-card real">
                    <label>Churn Rate</label>
                    <value>${((metrics.churn_rate || 0) * 100).toFixed(1)}%</value>
                </div>
            </div>
            <small class="data-source">${metrics.source === 'real_data' ? '🟢 Live Data' : '⚪ Default Values'}</small>
        `;
    }

    getInputValues() {
        return {
            price: parseFloat(document.getElementById('price')?.value) || 99,
            churn: parseFloat(document.getElementById('churn')?.value) / 100 || 0.05,
            adSpend: parseFloat(document.getElementById('adSpend')?.value) || 5000,
            growthRate: parseFloat(document.getElementById('growthRate')?.value) / 100 || 0.10,
            initialCustomers: parseInt(document.getElementById('initialCustomers')?.value) || 100,
            cac: parseFloat(document.getElementById('cac')?.value) || 500
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

    // Enhanced calculation engine (matches backend logic)
    calculateProjections(inputs = null) {
        const data = inputs || this.getInputValues();
        const errors = this.validateInputs(data);
        
        if (errors.length > 0) {
            alert('Please fix the following errors:\n' + errors.join('\n'));
            return null;
        }
        
        const months = 12;
        const customers = [];
        const revenue = [];
        const newCustomersArr = [];
        const churnedCustomersArr = [];
        
        let currentCustomers = data.initialCustomers;
        
        for (let month = 0; month < months; month++) {
            // Formula: (Ad Spend / CAC) × (1 + Growth Rate × Month)
            const monthlyNewCustomers = Math.floor(
                (data.adSpend / data.cac) * (1 + data.growthRate * month)
            );
            
            const monthlyChurned = Math.floor(currentCustomers * data.churn);
            currentCustomers = Math.max(0, currentCustomers - monthlyChurned + monthlyNewCustomers);
            
            const monthlyRevenue = currentCustomers * data.price;
            
            customers.push(currentCustomers);
            revenue.push(monthlyRevenue);
            newCustomersArr.push(monthlyNewCustomers);
            churnedCustomersArr.push(monthlyChurned);
        }
        
        // Calculate key metrics
        const finalRevenue = revenue[revenue.length - 1];
        const finalCustomers = customers[customers.length - 1];
        const mrr = finalRevenue;
        const arr = mrr * 12;
        const arpu = finalCustomers > 0 ? mrr / finalCustomers : 0;
        const ltv = data.churn > 0 ? arpu / data.churn : arpu * 24;
        const ltvCacRatio = ltv / data.cac;
        const paybackPeriod = data.price > 0 ? data.cac / data.price : 0;
        
        this.currentProjection = {
            inputs: data,
            customers,
            revenue,
            newCustomers: newCustomersArr,
            churnedCustomers: churnedCustomersArr,
            metrics: {
                ltv,
                arr,
                ltvCacRatio,
                paybackPeriod,
                mrr,
                arpu
            }
        };
        
        this.updateMetricsDisplay();
        this.updateCharts();
        this.updateDetailedMetrics();
        
        return this.currentProjection;
    }

    updateMetricsDisplay() {
        if (!this.currentProjection) return;
        
        const { metrics } = this.currentProjection;
        
        const ltvEl = document.getElementById('ltvValue');
        const arrEl = document.getElementById('arrValue');
        const ltvCacEl = document.getElementById('ltvCacRatio');
        const paybackEl = document.getElementById('paybackPeriod');
        
        if (ltvEl) ltvEl.textContent = `$${metrics.ltv.toFixed(0)}`;
        if (arrEl) arrEl.textContent = `$${(metrics.arr / 1000).toFixed(0)}K`;
        if (ltvCacEl) ltvCacEl.textContent = metrics.ltvCacRatio.toFixed(2);
        if (paybackEl) paybackEl.textContent = `${metrics.paybackPeriod.toFixed(1)} months`;
    }

    updateDetailedMetrics() {
        const container = document.getElementById('detailedMetrics');
        if (!container || !this.currentProjection) return;
        
        const { metrics, revenue, customers } = this.currentProjection;
        const totalRevenue = revenue.reduce((a, b) => a + b, 0);
        
        container.innerHTML = `
            <div class="metrics-section">
                <h4>Revenue Metrics</h4>
                <div class="metric-row">
                    <span>MRR (Month 12):</span>
                    <strong>$${metrics.mrr.toLocaleString()}</strong>
                </div>
                <div class="metric-row">
                    <span>ARR (Month 12):</span>
                    <strong>$${metrics.arr.toLocaleString()}</strong>
                </div>
                <div class="metric-row">
                    <span>Total Revenue (12 mo):</span>
                    <strong>$${totalRevenue.toLocaleString()}</strong>
                </div>
                <div class="metric-row">
                    <span>ARPU:</span>
                    <strong>$${metrics.arpu.toFixed(2)}</strong>
                </div>
            </div>
            <div class="metrics-section">
                <h4>Growth Metrics</h4>
                <div class="metric-row">
                    <span>Final Customers:</span>
                    <strong>${customers[11].toLocaleString()}</strong>
                </div>
                <div class="metric-row">
                    <span>Customer Growth:</span>
                    <strong>${((customers[11] - customers[0]) / customers[0] * 100).toFixed(1)}%</strong>
                </div>
            </div>
        `;
    }

    updateCharts() {
        if (!this.currentProjection) return;
        
        const months = Array.from({length: 12}, (_, i) => `Month ${i + 1}`);
        
        // Revenue Chart
        const revenueCtx = document.getElementById('revenueChart')?.getContext('2d');
        if (revenueCtx) {
            if (this.revenueChart) this.revenueChart.destroy();
            
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
                        title: { display: true, text: 'Revenue Projection' },
                        legend: { display: false }
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
        }
        
        // Customer Chart
        const customerCtx = document.getElementById('customerChart')?.getContext('2d');
        if (customerCtx) {
            if (this.customerChart) this.customerChart.destroy();
            
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
                        title: { display: true, text: 'Customer Growth' },
                        legend: { display: false }
                    },
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }
    }

    // Scenario Management
    async saveScenario() {
        if (!this.currentProjection) {
            alert('Please calculate projections first');
            return;
        }
        
        const name = prompt('Enter scenario name:', `Scenario ${this.scenarios.length + 1}`);
        if (!name) return;
        
        const scenario = {
            id: Date.now().toString(),
            name,
            createdAt: new Date().toISOString(),
            ...this.currentProjection
        };
        
        if (this.useBackend) {
            try {
                const response = await fetch(`${this.apiBaseUrl}/scenarios`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({
                        name,
                        ...this.currentProjection.inputs
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    scenario.id = result.id;
                }
            } catch (error) {
                console.error('Backend save failed, using localStorage:', error);
            }
        }
        
        this.scenarios.push(scenario);
        this.saveScenarios();
        this.renderScenariosList();
        
        alert(`Scenario "${name}" saved successfully!`);
    }

    loadScenarios() {
        const saved = localStorage.getItem('scenarios');
        if (saved) {
            this.scenarios = JSON.parse(saved);
            this.renderScenariosList();
        }
        
        if (this.useBackend) {
            fetch(`${this.apiBaseUrl}/scenarios`, {
                headers: this.getAuthHeaders()
            })
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data && data.scenarios) {
                    // Merge backend scenarios with local
                    this.scenarios = [...this.scenarios, ...data.scenarios.map(s => ({
                        id: s.id,
                        name: s.name,
                        createdAt: s.created_at,
                        inputs: s.inputs
                    }))];
                    this.renderScenariosList();
                }
            })
            .catch(() => {});
        }
    }

    saveScenarios() {
        localStorage.setItem('scenarios', JSON.stringify(this.scenarios));
    }

    renderScenariosList() {
        const container = document.getElementById('scenariosList');
        if (!container) return;
        
        if (this.scenarios.length === 0) {
            container.innerHTML = '<p class="no-scenarios">No saved scenarios yet</p>';
            return;
        }
        
        container.innerHTML = this.scenarios.map(s => `
            <div class="scenario-item" data-id="${s.id}">
                <div class="scenario-info">
                    <strong>${s.name}</strong>
                    <small>${new Date(s.createdAt).toLocaleDateString()}</small>
                </div>
                <div class="scenario-actions">
                    <button onclick="simulator.loadScenario('${s.id}')" title="Load">📂</button>
                    <button onclick="simulator.deleteScenario('${s.id}')" title="Delete">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    loadScenario(id) {
        const scenario = this.scenarios.find(s => s.id === id);
        if (!scenario) return;
        
        const inputs = scenario.inputs || scenario; // Handle both formats
        
        document.getElementById('price').value = inputs.price;
        document.getElementById('churn').value = (inputs.churn || inputs.churn_rate || 0.05) * 100;
        document.getElementById('adSpend').value = inputs.adSpend || inputs.ad_spend || 5000;
        document.getElementById('growthRate').value = (inputs.growthRate || inputs.growth_rate || 0.10) * 100;
        document.getElementById('initialCustomers').value = inputs.initialCustomers || inputs.initial_customers || 100;
        document.getElementById('cac').value = inputs.cac || 500;
        
        this.calculateProjections();
    }

    deleteScenario(id) {
        if (!confirm('Delete this scenario?')) return;
        
        this.scenarios = this.scenarios.filter(s => s.id !== id);
        this.saveScenarios();
        this.renderScenariosList();
        
        if (this.useBackend) {
            fetch(`${this.apiBaseUrl}/scenarios/${id}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            }).catch(() => {});
        }
    }

    showComparison() {
        if (this.scenarios.length < 2) {
            alert('Need at least 2 saved scenarios to compare');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Compare Scenarios</h3>
                <div class="scenario-comparison">
                    ${this.scenarios.map(s => {
                        const inputs = s.inputs || s;
                        return `
                        <div class="comparison-card">
                            <h4>${s.name}</h4>
                            <div class="comparison-metrics">
                                <div>Price: $${inputs.price}</div>
                                <div>Churn: ${((inputs.churn || inputs.churn_rate || 0) * 100).toFixed(1)}%</div>
                                <div>Ad Spend: $${inputs.adSpend || inputs.ad_spend || 0}</div>
                                <div>Growth: ${((inputs.growthRate || inputs.growth_rate || 0) * 100).toFixed(1)}%</div>
                                <div>Initial: ${inputs.initialCustomers || inputs.initial_customers || 0}</div>
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
                <button onclick="this.closest('.modal').remove()">Close</button>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    exportData() {
        if (!this.currentProjection) {
            alert('Please calculate projections first');
            return;
        }
        
        const inputs = this.currentProjection.inputs;
        const customers = this.currentProjection.customers;
        const revenue = this.currentProjection.revenue;
        const metrics = this.currentProjection.metrics || this.calculateMetrics(this.currentProjection);
        const months = customers ? customers.length : 12;
        
        // Helper to format numbers without commas (commas break CSV columns)
        const fmt = (num) => Number(num || 0).toFixed(2);
        const fmtInt = (num) => Math.round(num || 0).toString();
        
        // Build CSV content
        let csv = 'Subscription Revenue Simulator - Export\n';
        csv += `Generated on,"${new Date().toLocaleString()}"\n\n`;
        
        // Section 1: Inputs
        csv += 'INPUTS\n';
        csv += 'Parameter,Value\n';
        csv += `Monthly Price,$${fmt(inputs?.price)}\n`;
        csv += `Churn Rate,${fmt((inputs?.churn || 0) * 100)}%\n`;
        csv += `Ad Spend,$${fmt(inputs?.adSpend)}\n`;
        csv += `Growth Rate,${fmt((inputs?.growthRate || 0) * 100)}%\n`;
        csv += `Initial Customers,${fmtInt(inputs?.initialCustomers)}\n`;
        csv += `CAC (Customer Acquisition Cost),$${fmt(inputs?.cac)}\n\n`;
        
        // Section 2: Key Metrics (with safe defaults)
        csv += 'KEY METRICS\n';
        csv += 'Metric,Value\n';
        csv += `Total Customers,${fmtInt(metrics?.totalCustomers || customers?.[customers.length-1] || 0)}\n`;
        csv += `Monthly Revenue,$${fmt(metrics?.monthlyRevenue || revenue?.[revenue.length-1] || 0)}\n`;
        csv += `Annual Revenue (ARR),$${fmt(metrics?.arr || 0)}\n`;
        csv += `Average Revenue Per User (ARPU),$${fmt(metrics?.arpu)}\n`;
        csv += `Customer Lifetime Value (LTV),$${fmt(metrics?.ltv)}\n`;
        csv += `LTV/CAC Ratio,${fmt(metrics?.ltvCacRatio)}\n`;
        csv += `CAC Payback Period,${fmt(metrics?.paybackPeriod)} months\n\n`;
        
        // Section 3: Monthly Projections
        csv += 'MONTHLY PROJECTIONS\n';
        csv += 'Month,Customers,Revenue\n';
        for (let i = 0; i < months; i++) {
            const cust = customers?.[i] || 0;
            const rev = revenue?.[i] || 0;
            csv += `Month ${i + 1},${fmtInt(cust)},$${fmt(rev)}\n`;
        }
        
        // Create and download CSV file
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `simulation-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // ==================== AUTHENTICATION METHODS ====================
    
    initializeAuthEventListeners() {
        // Login/Logout buttons
        document.getElementById('loginBtn')?.addEventListener('click', () => this.showAuthModal());
        document.getElementById('logoutBtn')?.addEventListener('click', () => this.logout());
        
        // Auth tabs
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchAuthTab(e.target.dataset.tab));
        });
        
        // Forms
        document.getElementById('loginForm')?.addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('signupForm')?.addEventListener('submit', (e) => this.handleSignup(e));
    }
    
    showAuthModal() {
        document.getElementById('authModal').style.display = 'flex';
        document.getElementById('loginError').textContent = '';
        document.getElementById('signupError').textContent = '';
        
        // Blur/hide dashboard content behind modal
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.style.filter = 'blur(5px)';
            mainContent.style.pointerEvents = 'none';
        }
    }
    
    hideAuthModal() {
        document.getElementById('authModal').style.display = 'none';
        
        // Restore dashboard content
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.style.filter = 'none';
            mainContent.style.pointerEvents = 'auto';
        }
    }
    
    switchAuthTab(tab) {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`.auth-tab[data-tab="${tab}"]`)?.classList.add('active');
        
        if (tab === 'login') {
            document.getElementById('loginForm').style.display = 'block';
            document.getElementById('signupForm').style.display = 'none';
        } else {
            document.getElementById('loginForm').style.display = 'none';
            document.getElementById('signupForm').style.display = 'block';
        }
    }
    
    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const errorDiv = document.getElementById('loginError');
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.setAuth(data.token, data.user);
                this.hideAuthModal();
                this.loadScenarios(); // Reload with user-specific scenarios
            } else {
                errorDiv.textContent = data.error || 'Login failed';
            }
        } catch (error) {
            errorDiv.textContent = 'Network error. Is the backend running?';
        }
    }
    
    async handleSignup(e) {
        e.preventDefault();
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const errorDiv = document.getElementById('signupError');
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.setAuth(data.token, data.user);
                this.hideAuthModal();
            } else {
                errorDiv.textContent = data.error || 'Signup failed';
            }
        } catch (error) {
            errorDiv.textContent = 'Network error. Is the backend running?';
        }
    }
    
    setAuth(token, user) {
        this.authToken = token;
        this.currentUser = user;
        localStorage.setItem('authToken', token);
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.updateAuthUI();
        this.useBackend = true;
        this.loadRealMetrics();
    }
    
    logout() {
        this.authToken = null;
        this.currentUser = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('guestMode');
        window.location.href = 'login.html';
    }
    
    updateAuthUI() {
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const userInfo = document.getElementById('userInfo');
        
        if (this.currentUser) {
            loginBtn.style.display = 'none';
            userInfo.style.display = 'inline';
            // Show first_name + last_name if available, otherwise email
            const firstName = this.currentUser.first_name || '';
            const lastName = this.currentUser.last_name || '';
            if (firstName || lastName) {
                userInfo.textContent = `${firstName} ${lastName}`.trim();
                userInfo.title = this.currentUser.email; // Tooltip with email
            } else {
                userInfo.textContent = this.currentUser.email;
            }
            logoutBtn.style.display = 'inline';
        } else {
            loginBtn.style.display = 'inline';
            userInfo.style.display = 'none';
            logoutBtn.style.display = 'none';
        }
    }
    
    // Get headers for authenticated API calls
    getAuthHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        } else if (this.currentUser?.email) {
            headers['x-user-id'] = this.currentUser.email;
        } else {
            headers['x-user-id'] = 'demo@example.com';
        }
        
        return headers;
    }
}

// Initialize simulator
const simulator = new EnhancedRevenueSimulator();

// Calculate initial projections on page load
window.addEventListener('load', () => {
    simulator.calculateProjections();
});
