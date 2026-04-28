-- Migration 007: Add multi-tenant support for agencies
-- Enables agency accounts with multiple client workspaces

-- Create agencies table
CREATE TABLE agencies (
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

-- Create client workspaces table
CREATE TABLE client_workspaces (
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

-- Create workspace memberships table
CREATE TABLE workspace_members (
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

-- Add workspace_id to existing tables
ALTER TABLE scenarios ADD COLUMN workspace_id TEXT;
ALTER TABLE scenarios ADD COLUMN is_shared INTEGER DEFAULT 0;
ALTER TABLE user_metrics ADD COLUMN workspace_id TEXT;

-- Create agency invitations table
CREATE TABLE agency_invitations (
    id TEXT PRIMARY KEY,
    agency_id TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'analyst',
    invited_by TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    accepted_at DATETIME,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agency_id) REFERENCES agencies(id),
    FOREIGN KEY (invited_by) REFERENCES users(id)
);

-- Create indexes
CREATE INDEX idx_agencies_owner ON agencies(owner_id);
CREATE INDEX idx_workspaces_agency ON client_workspaces(agency_id);
CREATE INDEX idx_workspaces_slug ON client_workspaces(slug);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_lookup ON workspace_members(workspace_id, user_id);
CREATE INDEX idx_scenarios_workspace ON scenarios(workspace_id);
CREATE INDEX idx_metrics_workspace ON user_metrics(workspace_id);
