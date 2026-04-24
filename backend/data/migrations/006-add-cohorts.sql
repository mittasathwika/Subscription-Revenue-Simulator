-- Migration 006: Add cohort analysis tables
-- Tracks customer cohorts and retention

-- Create customer cohorts table
CREATE TABLE customer_cohorts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    cohort_month TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    signup_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    first_payment_date DATETIME,
    last_payment_date DATETIME,
    total_payments INTEGER DEFAULT 0,
    total_revenue REAL DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    churned_date DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, customer_id)
);

-- Create cohort retention metrics table
CREATE TABLE cohort_retention (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    cohort_month TEXT NOT NULL,
    month_number INTEGER NOT NULL,
    starting_customers INTEGER NOT NULL,
    retained_customers INTEGER NOT NULL,
    churned_customers INTEGER NOT NULL,
    retention_rate REAL NOT NULL,
    revenue_retained REAL DEFAULT 0,
    calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, cohort_month, month_number)
);

-- Create cohort summary table
CREATE TABLE cohort_summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    cohort_month TEXT NOT NULL,
    total_customers INTEGER NOT NULL,
    total_revenue REAL DEFAULT 0,
    avg_ltv REAL DEFAULT 0,
    avg_lifespan_months REAL DEFAULT 0,
    retention_month_1 REAL DEFAULT 0,
    retention_month_3 REAL DEFAULT 0,
    retention_month_6 REAL DEFAULT 0,
    retention_month_12 REAL DEFAULT 0,
    calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, cohort_month)
);

-- Create indexes for cohort queries
CREATE INDEX idx_cohorts_user ON customer_cohorts(user_id);
CREATE INDEX idx_cohorts_month ON customer_cohorts(cohort_month);
CREATE INDEX idx_cohorts_lookup ON customer_cohorts(user_id, cohort_month);
CREATE INDEX idx_retention_lookup ON cohort_retention(user_id, cohort_month, month_number);
