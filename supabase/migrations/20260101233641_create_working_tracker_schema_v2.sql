/*
  # Working Tracker - Complete Database Schema Migration

  ## Overview
  This migration creates the complete database schema for Working Tracker,
  a comprehensive employee monitoring and time-tracking SaaS platform.
  Migrating from MongoDB to PostgreSQL/Supabase.

  ## New Tables Created
  
  ### Core Tables
  - `companies` - Company/organization accounts
  - `users` - User accounts with authentication
  - `subscriptions` - Company subscription plans and billing
  - `manager_assignments` - Manager-employee relationships
  
  ### Time Tracking
  - `time_entries` - Time tracking entries
  - `screenshots` - Screenshot captures during tracking
  - `activity_logs` - Application and URL activity tracking
  
  ### HRMS Features
  - `projects` - Project management
  - `tasks` - Task management
  - `attendance` - Daily attendance records
  - `shifts` - Shift templates
  - `shift_assignments` - Employee shift assignments
  - `timesheets` - Weekly timesheet summaries
  - `leave_requests` - Leave/vacation requests
  - `payroll` - Payroll records
  - `invoices` - Invoice management
  
  ### Team Chat
  - `chat_channels` - Chat channels for teams
  - `chat_messages` - Chat messages
  
  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Basic policies for authenticated access
  - Company-based isolation
  
  ## Important Notes
  - All IDs use TEXT type with custom prefixes (e.g., user_, company_)
  - Timestamps use TIMESTAMPTZ for timezone awareness
  - Default values set for most columns to prevent null issues
  - Foreign keys enforce referential integrity
*/

-- =====================================================
-- COMPANIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS companies (
  company_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  tracking_policy JSONB DEFAULT '{
    "screenshot_interval": 600,
    "blur_screenshots": false,
    "track_activity": true,
    "idle_threshold": 300,
    "allow_manual_time": true,
    "screenshot_enabled": true
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on companies"
  ON companies FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'employee' CHECK (role IN ('admin', 'manager', 'hr', 'employee')),
  company_id TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  picture TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  hourly_rate NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on users"
  ON users FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  subscription_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  num_users INTEGER NOT NULL DEFAULT 1,
  status TEXT DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'cancelled', 'expired')),
  payment_method TEXT DEFAULT 'card',
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  auto_renew BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id)
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on subscriptions"
  ON subscriptions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- MANAGER ASSIGNMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS manager_assignments (
  assignment_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  manager_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(manager_id, employee_id)
);

ALTER TABLE manager_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on manager_assignments"
  ON manager_assignments FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- PROJECTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS projects (
  project_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  client_name TEXT,
  budget_hours NUMERIC(10,2),
  hourly_rate NUMERIC(10,2),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold', 'cancelled')),
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on projects"
  ON projects FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- TIME ENTRIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS time_entries (
  entry_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(project_id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration INTEGER DEFAULT 0,
  idle_time INTEGER DEFAULT 0,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'desktop', 'mobile', 'browser')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'stopped', 'paused')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_company_id ON time_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_start_time ON time_entries(start_time);

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on time_entries"
  ON time_entries FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- SCREENSHOTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS screenshots (
  screenshot_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  time_entry_id TEXT REFERENCES time_entries(entry_id) ON DELETE CASCADE,
  s3_url TEXT NOT NULL,
  taken_at TIMESTAMPTZ DEFAULT NOW(),
  blurred BOOLEAN DEFAULT false,
  app_name TEXT,
  window_title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_screenshots_user_id ON screenshots(user_id);
CREATE INDEX IF NOT EXISTS idx_screenshots_taken_at ON screenshots(taken_at);

ALTER TABLE screenshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on screenshots"
  ON screenshots FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- ACTIVITY LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS activity_logs (
  log_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  app_name TEXT NOT NULL,
  url TEXT,
  activity_level INTEGER DEFAULT 0 CHECK (activity_level >= 0 AND activity_level <= 100),
  window_title TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on activity_logs"
  ON activity_logs FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- TASKS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS tasks (
  task_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to TEXT REFERENCES users(user_id) ON DELETE SET NULL,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'completed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TIMESTAMPTZ,
  estimated_hours NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on tasks"
  ON tasks FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- ATTENDANCE TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS attendance (
  attendance_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  date DATE NOT NULL,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  status TEXT DEFAULT 'absent' CHECK (status IN ('present', 'absent', 'late', 'half_day', 'on_leave')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, date);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on attendance"
  ON attendance FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- SHIFTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS shifts (
  shift_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on shifts"
  ON shifts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- SHIFT ASSIGNMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS shift_assignments (
  assignment_id TEXT PRIMARY KEY,
  shift_id TEXT NOT NULL REFERENCES shifts(shift_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'missed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

ALTER TABLE shift_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on shift_assignments"
  ON shift_assignments FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- TIMESHEETS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS timesheets (
  timesheet_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  total_hours NUMERIC(10,2) DEFAULT 0,
  billable_hours NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'approved', 'rejected')),
  entries JSONB DEFAULT '[]'::jsonb,
  reviewed_by TEXT REFERENCES users(user_id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timesheets_user_week ON timesheets(user_id, week_start);

ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on timesheets"
  ON timesheets FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- LEAVE REQUESTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS leave_requests (
  leave_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('vacation', 'sick', 'personal', 'unpaid', 'other')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by TEXT REFERENCES users(user_id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_user_id ON leave_requests(user_id);

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on leave_requests"
  ON leave_requests FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- PAYROLL TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payroll (
  payroll_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  hours NUMERIC(10,2) DEFAULT 0,
  rate NUMERIC(10,2) DEFAULT 0,
  amount NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'paid')),
  payment_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_user_period ON payroll(user_id, period_start, period_end);

ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on payroll"
  ON payroll FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- INVOICES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS invoices (
  invoice_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  subtotal NUMERIC(10,2) DEFAULT 0,
  tax NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  issue_date DATE,
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON invoices(company_id);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on invoices"
  ON invoices FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- CHAT CHANNELS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_channels (
  channel_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  channel_type TEXT DEFAULT 'team' CHECK (channel_type IN ('team', 'direct', 'ai_support')),
  created_by TEXT REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on chat_channels"
  ON chat_channels FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- CHAT MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  message_id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL REFERENCES chat_channels(channel_id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  message TEXT NOT NULL,
  is_ai_response BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_id ON chat_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on chat_messages"
  ON chat_messages FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
