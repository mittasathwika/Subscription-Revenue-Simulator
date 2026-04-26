-- Migration 005: Add currency support
-- Adds currency fields to users and transactions

-- Add currency preference to users table
ALTER TABLE users ADD COLUMN currency TEXT DEFAULT 'USD';
ALTER TABLE users ADD COLUMN timezone TEXT DEFAULT 'UTC';

-- Create exchange rates cache table
CREATE TABLE exchange_rates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    base_currency TEXT NOT NULL,
    target_currency TEXT NOT NULL,
    rate REAL NOT NULL,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(base_currency, target_currency)
);

-- Create supported currencies table
CREATE TABLE supported_currencies (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    flag TEXT,
    is_active INTEGER DEFAULT 1
);

-- Insert supported currencies
INSERT INTO supported_currencies (code, name, symbol, flag) VALUES
('USD', 'US Dollar', '$', '🇺🇸'),
('EUR', 'Euro', '€', '🇪🇺'),
('GBP', 'British Pound', '£', '🇬🇧'),
('CAD', 'Canadian Dollar', 'CA$', '🇨🇦'),
('AUD', 'Australian Dollar', 'A$', '🇦🇺'),
('JPY', 'Japanese Yen', '¥', '🇯🇵'),
('CHF', 'Swiss Franc', 'Fr', '🇨🇭');

-- Create index for exchange rates
CREATE INDEX idx_exchange_rates_lookup ON exchange_rates(base_currency, target_currency);
