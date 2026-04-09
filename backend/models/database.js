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
            role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'manager', 'user')),
            status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'suspended')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

        CREATE TABLE IF NOT EXISTS admin_logs (
            id TEXT PRIMARY KEY,
            admin_id TEXT,
            action TEXT NOT NULL,
            target_type TEXT,
            target_id TEXT,
            details TEXT,
            ip_address TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (admin_id) REFERENCES users(id)
        );

        CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs(admin_id);
        CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_logs(created_at);
    `, (err) => {
        if (err) {
            console.error('Database initialization error:', err);
        } else {
            console.log('✅ Database tables initialized');
            seedDemoData();
        }
    });
}

function seedDemoData() {
    const database = getDatabase();
    const { v4: uuidv4 } = require('uuid');
    const bcrypt = require('bcryptjs');
    
    // Create admin user
    database.get('SELECT id FROM users WHERE email = ?', ['admin@example.com'], (err, row) => {
        if (!row) {
            const adminId = uuidv4();
            const passwordHash = bcrypt.hashSync('admin123', 10);
            
            database.run(
                'INSERT INTO users (id, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
                [adminId, 'admin@example.com', passwordHash, 'admin', 'active']
            );
            console.log('✅ Admin user created: admin@example.com / admin123');
        }
    });
    
    // Create manager user
    database.get('SELECT id FROM users WHERE email = ?', ['manager@example.com'], (err, row) => {
        if (!row) {
            const managerId = uuidv4();
            const passwordHash = bcrypt.hashSync('manager123', 10);
            
            database.run(
                'INSERT INTO users (id, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
                [managerId, 'manager@example.com', passwordHash, 'manager', 'active']
            );
            console.log('✅ Manager user created: manager@example.com / manager123');
        }
    });
    
    // Check if demo user exists
    database.get('SELECT id FROM users WHERE email = ?', ['demo@example.com'], (err, row) => {
        if (!row) {
            const demoUserId = uuidv4();
            const passwordHash = bcrypt.hashSync('demo123', 10);
            
            database.run(
                'INSERT INTO users (id, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
                [demoUserId, 'demo@example.com', passwordHash, 'user', 'active']
            );
            
            // Seed demo real metrics
            database.run(
                `INSERT INTO real_metrics (id, user_id, customers, monthly_revenue, churn_rate, ad_spend, cac) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [uuidv4(), demoUserId, 150, 14850, 0.04, 6000, 450]
            );
            
            console.log('✅ Demo user created: demo@example.com / demo123');
        }
    });
}

module.exports = {
    getDatabase,
    initializeDatabase
};
