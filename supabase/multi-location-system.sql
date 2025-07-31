-- Multi-Location System for Organizations
-- Allows organizations to have multiple gym locations with staff access controls

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL, -- URL-friendly name
  address TEXT,
  city TEXT,
  postcode TEXT,
  phone TEXT,
  email TEXT,
  timezone TEXT DEFAULT 'Europe/London',
  business_hours JSONB DEFAULT '{
    "monday": {"open": "06:00", "close": "22:00"},
    "tuesday": {"open": "06:00", "close": "22:00"},
    "wednesday": {"open": "06:00", "close": "22:00"},
    "thursday": {"open": "06:00", "close": "22:00"},
    "friday": {"open": "06:00", "close": "22:00"},
    "saturday": {"open": "08:00", "close": "20:00"},
    "sunday": {"open": "08:00", "close": "20:00"}
  }'::jsonb,
  is_active BOOLEAN DEFAULT true,
  is_primary BOOLEAN DEFAULT false, -- One location should be primary
  settings JSONB DEFAULT '{}'::jsonb, -- Location-specific settings
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

-- Create location_staff table to assign staff to locations
CREATE TABLE IF NOT EXISTS location_staff (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES organization_staff(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'staff' CHECK (role IN ('manager', 'staff', 'trainer')),
  is_primary_location BOOLEAN DEFAULT false, -- Staff's main location
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(location_id, staff_id)
);

-- Add location support to existing tables
ALTER TABLE customers ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);
ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);
ALTER TABLE forms ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);

-- Update organization_staff to support location access
ALTER TABLE organization_staff 
ADD COLUMN IF NOT EXISTS location_access JSONB DEFAULT '{"all_locations": true, "specific_locations": []}'::jsonb;

-- Create function to check if staff has access to a location
CREATE OR REPLACE FUNCTION staff_has_location_access(
  p_staff_id UUID,
  p_location_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_access JSONB;
BEGIN
  SELECT location_access INTO v_access
  FROM organization_staff
  WHERE id = p_staff_id;
  
  -- If staff has access to all locations
  IF v_access->>'all_locations' = 'true' THEN
    RETURN TRUE;
  END IF;
  
  -- Check if location is in specific_locations array
  RETURN v_access->'specific_locations' ? p_location_id::text;
END;
$$ LANGUAGE plpgsql;

-- Create function to get staff's accessible locations
CREATE OR REPLACE FUNCTION get_staff_locations(
  p_staff_id UUID
) RETURNS TABLE(location_id UUID, location_name TEXT) AS $$
DECLARE
  v_access JSONB;
  v_org_id UUID;
BEGIN
  -- Get staff's access settings and organization
  SELECT location_access, organization_id 
  INTO v_access, v_org_id
  FROM organization_staff
  WHERE id = p_staff_id;
  
  -- If staff has access to all locations
  IF v_access->>'all_locations' = 'true' THEN
    RETURN QUERY
    SELECT id, name
    FROM locations
    WHERE organization_id = v_org_id
    AND is_active = true;
  ELSE
    -- Return only specific locations
    RETURN QUERY
    SELECT l.id, l.name
    FROM locations l
    WHERE l.organization_id = v_org_id
    AND l.is_active = true
    AND v_access->'specific_locations' ? l.id::text;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to create default location for existing organizations
CREATE OR REPLACE FUNCTION create_default_location_for_org(
  p_org_id UUID
) RETURNS UUID AS $$
DECLARE
  v_location_id UUID;
  v_org_name TEXT;
BEGIN
  -- Get organization name
  SELECT name INTO v_org_name FROM organizations WHERE id = p_org_id;
  
  -- Create default location
  INSERT INTO locations (
    organization_id,
    name,
    slug,
    is_primary,
    is_active
  ) VALUES (
    p_org_id,
    v_org_name || ' - Main Location',
    'main',
    true,
    true
  ) RETURNING id INTO v_location_id;
  
  RETURN v_location_id;
END;
$$ LANGUAGE plpgsql;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_locations_organization ON locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_locations_active ON locations(is_active);
CREATE INDEX IF NOT EXISTS idx_location_staff_location ON location_staff(location_id);
CREATE INDEX IF NOT EXISTS idx_location_staff_staff ON location_staff(staff_id);

-- Enable RLS
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_staff ENABLE ROW LEVEL SECURITY;

-- RLS Policies for locations
CREATE POLICY "Users can view their organization's locations" ON locations
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_staff
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage locations" ON locations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_staff
      WHERE organization_id = locations.organization_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for location_staff
CREATE POLICY "Users can view location staff assignments" ON location_staff
  FOR SELECT
  USING (
    location_id IN (
      SELECT id FROM locations
      WHERE organization_id IN (
        SELECT organization_id FROM organization_staff
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can manage location staff" ON location_staff
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM locations l
      JOIN organization_staff os ON os.organization_id = l.organization_id
      WHERE l.id = location_staff.location_id
      AND os.user_id = auth.uid()
      AND os.role IN ('owner', 'admin')
    )
  );

-- Create trigger to update updated_at
CREATE TRIGGER update_locations_updated_at 
  BEFORE UPDATE ON locations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Migrate existing data to have a default location
DO $$
DECLARE
  v_org RECORD;
  v_location_id UUID;
BEGIN
  -- For each organization without a location
  FOR v_org IN 
    SELECT DISTINCT o.id, o.name
    FROM organizations o
    LEFT JOIN locations l ON l.organization_id = o.id
    WHERE l.id IS NULL
  LOOP
    -- Create default location
    v_location_id := create_default_location_for_org(v_org.id);
    
    -- Update all related records to use this location
    UPDATE customers SET location_id = v_location_id WHERE organization_id = v_org.id AND location_id IS NULL;
    UPDATE leads SET location_id = v_location_id WHERE organization_id = v_org.id AND location_id IS NULL;
    UPDATE class_sessions SET location_id = v_location_id WHERE organization_id = v_org.id AND location_id IS NULL;
    UPDATE products SET location_id = v_location_id WHERE organization_id = v_org.id AND location_id IS NULL;
    UPDATE memberships SET location_id = v_location_id WHERE organization_id = v_org.id AND location_id IS NULL;
  END LOOP;
END $$;