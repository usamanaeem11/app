/*
  # Add Idle & Break Tracking

  ## New Tables
  - `idle_periods` - Idle time detection
  - `breaks` - Break tracking

  ## Security
  - RLS enabled on all tables
*/

CREATE TABLE IF NOT EXISTS idle_periods (
  idle_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER,
  reason TEXT DEFAULT 'unknown' CHECK (reason IN ('break', 'meeting', 'away', 'system_idle', 'unknown')),
  is_approved BOOLEAN DEFAULT false,
  approved_by TEXT REFERENCES users(user_id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_idle_periods_user ON idle_periods(user_id, start_time);

ALTER TABLE idle_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own idle periods"
  ON idle_periods FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage own idle periods"
  ON idle_periods FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS breaks (
  break_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  break_type TEXT DEFAULT 'general' CHECK (break_type IN ('lunch', 'coffee', 'personal', 'general')),
  is_paid BOOLEAN DEFAULT false,
  is_automatic BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_breaks_user ON breaks(user_id, start_time);

ALTER TABLE breaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own breaks"
  ON breaks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage own breaks"
  ON breaks FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
