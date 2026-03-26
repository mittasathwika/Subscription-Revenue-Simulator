# Phase 1 Database Schema Design

## Overview

This database schema supports the Subscription Revenue Simulator application, enabling users to save simulations, track historical data, and manage scenarios.

## Database Type

**PostgreSQL** (recommended for production)
- Alternative: SQLite (for development/testing)

## Entity Relationship Diagram

```
┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│     users       │     │    simulations      │     │    scenarios    │
├─────────────────┤     ├─────────────────────┤     ├─────────────────┤
│ PK user_id      │────│ FK user_id          │────│ FK sim_id       │
│ email           │     │ PK sim_id           │     │ PK scenario_id  │
│ name            │     │ name                │     │ name            │
│ created_at      │     │ description         │     │ params_json     │
│ updated_at      │     │ params_json         │     │ results_json    │
│ auth_provider   │     │ results_json        │     │ created_at      │
│ auth_id         │     │ created_at          │     └─────────────────┘
└─────────────────┘     │ updated_at          │
                        │ is_archived         │
                        └─────────────────────┘
                                 │
                                 │
                        ┌────────┴────────┐
                        │  monthly_results │
                        ├─────────────────┤
                        │ PK result_id      │
                        │ FK sim_id         │
                        │ month_number      │
                        │ revenue           │
                        │ customers         │
                        │ churned           │
                        │ new_customers     │
                        └─────────────────┘
```

## Table Definitions

### 1. users

Stores user account information.

```sql
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    auth_provider VARCHAR(50) DEFAULT 'email', -- 'email', 'google', 'github'
    auth_id VARCHAR(255), -- External auth ID
    is_active BOOLEAN DEFAULT TRUE,
    
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_auth ON users(auth_provider, auth_id);
```

**Fields:**
- `user_id`: UUID primary key
- `email`: User's email address (unique)
- `name`: Display name
- `created_at`: Account creation timestamp
- `updated_at`: Last update timestamp
- `auth_provider`: Authentication method
- `auth_id`: External auth identifier
- `is_active`: Soft delete flag

---

### 2. simulations

Stores main simulation configurations and results.

```sql
CREATE TABLE simulations (
    sim_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Input Parameters (stored as JSON for flexibility)
    params_json JSONB NOT NULL DEFAULT '{}',
    
    -- Calculated Results Summary
    results_json JSONB NOT NULL DEFAULT '{}',
    
    -- Key Metrics (denormalized for quick queries)
    ltv DECIMAL(12, 2),
    arr DECIMAL(15, 2),
    ltv_cac_ratio DECIMAL(5, 2),
    payback_period DECIMAL(5, 2),
    final_revenue DECIMAL(15, 2),
    final_customers INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_archived BOOLEAN DEFAULT FALSE,
    
    CONSTRAINT valid_name CHECK (LENGTH(name) >= 1)
);

-- Indexes
CREATE INDEX idx_simulations_user ON simulations(user_id);
CREATE INDEX idx_simulations_created ON simulations(created_at DESC);
CREATE INDEX idx_simulations_archived ON simulations(is_archived) WHERE is_archived = FALSE;
CREATE INDEX idx_simulations_metrics ON simulations(ltv, arr, ltv_cac_ratio);
```

**Fields:**
- `sim_id`: UUID primary key
- `user_id`: Foreign key to users
- `name`: Simulation name
- `description`: Optional description
- `params_json`: JSON object with all input parameters
- `results_json`: JSON object with calculated results
- `ltv`, `arr`, `ltv_cac_ratio`, `payback_period`: Key metrics (denormalized)
- `final_revenue`, `final_customers`: Final month values
- `created_at`, `updated_at`: Timestamps
- `is_archived`: Soft delete flag

**JSON Structure for params_json:**
```json
{
  "monthly_price": 99,
  "churn_rate": 0.05,
  "ad_spend": 5000,
  "growth_rate": 0.10,
  "initial_customers": 100,
  "customer_acquisition_cost": 500,
  "projection_months": 12
}
```

**JSON Structure for results_json:**
```json
{
  "ltv": 1980.00,
  "arr": 118800.00,
  "ltv_cac_ratio": 3.96,
  "payback_period": 5.05,
  "total_revenue_12m": 650000.00,
  "avg_monthly_growth": 8.5,
  "break_even_month": 3
}
```

---

### 3. monthly_results

Stores month-by-month projection data.

```sql
CREATE TABLE monthly_results (
    result_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sim_id UUID NOT NULL REFERENCES simulations(sim_id) ON DELETE CASCADE,
    month_number INTEGER NOT NULL CHECK (month_number > 0 AND month_number <= 60),
    
    -- Monthly Metrics
    revenue DECIMAL(15, 2) NOT NULL,
    customers INTEGER NOT NULL,
    churned_customers INTEGER NOT NULL DEFAULT 0,
    new_customers INTEGER NOT NULL DEFAULT 0,
    
    -- Additional Metrics
    mrr DECIMAL(15, 2), -- Monthly Recurring Revenue
    marketing_spend DECIMAL(12, 2),
    cac DECIMAL(10, 2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(sim_id, month_number)
);

-- Indexes
CREATE INDEX idx_monthly_results_sim ON monthly_results(sim_id);
CREATE INDEX idx_monthly_results_month ON monthly_results(month_number);
```

**Fields:**
- `result_id`: UUID primary key
- `sim_id`: Foreign key to simulations
- `month_number`: Month (1-60, limited to 5 years)
- `revenue`: Monthly revenue
- `customers`: Total customers at month end
- `churned_customers`: Customers lost this month
- `new_customers`: New customers acquired
- `mrr`: Monthly recurring revenue
- `marketing_spend`: Ad spend for this month
- `cac`: Effective CAC for this month

