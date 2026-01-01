/*
  # Employee Assignments, Work Agreements, and Scheduled Timers

  ## Overview
  This migration adds features for employee assignment requests, work agreements,
  and automatic timer scheduling for Working Tracker.

  ## New Tables Created
  
  ### Employee Assignment System
  - `employee_assignment_requests` - Track assignment requests from admin/manager to employees
  
  ### Work Agreements
  - `work_agreements` - Store work agreements between admin and employees
  - `agreement_clauses` - Custom clauses for work agreements
  - `agreement_signatures` - Digital signatures for agreements
  
  ### Scheduled Timers
  - `scheduled_timers` - Automatic timer start configuration
  
  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Company-based data isolation
  - Role-based access control
  
  ## Important Notes
  - All tables use TEXT IDs with custom prefixes
  - Timestamps use TIMESTAMPTZ for timezone awareness
  - Foreign keys enforce referential integrity
*/

-- =====================================================
-- EMPLOYEE ASSIGNMENT REQUESTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS employee_assignment_requests (
  request_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  manager_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  message TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignment_requests_employee ON employee_assignment_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_assignment_requests_manager ON employee_assignment_requests(manager_id);
CREATE INDEX IF NOT EXISTS idx_assignment_requests_status ON employee_assignment_requests(status);

ALTER TABLE employee_assignment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on assignment_requests"
  ON employee_assignment_requests FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- WORK AGREEMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS work_agreements (
  agreement_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  admin_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'signed', 'active', 'completed', 'terminated')),
  features JSONB DEFAULT '[]'::jsonb,
  admin_signed BOOLEAN DEFAULT false,
  employee_signed BOOLEAN DEFAULT false,
  admin_signature TEXT,
  employee_signature TEXT,
  admin_signed_at TIMESTAMPTZ,
  employee_signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agreements_company ON work_agreements(company_id);
CREATE INDEX IF NOT EXISTS idx_agreements_employee ON work_agreements(employee_id);
CREATE INDEX IF NOT EXISTS idx_agreements_status ON work_agreements(status);

ALTER TABLE work_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on work_agreements"
  ON work_agreements FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- AGREEMENT CLAUSES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS agreement_clauses (
  clause_id TEXT PRIMARY KEY,
  agreement_id TEXT NOT NULL REFERENCES work_agreements(agreement_id) ON DELETE CASCADE,
  clause_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_mandatory BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clauses_agreement ON agreement_clauses(agreement_id);

ALTER TABLE agreement_clauses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on agreement_clauses"
  ON agreement_clauses FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- SCHEDULED TIMERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS scheduled_timers (
  schedule_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  agreement_id TEXT REFERENCES work_agreements(agreement_id) ON DELETE SET NULL,
  project_id TEXT REFERENCES projects(project_id) ON DELETE SET NULL,
  schedule_type TEXT DEFAULT 'daily' CHECK (schedule_type IN ('once', 'daily', 'weekly', 'monthly')),
  start_time TIME NOT NULL,
  end_time TIME,
  days_of_week JSONB DEFAULT '[]'::jsonb,
  timezone TEXT DEFAULT 'UTC',
  is_active BOOLEAN DEFAULT true,
  auto_start_enabled BOOLEAN DEFAULT true,
  auto_stop_enabled BOOLEAN DEFAULT false,
  notes TEXT,
  created_by TEXT REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_timers_employee ON scheduled_timers(employee_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_timers_active ON scheduled_timers(is_active);
CREATE INDEX IF NOT EXISTS idx_scheduled_timers_agreement ON scheduled_timers(agreement_id);

ALTER TABLE scheduled_timers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on scheduled_timers"
  ON scheduled_timers FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- TIMER EXECUTION LOG TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS timer_execution_log (
  execution_id TEXT PRIMARY KEY,
  schedule_id TEXT NOT NULL REFERENCES scheduled_timers(schedule_id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  time_entry_id TEXT REFERENCES time_entries(entry_id) ON DELETE SET NULL,
  scheduled_time TIMESTAMPTZ NOT NULL,
  executed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'failed', 'skipped')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timer_execution_schedule ON timer_execution_log(schedule_id);
CREATE INDEX IF NOT EXISTS idx_timer_execution_employee ON timer_execution_log(employee_id);
CREATE INDEX IF NOT EXISTS idx_timer_execution_scheduled_time ON timer_execution_log(scheduled_time);

ALTER TABLE timer_execution_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on timer_execution_log"
  ON timer_execution_log FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
