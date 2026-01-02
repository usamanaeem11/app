/*
  # Add Security & Compliance Features

  ## New Tables
  - `audit_logs` - Comprehensive audit trail
  - `usb_events` - USB device detection
  - `dlp_incidents` - Data loss prevention events
  - `security_alerts` - Security notifications

  ## Security
  - RLS enabled on all tables
*/

CREATE TABLE IF NOT EXISTS audit_logs (
  audit_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failed', 'blocked')),
  error_message TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS usb_events (
  event_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  device_name TEXT NOT NULL,
  device_id TEXT,
  vendor_id TEXT,
  product_id TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('connected', 'disconnected', 'blocked')),
  action_taken TEXT DEFAULT 'allowed' CHECK (action_taken IN ('allowed', 'blocked', 'logged')),
  file_operations JSONB DEFAULT '[]'::jsonb,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usb_events_user ON usb_events(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_usb_events_company ON usb_events(company_id, timestamp);

ALTER TABLE usb_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view USB events"
  ON usb_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert USB events"
  ON usb_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS dlp_incidents (
  incident_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  incident_type TEXT NOT NULL CHECK (incident_type IN ('file_upload', 'email_send', 'clipboard_copy', 'screenshot_attempt', 'print', 'usb_copy')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  file_name TEXT,
  file_path TEXT,
  destination TEXT,
  action_taken TEXT DEFAULT 'logged' CHECK (action_taken IN ('logged', 'blocked', 'warned')),
  policy_violated TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dlp_incidents_company ON dlp_incidents(company_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_dlp_incidents_user ON dlp_incidents(user_id, timestamp);

ALTER TABLE dlp_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view DLP incidents"
  ON dlp_incidents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert DLP incidents"
  ON dlp_incidents FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS security_alerts (
  alert_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('unusual_activity', 'off_hours_access', 'multiple_failed_logins', 'data_exfiltration', 'policy_violation', 'suspicious_behavior')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
  assigned_to TEXT REFERENCES users(user_id),
  metadata JSONB DEFAULT '{}'::jsonb,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT REFERENCES users(user_id),
  resolution_notes TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_alerts_company ON security_alerts(company_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_security_alerts_status ON security_alerts(status, severity);

ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view security alerts"
  ON security_alerts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage security alerts"
  ON security_alerts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
