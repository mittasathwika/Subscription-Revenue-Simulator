# Phase 1 Database Schema Design

## Overview
Lightweight schema for Phase 1 MVP focused on storing user inputs and calculation results. No user authentication in Phase 1 - data stored locally or in simple session storage.

---

## Entity Relationship Diagram

```
┌─────────────────────┐     ┌─────────────────────────┐
│   Calculation       │     │   ProjectionMonth       │
│   Session           │────▶│   (12 months per calc)   │
├─────────────────────┤ 1:N ├─────────────────────────┤
│ PK: session_id      │     │ PK: projection_id         │
│   timestamp         │     │ FK: session_id            │
│   input_parameters  │     │   month_number            │
│   key_metrics       │     │   customers               │
│                     │     │   revenue                 │
│                     │     │   new_customers           │
│                     │     │   churned_customers       │
└─────────────────────┘     └─────────────────────────┘
```

---

## Table: calculation_sessions

Stores each calculation run with inputs and summary metrics.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| session_id | UUID | Primary key | PRIMARY KEY, AUTO-GENERATE |
| created_at | TIMESTAMP | When calculation ran | NOT NULL, DEFAULT NOW() |
| monthly_price | DECIMAL(10,2) | Subscription price | NOT NULL, CHECK > 0 |
| monthly_churn_rate | DECIMAL(5,4) | Churn % as decimal | NOT NULL, CHECK 0-1 |
| monthly_ad_spend | DECIMAL(10,2) | Marketing budget | NOT NULL, CHECK >= 0 |
| growth_rate | DECIMAL(5,4) | Growth % as decimal | NOT NULL, CHECK >= 0 |
| initial_customers | INTEGER | Starting customers | NOT NULL, CHECK >= 0 |
| customer_cac | DECIMAL(10,2) | Cost per acquisition | NOT NULL, CHECK > 0 |
| calculated_ltv | DECIMAL(10,2) | Result: Lifetime Value | COMPUTED |
| calculated_arr | DECIMAL(12,2) | Result: Annual Recurring Revenue | COMPUTED |
| calculated_ltv_cac_ratio | DECIMAL(5,2) | Result: LTV/CAC ratio | COMPUTED |
| calculated_payback_period | DECIMAL(5,2) | Result: Months to payback | COMPUTED |

### Example Record
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2024-01-15T10:30:00Z",
  "monthly_price": 50.00,
  "monthly_churn_rate": 0.05,
  "monthly_ad_spend": 5000.00,
  "growth_rate": 0.10,
  "initial_customers": 100,
  "customer_cac": 100.00,
  "calculated_ltv": 1000.00,
  "calculated_arr": 60000.00,
  "calculated_ltv_cac_ratio": 10.00,
  "calculated_payback_period": 2.00
}
```

---

## Table: projection_months

Stores the 12-month breakdown for each calculation.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| projection_id | UUID | Primary key | PRIMARY KEY, AUTO-GENERATE |
| session_id | UUID | Foreign key | FOREIGN KEY → calculation_sessions |
| month_number | INTEGER | Month 1-12 | NOT NULL, CHECK 1-12 |
| customers | INTEGER | Customer count | NOT NULL, CHECK >= 0 |
| revenue | DECIMAL(12,2) | Monthly revenue | NOT NULL, CHECK >= 0 |
| new_customers | INTEGER | Acquired this month | NOT NULL, CHECK >= 0 |
| churned_customers | INTEGER | Lost this month | NOT NULL, CHECK >= 0 |
| cumulative_revenue | DECIMAL(14,2) | Running total | NOT NULL, CHECK >= 0 |

### Indexes
- `idx_projections_session_id` on `session_id` for fast lookup
- `idx_projections_month` on `(session_id, month_number)` for ordering

### Example Records (Month 1 & 2)
```json
[
  {
    "projection_id": "660e8400-e29b-41d4-a716-446655440001",
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "month_number": 1,
    "customers": 150,
    "revenue": 7500.00,
    "new_customers": 50,
    "churned_customers": 5,
    "cumulative_revenue": 7500.00
  },
  {
    "projection_id": "660e8400-e29b-41d4-a716-446655440002",
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "month_number": 2,
    "customers": 192,
    "revenue": 9600.00,
    "new_customers": 55,
    "churned_customers": 7,
    "cumulative_revenue": 17100.00
  }
]
```

---

## SQLite Implementation (Phase 1)

For Phase 1 MVP, use SQLite or browser localStorage. Here's the SQL:

```sql
-- Create calculation_sessions table
CREATE TABLE calculation_sessions (
    session_id TEXT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    monthly_price DECIMAL(10,2) NOT NULL CHECK (monthly_price > 0),
    monthly_churn_rate DECIMAL(5,4) NOT NULL CHECK (monthly_churn_rate >= 0 AND monthly_churn_rate <= 1),
    monthly_ad_spend DECIMAL(10,2) NOT NULL CHECK (monthly_ad_spend >= 0),
    growth_rate DECIMAL(5,4) NOT NULL CHECK (growth_rate >= 0),
    initial_customers INTEGER NOT NULL CHECK (initial_customers >= 0),
    customer_cac DECIMAL(10,2) NOT NULL CHECK (customer_cac > 0),
    calculated_ltv DECIMAL(10,2),
    calculated_arr DECIMAL(12,2),
    calculated_ltv_cac_ratio DECIMAL(5,2),
    calculated_payback_period DECIMAL(5,2)
);

