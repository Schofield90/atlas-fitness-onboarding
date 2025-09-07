-- Add organization_id to bookings table if it doesn't exist
DO $$
BEGIN
  -- Add organization_id column to bookings table if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' 
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE bookings 
    ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
    
    -- Update existing bookings to set organization_id from class_sessions
    UPDATE bookings b
    SET organization_id = cs.organization_id
    FROM class_sessions cs
    WHERE b.class_session_id = cs.id
    AND b.organization_id IS NULL;
    
    -- Make organization_id NOT NULL after populating
    ALTER TABLE bookings 
    ALTER COLUMN organization_id SET NOT NULL;
  END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_organization_id ON bookings(organization_id);

-- Update RLS policies to include organization check
DROP POLICY IF EXISTS "Users can view bookings from their organization" ON bookings;
CREATE POLICY "Users can view bookings from their organization" ON bookings
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can manage bookings in their organization" ON bookings
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'staff')
      AND is_active = true
    )
  );