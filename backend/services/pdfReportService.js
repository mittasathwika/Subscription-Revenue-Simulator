const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

class PDFReportService {
    constructor() {
        this.templatesDir = path.join(__dirname, '../templates');
    }

    async generateInvestorReport(userId, userData, metrics, scenarios, options = {}) {
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        try {
            const page = await browser.newPage();
            
            // Generate HTML content
            const html = await this.generateInvestorReportHTML(userData, metrics, scenarios, options);
            
            await page.setContent(html, { waitUntil: 'networkidle0' });
            
            // Generate PDF
            const pdf = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20px',
                    right: '20px',
                    bottom: '20px',
                    left: '20px'
                }
            });
            
            return pdf;
        } finally {
            await browser.close();
        }
    }

    async generateInvestorReportHTML(userData, metrics, scenarios, options) {
        const reportDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const companyName = options.companyName || userData.company || 'Your Company';
        
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            max-width: 800px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            padding: 30px 0;
            border-bottom: 3px solid #3B82F6;
            margin-bottom: 30px;
        }
        .header h1 {
            font-size: 28px;
            color: #1f2937;
            margin: 0 0 10px 0;
        }
        .header .subtitle {
            color: #6B7280;
            font-size: 14px;
        }
        .section {
            margin-bottom: 30px;
        }
        .section h2 {
            color: #3B82F6;
            font-size: 18px;
            border-bottom: 2px solid #E5E7EB;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 30px;
        }
        .metric-card {
            background: #F9FAFB;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        .metric-value {
            font-size: 24px;
            font-weight: bold;
            color: #3B82F6;
        }
        .metric-label {
            font-size: 12px;
            color: #6B7280;
            margin-top: 5px;
        }
        .chart-placeholder {
            background: #F3F4F6;
            padding: 40px;
            text-align: center;
            border-radius: 8px;
            color: #6B7280;
        }
        .scenario-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        .scenario-table th {
            background: #3B82F6;
            color: white;
            padding: 12px;
            text-align: left;
        }
        .scenario-table td {
            padding: 12px;
            border-bottom: 1px solid #E5E7EB;
        }
        .scenario-table tr:nth-child(even) {
            background: #F9FAFB;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #E5E7EB;
            text-align: center;
            font-size: 12px;
            color: #6B7280;
        }
        .highlight-box {
            background: #DBEAFE;
            border-left: 4px solid #3B82F6;
            padding: 15px 20px;
            margin: 20px 0;
        }
        .highlight-box h3 {
            margin: 0 0 10px 0;
            color: #1E40AF;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${companyName}</h1>
        <div class="subtitle">Investor Report | ${reportDate}</div>
    </div>

    <div class="section">
        <h2>Executive Summary</h2>
        <div class="highlight-box">
            <h3>Key Highlights</h3>
            <ul>
                <li>Current MRR: $${metrics.mrr?.toLocaleString() || 'N/A'}</li>
                <li>ARR: $${metrics.arr?.toLocaleString() || 'N/A'}</li>
                <li>Active Customers: ${metrics.customers?.toLocaleString() || 'N/A'}</li>
                <li>Growth Rate: ${metrics.growthRate || metrics.growth_rate || 'N/A'}%</li>
            </ul>
        </div>
    </div>

    <div class="section">
        <h2>Key Metrics</h2>
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value">$${metrics.arr?.toLocaleString() || '0'}</div>
                <div class="metric-label">Annual Recurring Revenue</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${metrics.customers?.toLocaleString() || '0'}</div>
                <div class="metric-label">Active Customers</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${metrics.arpu?.toFixed(2) || '$0'}</div>
                <div class="metric-label">ARPU</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${metrics.ltv?.toLocaleString() || '$0'}</div>
                <div class="metric-label">Customer LTV</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${metrics.cac?.toLocaleString() || '$0'}</div>
                <div class="metric-label">Customer CAC</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${metrics.ltvCacRatio?.toFixed(2) || '0'}</div>
                <div class="metric-label">LTV:CAC Ratio</div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>Financial Projections</h2>
        <div class="chart-placeholder">
            Revenue projections chart would be embedded here<br>
            Based on current growth trajectory
        </div>
    </div>

    <div class="section">
        <h2>Scenario Analysis</h2>
        <table class="scenario-table">
            <thead>
                <tr>
                    <th>Scenario</th>
                    <th>12-Month Revenue</th>
                    <th>Growth Rate</th>
                    <th>Customers</th>
                </tr>
            </thead>
            <tbody>
                ${scenarios.map(s => `
                    <tr>
                        <td>${s.name || 'Unnamed Scenario'}</td>
                        <td>$${s.projected_revenue_12m?.toLocaleString() || 'N/A'}</td>
                        <td>${s.growth_rate || 'N/A'}%</td>
                        <td>${s.projected_customers?.toLocaleString() || 'N/A'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>Growth Strategy</h2>
        <p>This report provides an overview of the company's current financial health and projected growth based on historical data and market assumptions.</p>
        <ul>
            <li><strong>Customer Acquisition:</strong> Focus on reducing CAC while maintaining quality leads</li>
            <li><strong>Retention:</strong> Implement programs to improve customer LTV</li>
            <li><strong>Expansion:</strong> Explore upsell opportunities to increase ARPU</li>
        </ul>
    </div>

    <div class="footer">
        <p>Generated by Subscription Revenue Simulator</p>
        <p>Confidential - For Investor Review Only</p>
    </div>
</body>
</html>`;
    }

    async generateMonthlyReport(userId, userData, metrics, options = {}) {
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        try {
            const page = await browser.newPage();
            
            const html = await this.generateMonthlyReportHTML(userData, metrics, options);
            
            await page.setContent(html, { waitUntil: 'networkidle0' });
            
            const pdf = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20px',
                    right: '20px',
                    bottom: '20px',
                    left: '20px'
                }
            });
            
            return pdf;
        } finally {
            await browser.close();
        }
    }

    async generateMonthlyReportHTML(userData, metrics, options) {
        const reportDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long'
        });

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            max-width: 800px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            padding: 20px 0;
            border-bottom: 2px solid #10B981;
            margin-bottom: 20px;
        }
        .header h1 {
            font-size: 24px;
            color: #1f2937;
            margin: 0;
        }
        .month-stats {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin: 20px 0;
        }
        .stat-box {
            background: #ECFDF5;
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid #10B981;
        }
        .stat-value {
            font-size: 20px;
            font-weight: bold;
            color: #059669;
        }
        .stat-label {
            font-size: 12px;
            color: #6B7280;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Monthly Performance Report - ${reportDate}</h1>
    </div>
    
    <div class="month-stats">
        <div class="stat-box">
            <div class="stat-value">$${metrics.mrr?.toLocaleString() || '0'}</div>
            <div class="stat-label">Monthly Recurring Revenue</div>
        </div>
        <div class="stat-box">
            <div class="stat-value">${metrics.newCustomers || 0}</div>
            <div class="stat-label">New Customers This Month</div>
        </div>
        <div class="stat-box">
            <div class="stat-value">${metrics.churnRate || metrics.churn_rate || '0'}%</div>
            <div class="stat-label">Monthly Churn Rate</div>
        </div>
        <div class="stat-box">
            <div class="stat-value">${metrics.netRevenueRetention || '100'}%</div>
            <div class="stat-label">Net Revenue Retention</div>
        </div>
    </div>
</body>
</html>`;
    }

    async saveReport(pdfBuffer, filename) {
        const reportsDir = path.join(__dirname, '../reports');
        
        try {
            await fs.mkdir(reportsDir, { recursive: true });
        } catch (err) {
            // Directory exists
        }
        
        const filepath = path.join(reportsDir, filename);
        await fs.writeFile(filepath, pdfBuffer);
        
        return filepath;
    }
}

module.exports = new PDFReportService();
