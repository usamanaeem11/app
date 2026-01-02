/*
  # Add Employment Types and Consent Tracking

  ## Overview
  This migration adds employment type separation (Freelancer vs Full-time)
  and consent tracking for automatic monitoring features.

  ## Changes
  
  ### User Employment Types
  - Add `employment_type` column to users table (freelancer, full_time)
  - Freelancers: Manual time tracking only
  - Full-time: Can have automatic timer scheduling with consent
  
  ### Work Agreement Consent
  - Add consent tracking for auto-tracking features
  - Auto timer consent
  - Screenshot monitoring consent
  - Activity tracking consent
  
  ## Security
  - Automatic features only work with explicit consent
  - Consent must be recorded in active work agreement
  
  ## Important Notes
  - Existing users default to 'freelancer' (manual tracking)
  - Full-time employees need active agreement with consent to use auto features
  - Freelancers cannot have scheduled timers
*/

-- =====================================================
-- ADD EMPLOYMENT TYPE TO USERS
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'employment_type'
  ) THEN
    ALTER TABLE users 
    ADD COLUMN employment_type TEXT DEFAULT 'freelancer' 
    CHECK (employment_type IN ('freelancer', 'full_time'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_employment_type ON users(employment_type);

-- =====================================================
-- ADD CONSENT FIELDS TO WORK AGREEMENTS
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_agreements' AND column_name = 'auto_timer_consent'
  ) THEN
    ALTER TABLE work_agreements 
    ADD COLUMN auto_timer_consent BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_agreements' AND column_name = 'screenshot_consent'
  ) THEN
    ALTER TABLE work_agreements 
    ADD COLUMN screenshot_consent BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_agreements' AND column_name = 'activity_tracking_consent'
  ) THEN
    ALTER TABLE work_agreements 
    ADD COLUMN activity_tracking_consent BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_agreements' AND column_name = 'consent_given_at'
  ) THEN
    ALTER TABLE work_agreements 
    ADD COLUMN consent_given_at TIMESTAMPTZ;
  END IF;
END $$;

-- =====================================================
-- ADD EMPLOYMENT TYPE TO SCHEDULED TIMERS
-- =====================================================
-- This ensures we can validate that only full-time employees have scheduled timers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduled_timers' AND column_name = 'requires_full_time'
  ) THEN
    ALTER TABLE scheduled_timers 
    ADD COLUMN requires_full_time BOOLEAN DEFAULT true;
  END IF;
END $$;

-- =====================================================
-- CREATE CONSENT AUDIT LOG
-- =====================================================
CREATE TABLE IF NOT EXISTS consent_audit_log (
  audit_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  agreement_id TEXT REFERENCES work_agreements(agreement_id) ON DELETE SET NULL,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('auto_timer', 'screenshot', 'activity_tracking')),
  consent_given BOOLEAN NOT NULL,
  given_by TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_audit_user ON consent_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_audit_agreement ON consent_audit_log(agreement_id);
CREATE INDEX IF NOT EXISTS idx_consent_audit_created ON consent_audit_log(created_at);

ALTER TABLE consent_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on consent_audit_log"
  ON consent_audit_log FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- CREATE FUNCTION TO CHECK CONSENT
-- =====================================================
CREATE OR REPLACE FUNCTION check_auto_tracking_consent(
  p_user_id TEXT,
  p_consent_type TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_employment_type TEXT;
  v_has_consent BOOLEAN := false;
BEGIN
  -- Get user employment type
  SELECT employment_type INTO v_employment_type
  FROM users WHERE user_id = p_user_id;

  -- Freelancers don't need consent (they control their own tracking)
  IF v_employment_type = 'freelancer' THEN
    RETURN true;
  END IF;

  -- Full-time employees need active agreement with consent
  IF p_consent_type = 'auto_timer' THEN
    SELECT auto_timer_consent INTO v_has_consent
    FROM work_agreements
    WHERE employee_id = p_user_id
      AND status = 'active'
      AND auto_timer_consent = true
    LIMIT 1;
  ELSIF p_consent_type = 'screenshot' THEN
    SELECT screenshot_consent INTO v_has_consent
    FROM work_agreements
    WHERE employee_id = p_user_id
      AND status = 'active'
      AND screenshot_consent = true
    LIMIT 1;
  ELSIF p_consent_type = 'activity_tracking' THEN
    SELECT activity_tracking_consent INTO v_has_consent
    FROM work_agreements
    WHERE employee_id = p_user_id
      AND status = 'active'
      AND activity_tracking_consent = true
    LIMIT 1;
  END IF;

  RETURN COALESCE(v_has_consent, false);
END;
$$ LANGUAGE plpgsql;
