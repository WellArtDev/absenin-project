-- Multiple Geofence Locations System
-- Allow companies to set up multiple valid attendance zones

-- 1. Create office locations table
CREATE TABLE IF NOT EXISTS office_locations (
  id BIGSERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  address TEXT,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  radius_meters INTEGER DEFAULT 500,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_location_name_per_company UNIQUE (company_id, name)
);

-- 2. Add location_id to attendance table
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES office_locations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_attendance_location ON attendance(location_id);

-- 3. Update company_settings to use primary location_id instead of lat/long (optional migration)
-- ALTER TABLE company_settings DROP COLUMN IF EXISTS office_latitude;
-- ALTER TABLE company_settings DROP COLUMN IF EXISTS office_longitude;
-- ALTER TABLE company_settings DROP COLUMN IF EXISTS allowed_radius_meters;
-- ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS primary_location_id INTEGER REFERENCES office_locations(id);

-- 4. Create location usage logs
CREATE TABLE IF NOT EXISTS location_checkins (
  id BIGSERIAL PRIMARY KEY,
  attendance_id INTEGER REFERENCES attendance(id) ON DELETE SET NULL,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  location_id INTEGER NOT NULL REFERENCES office_locations(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  distance_meters DECIMAL(10, 2),
  within_radius BOOLEAN DEFAULT TRUE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_office_locations_company ON office_locations(company_id);
CREATE INDEX IF NOT EXISTS idx_office_locations_active ON office_locations(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_location_checkins_employee ON location_checkins(employee_id);
CREATE INDEX IF NOT EXISTS idx_location_checkins_location ON location_checkins(location_id);
CREATE INDEX IF NOT EXISTS idx_location_checkins_date ON location_checkins(checked_in_at);

-- Comments
COMMENT ON TABLE office_locations IS 'Multiple office locations for geofence attendance';
COMMENT ON TABLE location_checkins IS 'Track which location employees checked in from';
COMMENT ON COLUMN office_locations.radius_meters IS 'Valid check-in radius in meters (default: 500m)';
COMMENT ON COLUMN location_checkins.distance_meters IS 'Distance from employee to office location';
COMMENT ON COLUMN location_checkins.within_radius IS 'Whether employee was within valid radius';
