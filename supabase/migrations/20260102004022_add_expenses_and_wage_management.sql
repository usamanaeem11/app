/*
  # Add Expenses and Wage Management System

  ## New Features

  1. Wage Information in Work Agreements
     - Add wage_type (hourly, monthly, project) to work_agreements
     - Add wage_amount to work_agreements
     - Track wage approval from both parties

  2. Employee Wages Table (for those without agreements)
     - Standalone wage records
     - Mutual approval system
     - Cannot change without both parties' consent

  3. Wage Change Requests
     - Track wage change requests
     - Require approval from both admin and employee/manager
     - History of wage changes

  4. Project Assignments and Costs
     - Track which employees work on which projects
     - Calculate collective project costs
     - Track time and costs per project

  5. Manager Expense Access
     - Allow admin to authorize managers to view assigned employees' expenses

  ## Security

  - Enable RLS on all new tables
  - Admin has full expense access
  - Employees see only their own data
  - Managers see only authorized employees' data
*/

-- Add wage fields to work_agreements
ALTER TABLE work_agreements ADD COLUMN IF NOT EXISTS wage_type TEXT CHECK (wage_type IN ('hourly', 'monthly', 'project'));
ALTER TABLE work_agreements ADD COLUMN IF NOT EXISTS wage_amount NUMERIC(10,2);
ALTER TABLE work_agreements ADD COLUMN IF NOT EXISTS wage_currency TEXT DEFAULT 'USD';
ALTER TABLE work_agreements ADD COLUMN IF NOT EXISTS wage_approved_by_admin BOOLEAN DEFAULT false;
ALTER TABLE work_agreements ADD COLUMN IF NOT EXISTS wage_approved_by_employee BOOLEAN DEFAULT false;
ALTER TABLE work_agreements ADD COLUMN IF NOT EXISTS wage_approved_at TIMESTAMPTZ;

-- Employee wages table (for those without agreements)
CREATE TABLE IF NOT EXISTS employee_wages (
  wage_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(company_id),
  employee_id TEXT NOT NULL REFERENCES users(user_id),
  wage_type TEXT NOT NULL,
  wage_amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  approved_by_admin BOOLEAN DEFAULT false,
  approved_by_employee BOOLEAN DEFAULT false,
  approved_at TIMESTAMPTZ,
  effective_from DATE NOT NULL,
  effective_until DATE,
  is_active BOOLEAN DEFAULT true,
  created_by TEXT REFERENCES users(user_id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT wage_type_check CHECK (wage_type IN ('hourly', 'monthly', 'project')),
  UNIQUE(employee_id, effective_from, is_active)
);

-- Wage change requests table
CREATE TABLE IF NOT EXISTS wage_change_requests (
  request_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(company_id),
  employee_id TEXT NOT NULL REFERENCES users(user_id),
  requested_by TEXT NOT NULL REFERENCES users(user_id),
  request_type TEXT NOT NULL,
  current_wage_type TEXT,
  current_wage_amount NUMERIC(10,2),
  new_wage_type TEXT NOT NULL,
  new_wage_amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  reason TEXT,
  status TEXT DEFAULT 'pending',
  admin_approved BOOLEAN DEFAULT false,
  employee_approved BOOLEAN DEFAULT false,
  admin_approved_at TIMESTAMPTZ,
  employee_approved_at TIMESTAMPTZ,
  admin_notes TEXT,
  employee_notes TEXT,
  effective_from DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT request_type_check CHECK (request_type IN ('agreement_wage', 'standalone_wage')),
  CONSTRAINT new_wage_type_check CHECK (new_wage_type IN ('hourly', 'monthly', 'project')),
  CONSTRAINT status_check CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'))
);

-- Project assignments table (enhanced)
CREATE TABLE IF NOT EXISTS project_assignments (
  assignment_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(company_id),
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  employee_id TEXT NOT NULL REFERENCES users(user_id),
  assigned_by TEXT REFERENCES users(user_id),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  project_wage_amount NUMERIC(10,2),
  wage_approved_by_admin BOOLEAN DEFAULT false,
  wage_approved_by_employee BOOLEAN DEFAULT false,
  notes TEXT,

  UNIQUE(project_id, employee_id, is_active)
);

-- Expense calculations cache table
CREATE TABLE IF NOT EXISTS expense_calculations (
  calculation_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(company_id),
  employee_id TEXT REFERENCES users(user_id),
  project_id TEXT REFERENCES projects(project_id),
  period_type TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_hours NUMERIC(10,2) DEFAULT 0,
  hourly_rate NUMERIC(10,2),
  monthly_rate NUMERIC(10,2),
  project_rate NUMERIC(10,2),
  calculated_amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  calculated_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB,

  CONSTRAINT period_type_check CHECK (period_type IN ('monthly', 'quarterly', 'yearly', 'custom'))
);

-- Manager expense access permissions
CREATE TABLE IF NOT EXISTS manager_expense_access (
  access_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(company_id),
  manager_id TEXT NOT NULL REFERENCES users(user_id),
  granted_by TEXT NOT NULL REFERENCES users(user_id),
  granted_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  scope TEXT DEFAULT 'assigned_employees',

  CONSTRAINT scope_check CHECK (scope IN ('assigned_employees', 'all_employees', 'specific_employees')),
  UNIQUE(manager_id, company_id, is_active)
);

-- Enable Row Level Security
ALTER TABLE employee_wages ENABLE ROW LEVEL SECURITY;
ALTER TABLE wage_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_expense_access ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employee_wages

CREATE POLICY "Employees can view own wages"
  ON employee_wages FOR SELECT
  TO authenticated
  USING (auth.uid()::text = employee_id);

CREATE POLICY "Admins can view all company wages"
  ON employee_wages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()::text
      AND users.company_id = employee_wages.company_id
      AND users.role IN ('admin', 'hr')
    )
  );

