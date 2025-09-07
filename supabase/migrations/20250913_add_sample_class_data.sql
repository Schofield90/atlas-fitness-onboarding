-- Add sample class types and schedules for testing
-- This migration creates sample data for class booking functionality

-- First, ensure class_types table exists
CREATE TABLE IF NOT EXISTS class_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6',
  duration_minutes INTEGER DEFAULT 60,
  max_capacity INTEGER DEFAULT 20,
  price_pennies INTEGER DEFAULT 2000,
  equipment_needed TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_class_types_organization_id ON class_types(organization_id);

-- Enable RLS
ALTER TABLE class_types ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view class types from their organization" ON class_types;
CREATE POLICY "Users can view class types from their organization" ON class_types
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can manage class types in their organization" ON class_types;
CREATE POLICY "Users can manage class types in their organization" ON class_types
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'staff')
      AND is_active = true
    )
  );

-- Grant permissions
GRANT ALL ON class_types TO authenticated;

-- Insert sample class types for each organization
DO $$
DECLARE
  org_record RECORD;
  type_id UUID;
BEGIN
  -- Loop through all organizations
  FOR org_record IN SELECT id FROM organizations LOOP
    -- Insert sample class types
    INSERT INTO class_types (organization_id, name, description, color, duration_minutes, max_capacity, price_pennies)
    VALUES 
      (org_record.id, 'Yoga Flow', 'A gentle flow class suitable for all levels', '#10B981', 60, 15, 1500),
      (org_record.id, 'HIIT Training', 'High intensity interval training for maximum results', '#EF4444', 45, 20, 2000),
      (org_record.id, 'Spin Class', 'Indoor cycling with energizing music', '#F59E0B', 45, 25, 1800),
      (org_record.id, 'Pilates', 'Core strengthening and flexibility', '#8B5CF6', 50, 12, 2200),
      (org_record.id, 'Boxing Fitness', 'Cardio boxing workout', '#DC2626', 60, 16, 2500),
      (org_record.id, 'Zumba', 'Dance fitness party', '#EC4899', 55, 30, 1500)
    ON CONFLICT (organization_id, name) DO NOTHING;
    
    -- Get the HIIT class type ID for creating schedules
    SELECT id INTO type_id FROM class_types 
    WHERE organization_id = org_record.id AND name = 'HIIT Training' 
    LIMIT 1;
    
    -- Create sample class schedules for the next 7 days
    IF type_id IS NOT NULL THEN
      -- Morning classes at 9 AM
      INSERT INTO class_schedules (
        organization_id, 
        class_type_id,
        start_time, 
        end_time,
        max_capacity,
        current_bookings,
        room_location,
        instructor_name,
        status,
        price_pennies
      )
      SELECT
        org_record.id,
        type_id,
        (CURRENT_DATE + i || ' days')::date + TIME '09:00:00',
        (CURRENT_DATE + i || ' days')::date + TIME '09:45:00',
        20,
        0,
        'Studio A',
        'Sarah Johnson',
        'scheduled',
        2000
      FROM generate_series(0, 6) AS i;
      
      -- Evening classes at 6 PM for Yoga
      SELECT id INTO type_id FROM class_types 
      WHERE organization_id = org_record.id AND name = 'Yoga Flow' 
      LIMIT 1;
      
      IF type_id IS NOT NULL THEN
        INSERT INTO class_schedules (
          organization_id, 
          class_type_id,
          start_time, 
          end_time,
          max_capacity,
          current_bookings,
          room_location,
          instructor_name,
          status,
          price_pennies
        )
        SELECT
          org_record.id,
          type_id,
          (CURRENT_DATE + i || ' days')::date + TIME '18:00:00',
          (CURRENT_DATE + i || ' days')::date + TIME '19:00:00',
          15,
          0,
          'Studio B',
          'Emma Wilson',
          'scheduled',
          1500
        FROM generate_series(0, 6) AS i;
      END IF;
      
      -- Lunchtime Spin classes
      SELECT id INTO type_id FROM class_types 
      WHERE organization_id = org_record.id AND name = 'Spin Class' 
      LIMIT 1;
      
      IF type_id IS NOT NULL THEN
        INSERT INTO class_schedules (
          organization_id, 
          class_type_id,
          start_time, 
          end_time,
          max_capacity,
          current_bookings,
          room_location,
          instructor_name,
          status,
          price_pennies
        )
        SELECT
          org_record.id,
          type_id,
          (CURRENT_DATE + i || ' days')::date + TIME '12:30:00',
          (CURRENT_DATE + i || ' days')::date + TIME '13:15:00',
          25,
          0,
          'Spin Studio',
          'Mike Thompson',
          'scheduled',
          1800
        FROM generate_series(0, 6) AS i
        WHERE EXTRACT(DOW FROM CURRENT_DATE + i) NOT IN (0, 6); -- Weekdays only
      END IF;
    END IF;
  END LOOP;
END $$;

-- Create indexes for class_schedules if they don't exist
CREATE INDEX IF NOT EXISTS idx_class_schedules_organization_id ON class_schedules(organization_id);
CREATE INDEX IF NOT EXISTS idx_class_schedules_class_type_id ON class_schedules(class_type_id);
CREATE INDEX IF NOT EXISTS idx_class_schedules_start_time ON class_schedules(start_time);
CREATE INDEX IF NOT EXISTS idx_class_schedules_status ON class_schedules(status);

-- Enable RLS on class_schedules
ALTER TABLE class_schedules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for class_schedules
DROP POLICY IF EXISTS "Users can view class schedules from their organization" ON class_schedules;
CREATE POLICY "Users can view class schedules from their organization" ON class_schedules
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can manage class schedules in their organization" ON class_schedules;
CREATE POLICY "Users can manage class schedules in their organization" ON class_schedules
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'staff')
      AND is_active = true
    )
  );

-- Grant permissions
GRANT ALL ON class_schedules TO authenticated;
GRANT ALL ON class_bookings TO authenticated;