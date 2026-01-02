/*
  # Add Screen Recording, Work Submissions, and Notifications - Part 1

  ## Updates to existing tables
  
  1. Add screen_recording_consent to work_agreements
  2. Enhance manager_assignments table

  ## New tables
  
  1. screen_recordings - 30-second recordings (Business plan)
  2. work_submissions - Work submission and approval system
  3. notifications - Notification system
  4. activity_history - Activity tracking for manager/admin viewing
*/

-- Add screen recording consent to work agreements
ALTER TABLE work_agreements ADD COLUMN IF NOT EXISTS screen_recording_consent BOOLEAN DEFAULT false;

-- Enhance manager_assignments table
ALTER TABLE manager_assignments ADD COLUMN IF NOT EXISTS assigned_by TEXT REFERENCES users(user_id);
ALTER TABLE manager_assignments ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE manager_assignments ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE manager_assignments ADD COLUMN IF NOT EXISTS notes TEXT;

-- Screen recordings table (Business plan only)
CREATE TABLE IF NOT EXISTS screen_recordings (
  recording_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(company_id),
  user_id TEXT NOT NULL REFERENCES users(user_id),
  entry_id TEXT REFERENCES time_entries(entry_id),
  recording_url TEXT NOT NULL,
  duration INTEGER DEFAULT 30,
  file_size BIGINT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB
);

-- Work submissions table
CREATE TABLE IF NOT EXISTS work_submissions (
  submission_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(company_id),
  employee_id TEXT NOT NULL REFERENCES users(user_id),
  manager_id TEXT REFERENCES users(user_id),
  project_id TEXT REFERENCES projects(project_id),
  task_id TEXT REFERENCES tasks(task_id),
  title TEXT NOT NULL,
  description TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  review_notes TEXT,
  attachments JSONB,
  time_entries TEXT[],
  total_hours NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT status_check CHECK (status IN (
    'pending',
    'accepted',
    'rejected',
    'needs_improvement',
    'under_consideration',
    'assigned_to_admin'
  ))
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  notification_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(company_id),
  user_id TEXT NOT NULL REFERENCES users(user_id),
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  priority TEXT DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,

  CONSTRAINT priority_check CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

-- Activity history table (for manager/admin viewing)
CREATE TABLE IF NOT EXISTS activity_history (
  history_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(company_id),
  user_id TEXT NOT NULL REFERENCES users(user_id),
  entry_id TEXT REFERENCES time_entries(entry_id),
  activity_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT activity_type_check CHECK (activity_type IN (
    'timer_start',
    'timer_stop',
    'screenshot_captured',
    'recording_captured',
    'work_submitted',
    'work_reviewed',
    'agreement_signed',
    'consent_given',
    'consent_revoked'
  ))
);

-- Enable Row Level Security
ALTER TABLE screen_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for screen_recordings

CREATE POLICY "Users can view own recordings"
  ON screen_recordings FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Managers can view assigned employees' recordings"
  ON screen_recordings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM manager_assignments
      WHERE manager_assignments.manager_id = auth.uid()::text
      AND manager_assignments.employee_id = screen_recordings.user_id
      AND manager_assignments.active = true
    )
  );

CREATE POLICY "Admins can view all company recordings"
  ON screen_recordings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()::text
      AND users.company_id = screen_recordings.company_id
      AND users.role IN ('admin', 'hr')
    )
  );

CREATE POLICY "System can insert recordings"
  ON screen_recordings FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for work_submissions

CREATE POLICY "Employees can view own submissions"
  ON work_submissions FOR SELECT
  TO authenticated
  USING (auth.uid()::text = employee_id);

CREATE POLICY "Managers can view assigned employees' submissions"
  ON work_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM manager_assignments
      WHERE manager_assignments.manager_id = auth.uid()::text
      AND manager_assignments.employee_id = work_submissions.employee_id
      AND manager_assignments.active = true
    )
  );

CREATE POLICY "Admins can view all company submissions"
  ON work_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()::text
      AND users.company_id = work_submissions.company_id
      AND users.role IN ('admin', 'hr')
    )
  );

CREATE POLICY "Employees can create submissions"
  ON work_submissions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = employee_id);

CREATE POLICY "Managers can update assigned employees' submissions"
  ON work_submissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM manager_assignments
      WHERE manager_assignments.manager_id = auth.uid()::text
      AND manager_assignments.employee_id = work_submissions.employee_id
      AND manager_assignments.active = true
    )
  );

CREATE POLICY "Admins can update all company submissions"
  ON work_submissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()::text
      AND users.company_id = work_submissions.company_id
      AND users.role IN ('admin', 'hr')
    )
  );

-- RLS Policies for notifications

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for activity_history

CREATE POLICY "Users can view own activity"
  ON activity_history FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Managers can view assigned employees' activity"
  ON activity_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM manager_assignments
      WHERE manager_assignments.manager_id = auth.uid()::text
      AND manager_assignments.employee_id = activity_history.user_id
      AND manager_assignments.active = true
    )
  );

CREATE POLICY "Admins can view all company activity"
  ON activity_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()::text
      AND users.company_id = activity_history.company_id
      AND users.role IN ('admin', 'hr')
    )
  );

CREATE POLICY "System can insert activity"
  ON activity_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_screen_recordings_user ON screen_recordings(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_screen_recordings_company ON screen_recordings(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_submissions_employee ON work_submissions(employee_id, status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_submissions_manager ON work_submissions(manager_id, status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_manager_assignments_active ON manager_assignments(manager_id, active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_history_user ON activity_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_history_company ON activity_history(company_id, created_at DESC);