-- Create projection_months table
CREATE TABLE projection_months (
    projection_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    month_number INTEGER NOT NULL CHECK (month_number >= 1 AND month_number <= 12),
    customers INTEGER NOT NULL CHECK (customers >= 0),
    revenue DECIMAL(12,2) NOT NULL CHECK (revenue >= 0),
    new_customers INTEGER NOT NULL CHECK (new_customers >= 0),
    churned_customers INTEGER NOT NULL CHECK (churned_customers >= 0),
    cumulative_revenue DECIMAL(14,2) NOT NULL CHECK (cumulative_revenue >= 0),
    FOREIGN KEY (session_id) REFERENCES calculation_sessions(session_id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_projections_session_id ON projection_months(session_id);
CREATE INDEX idx_projections_month ON projection_months(session_id, month_number);

-- Insert sample calculation
INSERT INTO calculation_sessions (
    session_id, monthly_price, monthly_churn_rate, monthly_ad_spend,
    growth_rate, initial_customers, customer_cac, calculated_ltv,
    calculated_arr, calculated_ltv_cac_ratio, calculated_payback_period
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000', 50.00, 0.05, 5000.00,
    0.10, 100, 100.00, 1000.00, 60000.00, 10.00, 2.00
);

-- Query to get full calculation with projections
SELECT 
    cs.*,
    pm.month_number,
    pm.customers,
    pm.revenue,
    pm.new_customers,
    pm.churned_customers,
    pm.cumulative_revenue
FROM calculation_sessions cs
LEFT JOIN projection_months pm ON cs.session_id = pm.session_id
WHERE cs.session_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY pm.month_number;
```

---

## Validation Rules (Application Level)

| Input | Rule | Error Message |
|-------|------|---------------|
| Monthly Price | > 0 | "Price must be greater than 0" |
| Churn Rate | 0% - 100% | "Churn rate must be between 0% and 100%" |
| Ad Spend | >= 0 | "Ad spend cannot be negative" |
| Growth Rate | >= 0 | "Growth rate cannot be negative" |
| Initial Customers | >= 0 | "Initial customers cannot be negative" |
| CAC | > 0 | "CAC must be greater than 0" |

---

## LocalStorage Alternative (Phase 1 Simplified)

For Phase 1 without backend, use browser localStorage:

```javascript
// Save calculation
const calculation = {
  sessionId: generateUUID(),
  timestamp: new Date().toISOString(),
  inputs: { monthlyPrice, churnRate, adSpend, growthRate, initialCustomers, cac },
  metrics: { ltv, arr, ltvCacRatio, paybackPeriod },
  projections: [
    { month: 1, customers: 150, revenue: 7500, newCustomers: 50, churned: 5, cumulativeRevenue: 7500 },
    // ... 12 months
  ]
};

localStorage.setItem(`calc_${calculation.sessionId}`, JSON.stringify(calculation));

// Retrieve all calculations
const calculations = Object.keys(localStorage)
  .filter(key => key.startsWith('calc_'))
  .map(key => JSON.parse(localStorage.getItem(key)))
  .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
```

---

## Phase 1 Schema Notes

1. **No User Table** - Phase 1 has no authentication
2. **Session-Based** - Each calculation is independent
3. **12-Month Fixed** - Exactly 12 projection records per session
4. **Computed Fields** - Metrics calculated on insert, not updated
5. **Soft Delete** - Optional: Add `is_deleted` flag instead of hard delete

---

## Migration Path to Phase 2

Phase 2 will add:
- `users` table (authentication)
- `scenarios` table (named saved calculations)
- `stripe_integrations` table (real data connections)
- Foreign keys linking calculations to users
- Audit logs for data changes

---

*Database Schema designed for Phase 1 MVP - Core Functionality*
