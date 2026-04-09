# Subscription Revenue Simulator

A powerful SaaS financial modeling tool designed to help startup founders understand key metrics like churn, CAC, LTV, and ARR modeling.

## Features

### Core Functionality
- **Financial Modeling Engine**: Calculates 12-month revenue projections based on input parameters
- **Interactive Charts**: Visualizes revenue growth and customer acquisition over time
- **Key Metrics Display**: Shows LTV, ARR, LTV/CAC ratio, and payback period
- **CSV Export**: Download detailed projection data for further analysis
- **Scenario Comparison**: Save and compare multiple business scenarios

### Input Parameters
- **Monthly Price**: Subscription price per customer
- **Monthly Churn Rate**: Percentage of customers lost each month
- **Monthly Ad Spend**: Marketing budget for customer acquisition
- **Monthly Growth Rate**: Expected growth in new customer acquisition
- **Initial Customers**: Starting customer count
- **Customer Acquisition Cost (CAC)**: Cost to acquire one new customer

### Key Metrics Calculated
- **Lifetime Value (LTV)**: Total revenue expected from a single customer
- **Annual Recurring Revenue (ARR)**: Projected annual revenue based on current trajectory
- **LTV/CAC Ratio**: Efficiency metric showing return on acquisition investment
- **Payback Period**: Time required to recover customer acquisition costs

## How to Use

1. **Open the Application**: Open `index.html` in your web browser
2. **Input Business Parameters**: Enter your SaaS business metrics in the input fields
3. **Calculate Projections**: Click "Calculate Projections" to see 12-month forecasts
4. **View Metrics**: Review key financial metrics displayed in the dashboard
5. **Analyze Charts**: Study revenue and customer growth visualizations
6. **Save Scenarios**: Save different parameter sets for comparison
7. **Export Data**: Download CSV files for detailed analysis

## Financial Formulas

### LTV Calculation
```
LTV = Monthly Price / Monthly Churn Rate
```

### Payback Period
```
Payback Period = CAC / Monthly Price
```

### Customer Projection
```
New Customers = (Ad Spend / CAC) × (1 + Growth Rate × Month)
Churned Customers = Current Customers × Churn Rate
Current Customers = Previous Customers - Churned + New Customers
```

## Technical Implementation

### Technologies Used
- **HTML5**: Semantic structure and form elements
- **CSS3**: Modern styling with gradients and animations
- **JavaScript (ES6+):** Financial modeling engine and interactivity
- **Chart.js**: Professional data visualization library

### File Structure
```
subscription-revenue-simulator/
├── index.html          # Main application structure
├── styles.css          # Modern UI styling
├── script.js           # Financial modeling engine
└── README.md           # Project documentation
```

### Key Classes and Functions
- `RevenueSimulator`: Main application class
- `calculateProjections()`: Core financial modeling logic
- `calculateLTV()`: Lifetime value calculation
- `calculatePaybackPeriod()`: CAC recovery time calculation
- `updateCharts()`: Chart rendering and updates
- `exportToCSV()`: Data export functionality

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Use Cases

### For Startup Founders
- Validate business model assumptions
- Understand unit economics
- Plan growth strategies
- Prepare investor pitches

### For Financial Analysts
- Model different growth scenarios
- Analyze customer acquisition efficiency
- Forecast revenue trajectories
- Compare market strategies

### For Product Managers
- Understand pricing impact
- Model feature adoption effects
- Plan customer retention strategies
- Optimize acquisition channels

## Getting Started

1. Clone or download the project files
2. Open `index.html` in a modern web browser
3. Start experimenting with different business parameters
4. Save scenarios for comparison
5. Export data for presentations or further analysis

## Future Enhancements

- Multiple pricing tiers support
- Cohort analysis visualization
- Advanced churn prediction models
- Integration with accounting software
- Team collaboration features
- Advanced sensitivity analysis

---

Built with ❤️ for startup founders who want to understand their SaaS metrics better.