---

### 4. scenarios

Stores alternative "what-if" scenarios for comparison.

```sql
CREATE TABLE scenarios (
    scenario_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sim_id UUID NOT NULL REFERENCES simulations(sim_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Modified Parameters (delta from base simulation)
    params_json JSONB NOT NULL DEFAULT '{}',
    
    -- Scenario Results
    results_json JSONB NOT NULL DEFAULT '{}',
    
    -- Key Metrics (denormalized)
    ltv DECIMAL(12, 2),
    arr DECIMAL(15, 2),
    ltv_cac_ratio DECIMAL(5, 2),
    payback_period DECIMAL(5, 2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_scenario_name CHECK (LENGTH(name) >= 1)
);

-- Indexes
CREATE INDEX idx_scenarios_sim ON scenarios(sim_id);
CREATE INDEX idx_scenarios_created ON scenarios(created_at DESC);
```

**Fields:**
- `scenario_id`: UUID primary key
- `sim_id`: Foreign key to base simulation
- `name`: Scenario name (e.g., "Aggressive Growth", "Conservative")
- `description`: Scenario description
- `params_json`: Modified parameters (only changed values stored)
- `results_json`: Calculated results for this scenario
- Key metrics: Denormalized for quick comparison

**JSON Structure for params_json (example):**
```json
{
  "monthly_price": 149,  -- Changed from base
  "churn_rate": 0.03,    -- Changed from base
  "ad_spend": 10000      -- Changed from base
}
```

---

### 5. user_preferences (Optional for Phase 1)

Stores user settings and preferences.

```sql
CREATE TABLE user_preferences (
    pref_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Default values for new simulations
    default_currency VARCHAR(3) DEFAULT 'USD',
    default_projection_months INTEGER DEFAULT 12 CHECK (default_projection_months BETWEEN 6 AND 60),
    
    -- UI Preferences
    theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
    chart_type VARCHAR(20) DEFAULT 'line' CHECK (chart_type IN ('line', 'bar', 'area')),
    
    -- Notification Preferences
    email_notifications BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_user_prefs_user ON user_preferences(user_id);
```

---

## Relationships

```
users (1) ───────< (N) simulations
                    │
                    ├──< (N) monthly_results
                    │
                    └──< (N) scenarios

users (1) ───────< (1) user_preferences (optional)
```

## Key Queries

### 1. Get user's simulations with latest first
```sql
SELECT s.*, u.name as user_name
FROM simulations s
JOIN users u ON s.user_id = u.user_id
WHERE s.user_id = :user_id AND s.is_archived = FALSE
ORDER BY s.created_at DESC;
```

### 2. Get simulation with monthly details
```sql
SELECT s.*, mr.*
FROM simulations s
LEFT JOIN monthly_results mr ON s.sim_id = mr.sim_id
WHERE s.sim_id = :sim_id
ORDER BY mr.month_number;
```

### 3. Compare scenarios
```sql
SELECT s.name, sc.name as scenario_name, sc.ltv, sc.arr, sc.ltv_cac_ratio
FROM simulations s
JOIN scenarios sc ON s.sim_id = sc.sim_id
WHERE s.user_id = :user_id
ORDER BY s.created_at DESC, sc.created_at;
```

### 4. Get user's key metrics dashboard
```sql
SELECT 
    COUNT(*) as total_simulations,
    AVG(ltv) as avg_ltv,
    AVG(arr) as avg_arr,
    AVG(ltv_cac_ratio) as avg_ltv_cac_ratio
FROM simulations
WHERE user_id = :user_id AND is_archived = FALSE;
```

## Data Integrity

### Constraints
1. **Foreign Keys**: All relationships use ON DELETE CASCADE
2. **Check Constraints**: Numeric ranges validated at DB level
3. **Unique Constraints**: Prevent duplicate monthly results per simulation
4. **Not Null**: Required fields enforced

### Triggers (Optional)

```sql
-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_simulations_updated_at 
    BEFORE UPDATE ON simulations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

## Migration Path

### Phase 1 (Current): Static storage
- No database needed
- LocalStorage for persistence (optional)

### Phase 2: Add database
- Deploy PostgreSQL
- Run schema migrations
- Add authentication
- Migrate LocalStorage data (if any)

### Phase 3: Scale
- Add caching layer (Redis)
- Read replicas for analytics queries
- Archive old simulations

## Security Considerations

1. **Row Level Security (RLS)**: Enable on all tables
   ```sql
   ALTER TABLE simulations ENABLE ROW LEVEL SECURITY;
   CREATE POLICY user_simulations ON simulations
       FOR ALL TO authenticated_users
       USING (user_id = current_setting('app.current_user_id')::UUID);
   ```

2. **Data Encryption**: Encrypt sensitive fields (email)

3. **Backup Strategy**: Daily backups, point-in-time recovery

4. **Audit Logging**: Track changes to critical data

## Performance Optimization

1. **Indexes**: All foreign keys and frequently queried fields indexed
2. **JSONB**: Used for flexible schema, with GIN indexes if needed
3. **Denormalization**: Key metrics stored in parent table for quick queries
4. **Partitioning**: Consider partitioning monthly_results by sim_id for large datasets

## Phase 1 Implementation Notes

**For Phase 1, database is NOT required.** The app works entirely client-side:
- Calculations happen in browser (JavaScript)
- No user accounts needed
- No data persistence (or use LocalStorage optionally)
- Focus: Problem validation, UI/UX testing

**Database becomes relevant in Phase 2** when adding:
- User accounts and authentication
- Save/load simulations
- Historical data tracking
- Multi-user scenarios
- API backend