CREATE POLICY "Managers can view assigned employees wages with permission"
  ON employee_wages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM manager_expense_access mea
      JOIN manager_assignments ma ON ma.manager_id = mea.manager_id
      WHERE mea.manager_id = auth.uid()::text
      AND ma.employee_id = employee_wages.employee_id
      AND ma.active = true
      AND mea.is_active = true
    )
  );

CREATE POLICY "Admins can create wages"
  ON employee_wages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()::text
      AND users.company_id = employee_wages.company_id
      AND users.role IN ('admin', 'hr')
    )
  );

CREATE POLICY "Admins and employees can update wages"
  ON employee_wages FOR UPDATE
  TO authenticated
  USING (
    auth.uid()::text = employee_id OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()::text
      AND users.company_id = employee_wages.company_id
      AND users.role IN ('admin', 'hr')
    )
  );

-- RLS Policies for wage_change_requests

CREATE POLICY "Users can view own wage change requests"
  ON wage_change_requests FOR SELECT
  TO authenticated
  USING (
    auth.uid()::text = employee_id OR
    auth.uid()::text = requested_by
  );

CREATE POLICY "Admins can view all company wage requests"
  ON wage_change_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()::text
      AND users.company_id = wage_change_requests.company_id
      AND users.role IN ('admin', 'hr')
    )
  );

CREATE POLICY "Admins and employees can create wage requests"
  ON wage_change_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid()::text = requested_by
  );

CREATE POLICY "Admins and employees can update wage requests"
  ON wage_change_requests FOR UPDATE
  TO authenticated
  USING (
    auth.uid()::text = employee_id OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()::text
      AND users.company_id = wage_change_requests.company_id
      AND users.role IN ('admin', 'hr')
    )
  );

-- RLS Policies for project_assignments

CREATE POLICY "Users can view own project assignments"
  ON project_assignments FOR SELECT
  TO authenticated
  USING (auth.uid()::text = employee_id);

CREATE POLICY "Admins can view all company project assignments"
  ON project_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()::text
      AND users.company_id = project_assignments.company_id
      AND users.role IN ('admin', 'hr')
    )
  );

CREATE POLICY "Managers can view assigned employees project assignments"
  ON project_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM manager_assignments
      WHERE manager_assignments.manager_id = auth.uid()::text
      AND manager_assignments.employee_id = project_assignments.employee_id
      AND manager_assignments.active = true
    )
  );

CREATE POLICY "Admins can create project assignments"
  ON project_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()::text
      AND users.company_id = project_assignments.company_id
      AND users.role IN ('admin', 'hr')
    )
  );

CREATE POLICY "Admins can update project assignments"
  ON project_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()::text
      AND users.company_id = project_assignments.company_id
      AND users.role IN ('admin', 'hr')
    )
  );

-- RLS Policies for expense_calculations

CREATE POLICY "Users can view own expense calculations"
  ON expense_calculations FOR SELECT
  TO authenticated
  USING (auth.uid()::text = employee_id);

CREATE POLICY "Admins can view all company expense calculations"
  ON expense_calculations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()::text
      AND users.company_id = expense_calculations.company_id
      AND users.role IN ('admin', 'hr')
    )
  );

CREATE POLICY "Managers can view assigned employees expense calculations with permission"
  ON expense_calculations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM manager_expense_access mea
      JOIN manager_assignments ma ON ma.manager_id = mea.manager_id
      WHERE mea.manager_id = auth.uid()::text
      AND ma.employee_id = expense_calculations.employee_id
      AND ma.active = true
      AND mea.is_active = true
    )
  );

CREATE POLICY "System can create expense calculations"
  ON expense_calculations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for manager_expense_access

CREATE POLICY "Managers can view own expense access"
  ON manager_expense_access FOR SELECT
  TO authenticated
  USING (auth.uid()::text = manager_id);

CREATE POLICY "Admins can view all manager expense access"
  ON manager_expense_access FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()::text
      AND users.company_id = manager_expense_access.company_id
      AND users.role IN ('admin', 'hr')
    )
  );

CREATE POLICY "Admins can create manager expense access"
  ON manager_expense_access FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()::text
      AND users.company_id = manager_expense_access.company_id
      AND users.role IN ('admin', 'hr')
    )
  );

CREATE POLICY "Admins can update manager expense access"
  ON manager_expense_access FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()::text
      AND users.company_id = manager_expense_access.company_id
      AND users.role IN ('admin', 'hr')
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_employee_wages_employee ON employee_wages(employee_id, is_active);
CREATE INDEX IF NOT EXISTS idx_employee_wages_company ON employee_wages(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_wage_requests_employee ON wage_change_requests(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_wage_requests_status ON wage_change_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_assignments_employee ON project_assignments(employee_id, is_active);
CREATE INDEX IF NOT EXISTS idx_project_assignments_project ON project_assignments(project_id, is_active);
CREATE INDEX IF NOT EXISTS idx_expense_calculations_employee ON expense_calculations(employee_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_expense_calculations_company ON expense_calculations(company_id, period_type, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_manager_expense_access_manager ON manager_expense_access(manager_id, is_active);
