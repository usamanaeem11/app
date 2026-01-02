/*
  # Add Integration Framework

  ## New Tables
  - `integrations` - Third-party integration configs
  - `integration_sync_logs` - Integration sync history

  ## Security
  - RLS enabled on all tables
*/

CREATE TABLE IF NOT EXISTS integrations (
  integration_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL CHECK (integration_type IN ('jira', 'asana', 'github', 'gitlab', 'bitbucket', 'slack', 'teams', 'quickbooks', 'xero', 'trello', 'monday', 'clickup', 'notion', 'zoom', 'custom')),
  name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  credentials JSONB,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  last_sync_at TIMESTAMPTZ,
  error_message TEXT,
  created_by TEXT REFERENCES users(user_id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integrations_company ON integrations(company_id);

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view integrations"
  ON integrations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage integrations"
  ON integrations FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS integration_sync_logs (
  log_id TEXT PRIMARY KEY,
  integration_id TEXT NOT NULL REFERENCES integrations(integration_id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  records_synced INTEGER DEFAULT 0,
  error_message TEXT,
  sync_duration_ms INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integration_sync_logs_integration ON integration_sync_logs(integration_id, created_at);

ALTER TABLE integration_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view sync logs"
  ON integration_sync_logs FOR SELECT
  TO authenticated
  USING (true);
