-- Create booking system tables based on the latest schema

-- First, create booking_links table
CREATE TABLE IF NOT EXISTS booking_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  team_ids UUID[],
  slug VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(20) DEFAULT 'individual' CHECK (type IN ('individual', 'team', 'round_robin', 'collective')),
  appointment_type_ids UUID[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create appointment_types table
CREATE TABLE IF NOT EXISTS appointment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_booking_links_organization_id ON booking_links(organization_id);
CREATE INDEX IF NOT EXISTS idx_booking_links_user_id ON booking_links(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_links_slug ON booking_links(slug);
CREATE INDEX IF NOT EXISTS idx_booking_links_active ON booking_links(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_appointment_types_organization_id ON appointment_types(organization_id);
CREATE INDEX IF NOT EXISTS idx_appointment_types_active ON appointment_types(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE booking_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_types ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for booking_links
DROP POLICY IF EXISTS "Users can view booking links from their organization" ON booking_links;
DROP POLICY IF EXISTS "Users can create booking links for their organization" ON booking_links;
DROP POLICY IF EXISTS "Users can update booking links from their organization" ON booking_links;
DROP POLICY IF EXISTS "Users can delete booking links from their organization" ON booking_links;

CREATE POLICY "Users can view booking links from their organization"
ON booking_links FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
    UNION
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can create booking links for their organization"
ON booking_links FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
    UNION
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can update booking links from their organization"
ON booking_links FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
    UNION
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can delete booking links from their organization"
ON booking_links FOR DELETE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
    UNION
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Create RLS policies for appointment_types
DROP POLICY IF EXISTS "Users can view appointment types from their organization" ON appointment_types;
DROP POLICY IF EXISTS "Users can create appointment types for their organization" ON appointment_types;
DROP POLICY IF EXISTS "Users can update appointment types from their organization" ON appointment_types;
DROP POLICY IF EXISTS "Users can delete appointment types from their organization" ON appointment_types;

CREATE POLICY "Users can view appointment types from their organization"
ON appointment_types FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
    UNION
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can create appointment types for their organization"
ON appointment_types FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
    UNION
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can update appointment types from their organization"
ON appointment_types FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
    UNION
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can delete appointment types from their organization"
ON appointment_types FOR DELETE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
    UNION
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Grant permissions
GRANT ALL ON booking_links TO authenticated;
GRANT ALL ON booking_links TO service_role;
GRANT ALL ON appointment_types TO authenticated;
GRANT ALL ON appointment_types TO service_role;

-- Insert some default appointment types for Atlas Fitness
INSERT INTO appointment_types (organization_id, name, description, duration_minutes)
VALUES 
  ('63589490-8f55-4157-bd3a-e141594b748e', 'Personal Training', 'One-on-one personal training session', 60),
  ('63589490-8f55-4157-bd3a-e141594b748e', 'Consultation', 'Initial fitness consultation and assessment', 30),
  ('63589490-8f55-4157-bd3a-e141594b748e', 'Group Training', 'Small group training session', 45),
  ('63589490-8f55-4157-bd3a-e141594b748e', 'Nutrition Coaching', 'Nutrition and diet planning session', 45)
ON CONFLICT DO NOTHING;

-- Verify tables were created successfully
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename IN ('booking_links', 'appointment_types')
ORDER BY tablename;