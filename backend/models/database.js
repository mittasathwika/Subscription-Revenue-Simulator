const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'simulator.db');

let db = null;

function getDatabase() {
    if (!db) {
        db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('Database connection error:', err);
            } else {
                console.log('✅ Connected to SQLite database');
            }
        });
    }
    return db;
}

function initializeDatabase() {
    const fs = require('fs');
    const dataDir = path.join(__dirname, '..', 'data');
    
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const database = getDatabase();
    
    // Create tables
    database.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME
        );

        CREATE TABLE IF NOT EXISTS real_metrics (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            customers INTEGER DEFAULT 0,
            monthly_revenue REAL DEFAULT 0,
            churn_rate REAL DEFAULT 0.05,
            ad_spend REAL DEFAULT 0,
            cac REAL DEFAULT 500,
            recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS scenarios (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            name TEXT NOT NULL,
            price REAL DEFAULT 99,
            churn_rate REAL DEFAULT 0.05,
            ad_spend REAL DEFAULT 5000,
            growth_rate REAL DEFAULT 0.10,
            initial_customers INTEGER DEFAULT 100,
            cac REAL DEFAULT 500,
            projection_data TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS simulations (
            id TEXT PRIMARY KEY,
            scenario_id TEXT,
            month INTEGER,
            customers INTEGER,
            revenue REAL,
            new_customers INTEGER,
            churned_customers INTEGER,
            FOREIGN KEY (scenario_id) REFERENCES scenarios(id)
        );

        CREATE INDEX IF NOT EXISTS idx_scenarios_user ON scenarios(user_id);
        CREATE INDEX IF NOT EXISTS idx_real_metrics_user ON real_metrics(user_id);

        -- Phase 5: Multi-Currency Support
        CREATE TABLE IF NOT EXISTS exchange_rates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            base_currency TEXT NOT NULL,
            target_currency TEXT NOT NULL,
            rate REAL NOT NULL,
            last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(base_currency, target_currency)
        );

        CREATE TABLE IF NOT EXISTS supported_currencies (
            code TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            symbol TEXT NOT NULL,
            flag TEXT,
            is_active INTEGER DEFAULT 1
        );

        -- Phase 5: Cohort Analysis
        CREATE TABLE IF NOT EXISTS customer_cohorts (
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

        CREATE TABLE IF NOT EXISTS cohort_retention (
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

        -- Phase 5: Multi-Tenant / Agency
        CREATE TABLE IF NOT EXISTS agencies (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            owner_id TEXT NOT NULL,
            plan_type TEXT DEFAULT 'agency-starter',
            max_clients INTEGER DEFAULT 5,
            max_users_per_client INTEGER DEFAULT 3,
            is_active INTEGER DEFAULT 1,
            billing_email TEXT,
            billing_address TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (owner_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS client_workspaces (
            id TEXT PRIMARY KEY,
            agency_id TEXT NOT NULL,
            name TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            description TEXT,
            logo_url TEXT,
            primary_color TEXT DEFAULT '#3B82F6',
            accent_color TEXT DEFAULT '#10B981',
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (agency_id) REFERENCES agencies(id)
        );

        CREATE TABLE IF NOT EXISTS workspace_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            role TEXT DEFAULT 'analyst',
            invited_by TEXT,
            invited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            joined_at DATETIME,
            is_active INTEGER DEFAULT 1,
            FOREIGN KEY (workspace_id) REFERENCES client_workspaces(id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (invited_by) REFERENCES users(id),
            UNIQUE(workspace_id, user_id)
        );

        -- Phase 5: QuickBooks Integration
        CREATE TABLE IF NOT EXISTS quickbooks_connections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT UNIQUE NOT NULL,
            realm_id TEXT,
            access_token TEXT,
            refresh_token TEXT,
            expires_at DATETIME,
            last_sync DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

    `, (err) => {
        if (err) {
            console.error('Database initialization error:', err);
        } else {
            console.log('✅ Database tables initialized');
            seedDemoData();
        }
    });
}

function runMigrations() {
    const database = getDatabase();
    
    // Add columns if they don't exist (ignore errors if columns already exist)
    const migrations = [
        `ALTER TABLE users ADD COLUMN currency TEXT DEFAULT 'USD'`,
        `ALTER TABLE users ADD COLUMN timezone TEXT DEFAULT 'UTC'`,
        `ALTER TABLE scenarios ADD COLUMN workspace_id TEXT`,
        `ALTER TABLE scenarios ADD COLUMN is_shared INTEGER DEFAULT 0`
    ];
    
    migrations.forEach(sql => {
        database.run(sql, (err) => {
            // Ignore errors (column likely already exists)
            if (err && !err.message.includes('duplicate column')) {
                console.log('Migration note:', err.message);
            }
        });
    });
    
    console.log('✅ Migrations completed');
}

function seedDemoData() {
    const database = getDatabase();
    const { v4: uuidv4 } = require('uuid');
    
    // Run migrations first
    runMigrations();
    
    // Check if demo user exists
    database.get('SELECT id FROM users WHERE email = ?', ['demo@example.com'], (err, row) => {
        if (!row) {
            const demoUserId = uuidv4();
            const bcrypt = require('bcryptjs');
            const passwordHash = bcrypt.hashSync('demo123', 10);
            
            database.run(
                'INSERT INTO users (id, email, password_hash, currency) VALUES (?, ?, ?, ?)',
                [demoUserId, 'demo@example.com', passwordHash, 'USD']
            );
            
            // Seed demo real metrics
            database.run(
                `INSERT INTO real_metrics (id, user_id, customers, monthly_revenue, churn_rate, ad_spend, cac) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [uuidv4(), demoUserId, 150, 14850, 0.04, 6000, 450]
            );
            
            console.log('✅ Demo data seeded');
        }
    });
    
    // Seed supported currencies
    seedSupportedCurrencies();
    
    // Create indexes for Phase 5 tables
    createPhase5Indexes();
}

