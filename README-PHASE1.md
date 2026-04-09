# Subscription Revenue Simulator - Phase 1

## Overview
Phase 1 of the Subscription Revenue Simulator focuses on core functionality and problem validation. This version provides essential SaaS metrics and basic revenue projections without advanced features.

## Phase 1 Features

### ✅ Core Functionality
- **Revenue Calculations**: Basic 12-month revenue projections
- **Key Metrics**: LTV, ARR, LTV/CAC Ratio, Payback Period
- **Input Validation**: Ensures data integrity and user input correctness
- **Basic Visualizations**: Revenue and customer growth charts
- **Responsive Design**: Works on desktop and mobile devices

### ✅ Business Parameters
- Monthly Price
- Monthly Churn Rate
- Monthly Ad Spend
- Monthly Growth Rate
- Initial Customers
- Customer Acquisition Cost (CAC)

### ✅ Key Metrics Calculated
- **Lifetime Value (LTV)**: Total revenue expected from a customer
- **Annual Recurring Revenue (ARR)**: Annualized recurring revenue
- **LTV/CAC Ratio**: Efficiency metric for customer acquisition
- **Payback Period**: Time to recover customer acquisition costs

### ✅ Charts
- 12-month revenue projection
- 12-month customer growth projection

## Phase 1 Limitations
- No scenario comparison features
- No export functionality
- Basic styling (no advanced animations)
- No data persistence
- Single calculation at a time

## Technical Implementation
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Charts**: Chart.js for data visualization
- **Design**: Clean, functional UI focused on usability
- **Validation**: Input validation for all business parameters

## Files Structure
```
phase1-index.html      # Main HTML structure
phase1-styles.css     # Basic styling (no advanced effects)
phase1-script.js      # Core calculation logic
README-PHASE1.md      # This documentation
```

## Getting Started
1. Open `phase1-index.html` in a web browser
2. Adjust business parameters as needed
3. Click "Calculate Projections" to see results
4. Review key metrics and charts

## Validation Rules
- Price must be greater than 0
- Churn rate must be between 0% and 100%
- Ad spend cannot be negative
- Growth rate cannot be negative
- Initial customers cannot be negative
- CAC must be greater than 0

## Next Phases
Phase 2 will include:
- Advanced UI/UX with animations
- Scenario comparison features
- Export functionality
- Data persistence
- Enhanced visualizations
