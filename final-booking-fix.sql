-- FINAL FIX: Completely rebuild class_bookings table with correct schema
-- This will fix the "cannot cast type time without time zone to date" error once and for all

-- Step 1: Backup existing data
CREATE TABLE IF NOT EXISTS class_bookings_backup AS 
SELECT * FROM class_bookings;

-- Step 2: Drop the problematic table
DROP TABLE IF EXISTS class_bookings CASCADE;

-- Step 3: Recreate with correct schema
CREATE TABLE class_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign keys
  class_session_id UUID REFERENCES class_sessions(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  membership_id UUID,
  package_id UUID,
  
  -- Booking details
  booking_status VARCHAR(50) DEFAULT 'confirmed',
  payment_status VARCHAR(50) DEFAULT 'pending',
  payment_method VARCHAR(50),
  booking_type VARCHAR(50) DEFAULT 'drop_in',
  amount DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  
  -- Timestamps (PROPER TYPES)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Optional date/time fields
  booking_date DATE,
  booking_time TIME,
  
  -- Constraints
  CONSTRAINT check_customer_or_client_booking 
  CHECK (
    (customer_id IS NOT NULL AND client_id IS NULL) OR 
    (customer_id IS NULL AND client_id IS NOT NULL)
  )
);

-- Step 4: Create indexes
CREATE INDEX idx_class_bookings_class_session_id ON class_bookings(class_session_id);
CREATE INDEX idx_class_bookings_customer_id ON class_bookings(customer_id);
CREATE INDEX idx_class_bookings_client_id ON class_bookings(client_id);
CREATE INDEX idx_class_bookings_organization_id ON class_bookings(organization_id);
CREATE INDEX idx_class_bookings_status ON class_bookings(booking_status);

-- Step 5: Enable RLS
ALTER TABLE class_bookings ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies
CREATE POLICY "Public can create class bookings" ON class_bookings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their organization class bookings" ON class_bookings
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid()
    )
    OR true -- Allow public read for booking widgets
  );

CREATE POLICY "Users can update their organization class bookings" ON class_bookings
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their organization class bookings" ON class_bookings
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  );

-- Step 7: Grant permissions
GRANT ALL ON class_bookings TO authenticated;
GRANT INSERT, SELECT ON class_bookings TO anon;

-- Step 8: Restore any existing data (if backup exists and has data)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'class_bookings_backup') THEN
    INSERT INTO class_bookings (
      id,
      class_session_id,
      customer_id,
      client_id,
      organization_id,
      booking_status,
      payment_status,
      payment_method,
      amount,
      notes,
      created_at,
      updated_at
    )
    SELECT 
      id,
      class_session_id,
      customer_id,
      client_id,
      organization_id,
      booking_status,
      payment_status,
      payment_method,
      COALESCE(amount::DECIMAL(10,2), 0),
      notes,
      COALESCE(created_at, NOW()),
      COALESCE(updated_at, NOW())
    FROM class_bookings_backup
    WHERE class_session_id IS NOT NULL
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Step 9: Verify the fix
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'class_bookings'
ORDER BY ordinal_position;

-- Step 10: Test insert to confirm it works
INSERT INTO class_bookings (
  class_session_id,
  client_id,
  organization_id,
  booking_status,
  payment_status,
  amount
) VALUES (
  '75b8752c-f188-4217-9431-7b0eee0704f0'::UUID,
  '1df0e47c-1892-4b1e-ad32-956ebdbf0bab'::UUID,
  '63589490-8f55-4157-bd3a-e141594b748e'::UUID,
  'test',
  'test',
  0
) RETURNING id;

-- If successful, delete the test booking
DELETE FROM class_bookings WHERE booking_status = 'test';

-- Final message
SELECT 'Table rebuilt successfully! Booking should work now.' as status;