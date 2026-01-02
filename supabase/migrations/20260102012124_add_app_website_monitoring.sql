/*
  # Add App & Website Monitoring

  ## New Tables
  - `app_categories` - App productivity categorization
  - `website_categories` - Website productivity categorization
  - `app_usage` - Detailed app usage tracking
  - `website_usage` - Detailed website usage tracking
  - `blocked_apps` - Apps to block
  - `blocked_websites` - Websites to block

  ## Security
  - RLS enabled on all tables
*/

CREATE TABLE IF NOT EXISTS app_categories (
  category_id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(company_id) ON DELETE CASCADE,
  app_name TEXT NOT NULL,
  app_path TEXT,
  category TEXT NOT NULL CHECK (category IN ('productive', 'neutral', 'unproductive')),
  productivity_score INTEGER DEFAULT 0 CHECK (productivity_score BETWEEN -100 AND 100),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_categories_company ON app_categories(company_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_categories_unique ON app_categories(COALESCE(company_id, ''), app_name);

ALTER TABLE app_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view app categories"
  ON app_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage app categories"
  ON app_categories FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS website_categories (
  category_id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(company_id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  url_pattern TEXT,
  category TEXT NOT NULL CHECK (category IN ('productive', 'neutral', 'unproductive')),
  productivity_score INTEGER DEFAULT 0 CHECK (productivity_score BETWEEN -100 AND 100),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_website_categories_company ON website_categories(company_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_website_categories_unique ON website_categories(COALESCE(company_id, ''), domain);

ALTER TABLE website_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view website categories"
  ON website_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage website categories"
  ON website_categories FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS app_usage (
  usage_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  app_name TEXT NOT NULL,
  app_title TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  productivity_category TEXT,
  productivity_score INTEGER DEFAULT 0,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_usage_user_date ON app_usage(user_id, date);
CREATE INDEX IF NOT EXISTS idx_app_usage_company_date ON app_usage(company_id, date);

ALTER TABLE app_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own app usage"
  ON app_usage FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own app usage"
  ON app_usage FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS website_usage (
  usage_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  domain TEXT NOT NULL,
  page_title TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  productivity_category TEXT,
  productivity_score INTEGER DEFAULT 0,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_website_usage_user_date ON website_usage(user_id, date);
CREATE INDEX IF NOT EXISTS idx_website_usage_company_date ON website_usage(company_id, date);

ALTER TABLE website_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own website usage"
  ON website_usage FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own website usage"
  ON website_usage FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS blocked_apps (
  block_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  app_name TEXT NOT NULL,
  app_path TEXT,
  reason TEXT,
  enabled BOOLEAN DEFAULT true,
  created_by TEXT REFERENCES users(user_id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blocked_apps_company ON blocked_apps(company_id);

ALTER TABLE blocked_apps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view blocked apps"
  ON blocked_apps FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage blocked apps"
  ON blocked_apps FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS blocked_websites (
  block_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  url_pattern TEXT,
  reason TEXT,
  enabled BOOLEAN DEFAULT true,
  created_by TEXT REFERENCES users(user_id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blocked_websites_company ON blocked_websites(company_id);

ALTER TABLE blocked_websites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view blocked websites"
  ON blocked_websites FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage blocked websites"
  ON blocked_websites FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default app categories
INSERT INTO app_categories (category_id, company_id, app_name, category, productivity_score, is_default) VALUES
('cat_app_vscode', NULL, 'Visual Studio Code', 'productive', 90, true),
('cat_app_chrome', NULL, 'Google Chrome', 'neutral', 0, true),
('cat_app_slack', NULL, 'Slack', 'productive', 60, true),
('cat_app_teams', NULL, 'Microsoft Teams', 'productive', 60, true),
('cat_app_zoom', NULL, 'Zoom', 'productive', 50, true),
('cat_app_spotify', NULL, 'Spotify', 'neutral', -10, true),
('cat_app_excel', NULL, 'Microsoft Excel', 'productive', 80, true),
('cat_app_word', NULL, 'Microsoft Word', 'productive', 80, true),
('cat_app_outlook', NULL, 'Microsoft Outlook', 'productive', 70, true),
('cat_app_notion', NULL, 'Notion', 'productive', 85, true)
ON CONFLICT DO NOTHING;

-- Insert default website categories
INSERT INTO website_categories (category_id, company_id, domain, category, productivity_score, is_default) VALUES
('cat_web_github', NULL, 'github.com', 'productive', 90, true),
('cat_web_stackoverflow', NULL, 'stackoverflow.com', 'productive', 85, true),
('cat_web_docs', NULL, 'docs.google.com', 'productive', 80, true),
('cat_web_linkedin', NULL, 'linkedin.com', 'productive', 60, true),
('cat_web_gmail', NULL, 'mail.google.com', 'productive', 70, true),
('cat_web_facebook', NULL, 'facebook.com', 'unproductive', -70, true),
('cat_web_twitter', NULL, 'twitter.com', 'unproductive', -60, true),
('cat_web_instagram', NULL, 'instagram.com', 'unproductive', -80, true),
('cat_web_reddit', NULL, 'reddit.com', 'unproductive', -65, true),
('cat_web_youtube', NULL, 'youtube.com', 'unproductive', -50, true)
ON CONFLICT DO NOTHING;