function seedSupportedCurrencies() {
    const database = getDatabase();
    const currencies = [
        ['USD', 'US Dollar', '$', '🇺🇸'],
        ['EUR', 'Euro', '€', '🇪🇺'],
        ['GBP', 'British Pound', '£', '🇬🇧'],
        ['CAD', 'Canadian Dollar', 'CA$', '🇨🇦'],
        ['AUD', 'Australian Dollar', 'A$', '🇦🇺'],
        ['JPY', 'Japanese Yen', '¥', '🇯🇵'],
        ['CHF', 'Swiss Franc', 'Fr', '🇨🇭']
    ];
    
    currencies.forEach(([code, name, symbol, flag]) => {
        database.run(
            `INSERT OR IGNORE INTO supported_currencies (code, name, symbol, flag) VALUES (?, ?, ?, ?)`,
            [code, name, symbol, flag]
        );
    });
    
    console.log('✅ Supported currencies seeded');
}

function createPhase5Indexes() {
    const database = getDatabase();
    
    const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_exchange_rates_lookup ON exchange_rates(base_currency, target_currency)',
        'CREATE INDEX IF NOT EXISTS idx_cohorts_user ON customer_cohorts(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_cohorts_month ON customer_cohorts(cohort_month)',
        'CREATE INDEX IF NOT EXISTS idx_retention_lookup ON cohort_retention(user_id, cohort_month, month_number)',
        'CREATE INDEX IF NOT EXISTS idx_agencies_owner ON agencies(owner_id)',
        'CREATE INDEX IF NOT EXISTS idx_workspaces_agency ON client_workspaces(agency_id)',
        'CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON client_workspaces(slug)',
        'CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id)'
    ];
    
    indexes.forEach(sql => {
        database.run(sql);
    });
    
    console.log('✅ Phase 5 database indexes created');
}

module.exports = {
    getDatabase,
    initializeDatabase
};
