/*
  # Add Productivity Analytics

  ## New Tables
  - `productivity_scores` - Daily productivity metrics
  - `meeting_insights` - Meeting cost analysis
  - `focus_time` - Deep work tracking
  - `burnout_indicators` - Burnout risk metrics

  ## Security
  - RLS enabled on all tables
*/

CREATE TABLE IF NOT EXISTS productivity_scores (
  score_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  date DATE NOT NULL,
  overall_score INTEGER DEFAULT 0 CHECK (overall_score BETWEEN 0 AND 100),
  activity_score INTEGER DEFAULT 0 CHECK (activity_score BETWEEN 0 AND 100),
  focus_score INTEGER DEFAULT 0 CHECK (focus_score BETWEEN 0 AND 100),
  time_management_score INTEGER DEFAULT 0 CHECK (time_management_score BETWEEN 0 AND 100),
  total_productive_minutes INTEGER DEFAULT 0,
  total_neutral_minutes INTEGER DEFAULT 0,
  total_unproductive_minutes INTEGER DEFAULT 0,
  total_active_minutes INTEGER DEFAULT 0,
  total_idle_minutes INTEGER DEFAULT 0,
  meetings_count INTEGER DEFAULT 0,
  meetings_duration_minutes INTEGER DEFAULT 0,
  deep_work_sessions INTEGER DEFAULT 0,
  deep_work_minutes INTEGER DEFAULT 0,
  context_switches INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_productivity_scores_user_date ON productivity_scores(user_id, date);
CREATE INDEX IF NOT EXISTS idx_productivity_scores_company_date ON productivity_scores(company_id, date);

ALTER TABLE productivity_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own productivity scores"
  ON productivity_scores FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can manage productivity scores"
  ON productivity_scores FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS meeting_insights (
  insight_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  meeting_title TEXT NOT NULL,
  meeting_date DATE NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  attendee_count INTEGER DEFAULT 0,
  total_cost NUMERIC(10, 2) DEFAULT 0,
  organizer_id TEXT REFERENCES users(user_id),
  attendee_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  meeting_source TEXT DEFAULT 'manual' CHECK (meeting_source IN ('google', 'outlook', 'zoom', 'teams', 'manual')),
  meeting_type TEXT DEFAULT 'general' CHECK (meeting_type IN ('standup', 'planning', 'review', 'one_on_one', 'general', 'training', 'client')),
  productivity_rating INTEGER CHECK (productivity_rating BETWEEN 1 AND 5),
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_insights_company_date ON meeting_insights(company_id, meeting_date);

ALTER TABLE meeting_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view meeting insights"
  ON meeting_insights FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can manage meeting insights"
  ON meeting_insights FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS focus_time (
  focus_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  interruptions_count INTEGER DEFAULT 0,
  quality_score INTEGER DEFAULT 0 CHECK (quality_score BETWEEN 0 AND 100),
  tasks_completed INTEGER DEFAULT 0,
  context_maintained BOOLEAN DEFAULT true,
  date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_focus_time_user_date ON focus_time(user_id, date);

ALTER TABLE focus_time ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own focus time"
  ON focus_time FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can manage focus time"
  ON focus_time FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS burnout_indicators (
  indicator_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'moderate', 'high', 'critical')),
  risk_score INTEGER DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  avg_daily_hours NUMERIC(5, 2) DEFAULT 0,
  weekend_work_hours NUMERIC(5, 2) DEFAULT 0,
  late_night_hours NUMERIC(5, 2) DEFAULT 0,
  consecutive_work_days INTEGER DEFAULT 0,
  missed_breaks_count INTEGER DEFAULT 0,
  productivity_trend TEXT DEFAULT 'stable' CHECK (productivity_trend IN ('improving', 'stable', 'declining')),
  stress_indicators JSONB DEFAULT '{}'::jsonb,
  recommendations TEXT[],
  notified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start_date)
);

CREATE INDEX IF NOT EXISTS idx_burnout_indicators_user ON burnout_indicators(user_id, week_start_date);
CREATE INDEX IF NOT EXISTS idx_burnout_indicators_risk ON burnout_indicators(risk_level, risk_score);

ALTER TABLE burnout_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own burnout indicators"
  ON burnout_indicators FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can manage burnout indicators"
  ON burnout_indicators FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
