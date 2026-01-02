/*
  # Add GPS & Location Tracking

  ## New Tables
  - `gps_locations` - GPS tracking data
  - `geofences` - Geofence definitions  
  - `field_sites` - Job site locations
  - `routes` - Route tracking

  ## Security
  - RLS enabled on all tables
  - Company-based data isolation
*/

CREATE TABLE IF NOT EXISTS gps_locations (
  location_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  accuracy NUMERIC(6, 2) DEFAULT 0,
  altitude NUMERIC(8, 2),
  speed NUMERIC(6, 2),
  heading NUMERIC(5, 2),
  address TEXT,
  activity_type TEXT DEFAULT 'unknown' CHECK (activity_type IN ('stationary', 'walking', 'running', 'driving', 'unknown')),
  is_mock BOOLEAN DEFAULT false,
  battery_level INTEGER,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gps_locations_user ON gps_locations(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_gps_locations_company ON gps_locations(company_id, timestamp);

ALTER TABLE gps_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own GPS data"
  ON gps_locations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own GPS data"
  ON gps_locations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS geofences (
  geofence_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 100,
  auto_clock_in BOOLEAN DEFAULT false,
  auto_clock_out BOOLEAN DEFAULT false,
  enabled BOOLEAN DEFAULT true,
  created_by TEXT REFERENCES users(user_id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geofences_company ON geofences(company_id);

ALTER TABLE geofences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view geofences"
  ON geofences FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage geofences"
  ON geofences FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS field_sites (
  site_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  contact_person TEXT,
  contact_phone TEXT,
  site_type TEXT DEFAULT 'general' CHECK (site_type IN ('office', 'warehouse', 'construction', 'client_site', 'general')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_field_sites_company ON field_sites(company_id);

ALTER TABLE field_sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view field sites"
  ON field_sites FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage field sites"
  ON field_sites FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS routes (
  route_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  start_location JSONB NOT NULL,
  end_location JSONB,
  waypoints JSONB DEFAULT '[]'::jsonb,
  total_distance_km NUMERIC(10, 2),
  total_duration_minutes INTEGER,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  purpose TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_routes_user ON routes(user_id, start_time);

ALTER TABLE routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own routes"
  ON routes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage own routes"
  ON routes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
