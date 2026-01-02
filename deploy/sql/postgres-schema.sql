-- Working Tracker PostgreSQL Schema
-- Standalone database schema for independent deployment

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
    company_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    industry VARCHAR(100),
    size VARCHAR(50),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(50) PRIMARY KEY,
    company_id VARCHAR(50) REFERENCES companies(company_id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'employee',
    picture VARCHAR(500),
    phone VARCHAR(50),
    department VARCHAR(100),
    position VARCHAR(100),
    hourly_rate DECIMAL(10, 2),
    is_active BOOLEAN DEFAULT TRUE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_users_email ON users(email);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    project_id VARCHAR(50) PRIMARY KEY,
    company_id VARCHAR(50) REFERENCES companies(company_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    client_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    budget DECIMAL(12, 2),
    hourly_rate DECIMAL(10, 2),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_projects_company ON projects(company_id);

-- Time entries table
CREATE TABLE IF NOT EXISTS time_entries (
    entry_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(user_id) ON DELETE CASCADE,
    company_id VARCHAR(50) REFERENCES companies(company_id) ON DELETE CASCADE,
    project_id VARCHAR(50) REFERENCES projects(project_id) ON DELETE SET NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration_seconds INTEGER,
    source VARCHAR(50),
    notes TEXT,
    is_billable BOOLEAN DEFAULT TRUE,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_time_entries_user ON time_entries(user_id);
CREATE INDEX idx_time_entries_company ON time_entries(company_id);
CREATE INDEX idx_time_entries_project ON time_entries(project_id);
CREATE INDEX idx_time_entries_start_time ON time_entries(start_time);

-- Screenshots table
CREATE TABLE IF NOT EXISTS screenshots (
    screenshot_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(user_id) ON DELETE CASCADE,
    entry_id VARCHAR(50) REFERENCES time_entries(entry_id) ON DELETE CASCADE,
    file_path VARCHAR(500),
    storage_url VARCHAR(1000),
    captured_at TIMESTAMP NOT NULL,
    app_name VARCHAR(255),
    window_title VARCHAR(500),
    activity_level INTEGER DEFAULT 0,
    keyboard_events INTEGER DEFAULT 0,
    mouse_events INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_screenshots_user ON screenshots(user_id);
CREATE INDEX idx_screenshots_entry ON screenshots(entry_id);
CREATE INDEX idx_screenshots_captured ON screenshots(captured_at);

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    log_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(user_id) ON DELETE CASCADE,
    entry_id VARCHAR(50) REFERENCES time_entries(entry_id) ON DELETE CASCADE,
    app_name VARCHAR(255),
    window_title VARCHAR(500),
    url VARCHAR(1000),
    category VARCHAR(100),
    is_productive BOOLEAN,
    duration_seconds INTEGER DEFAULT 0,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_entry ON activity_logs(entry_id);
CREATE INDEX idx_activity_logs_start_time ON activity_logs(start_time);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    subscription_id VARCHAR(50) PRIMARY KEY,
    company_id VARCHAR(50) REFERENCES companies(company_id) ON DELETE CASCADE,
    plan_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    trial_end DATE,
    amount DECIMAL(10, 2),
    currency VARCHAR(10) DEFAULT 'USD',
    user_count INTEGER DEFAULT 1,
    billing_cycle VARCHAR(50),
    auto_renew BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_company ON subscriptions(company_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    payment_id VARCHAR(50) PRIMARY KEY,
    company_id VARCHAR(50) REFERENCES companies(company_id) ON DELETE CASCADE,
    subscription_id VARCHAR(50) REFERENCES subscriptions(subscription_id),
    stripe_payment_intent_id VARCHAR(255),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'pending',
    payment_method VARCHAR(100),
    invoice_url VARCHAR(500),
    receipt_url VARCHAR(500),
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payments_company ON payments(company_id);
CREATE INDEX idx_payments_subscription ON payments(subscription_id);

-- Employee assignments table
CREATE TABLE IF NOT EXISTS employee_assignments (
    assignment_id VARCHAR(50) PRIMARY KEY,
    company_id VARCHAR(50) REFERENCES companies(company_id) ON DELETE CASCADE,
    user_id VARCHAR(50) REFERENCES users(user_id) ON DELETE CASCADE,
    manager_id VARCHAR(50) REFERENCES users(user_id) ON DELETE SET NULL,
    project_id VARCHAR(50) REFERENCES projects(project_id) ON DELETE CASCADE,
    role VARCHAR(100),
    assigned_at TIMESTAMP DEFAULT NOW(),
    starts_at TIMESTAMP,
    ends_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active'
);

CREATE INDEX idx_employee_assignments_company ON employee_assignments(company_id);
CREATE INDEX idx_employee_assignments_user ON employee_assignments(user_id);
CREATE INDEX idx_employee_assignments_project ON employee_assignments(project_id);

-- Screen recordings table
CREATE TABLE IF NOT EXISTS screen_recordings (
    recording_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(user_id) ON DELETE CASCADE,
    entry_id VARCHAR(50) REFERENCES time_entries(entry_id) ON DELETE CASCADE,
    file_path VARCHAR(500),
    storage_url VARCHAR(1000),
    duration_seconds INTEGER,
    file_size_bytes BIGINT,
    recorded_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_screen_recordings_user ON screen_recordings(user_id);
CREATE INDEX idx_screen_recordings_entry ON screen_recordings(entry_id);

-- GPS locations table
CREATE TABLE IF NOT EXISTS gps_locations (
    location_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(user_id) ON DELETE CASCADE,
    entry_id VARCHAR(50) REFERENCES time_entries(entry_id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(10, 2),
    address TEXT,
    recorded_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_gps_locations_user ON gps_locations(user_id);
CREATE INDEX idx_gps_locations_recorded ON gps_locations(recorded_at);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
    expense_id VARCHAR(50) PRIMARY KEY,
    company_id VARCHAR(50) REFERENCES companies(company_id) ON DELETE CASCADE,
    user_id VARCHAR(50) REFERENCES users(user_id) ON DELETE CASCADE,
    project_id VARCHAR(50) REFERENCES projects(project_id) ON DELETE SET NULL,
    category VARCHAR(100),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    description TEXT,
    receipt_url VARCHAR(500),
    expense_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    approved_by VARCHAR(50) REFERENCES users(user_id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_expenses_company ON expenses(company_id);
CREATE INDEX idx_expenses_user ON expenses(user_id);
CREATE INDEX idx_expenses_status ON expenses(status);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    notification_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(user_id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);

-- Team chat messages table
CREATE TABLE IF NOT EXISTS team_chat_messages (
    message_id VARCHAR(50) PRIMARY KEY,
    company_id VARCHAR(50) REFERENCES companies(company_id) ON DELETE CASCADE,
    user_id VARCHAR(50) REFERENCES users(user_id) ON DELETE CASCADE,
    channel_id VARCHAR(50),
    reply_to VARCHAR(50),
    content TEXT NOT NULL,
    attachments JSONB,
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_team_chat_company ON team_chat_messages(company_id);
CREATE INDEX idx_team_chat_channel ON team_chat_messages(channel_id);
CREATE INDEX idx_team_chat_created ON team_chat_messages(created_at);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON time_entries
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_time_entries_date_range ON time_entries(user_id, start_time DESC);
CREATE INDEX idx_screenshots_date_range ON screenshots(user_id, captured_at DESC);
CREATE INDEX idx_activity_logs_date_range ON activity_logs(user_id, start_time DESC);
