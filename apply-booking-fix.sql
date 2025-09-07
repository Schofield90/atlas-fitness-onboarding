-- COMPREHENSIVE BOOKING SYSTEM FIX
-- This fixes the "Could not find the 'class_session_id' column" error
-- Apply this in Supabase Dashboard: https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new

-- ============================================
-- PART 1: Fix class_bookings table structure
-- ============================================

-- Add the missing class_session_id column (THIS IS THE CRITICAL FIX)
ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS class_session_id UUID REFERENCES class_sessions(id) ON DELETE CASCADE;

-- Add client_id for dual customer support
ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

-- Add organization_id if missing
ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add other essential columns if missing
ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS booking_status VARCHAR(50) DEFAULT 'confirmed';

ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending';

ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);

ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_class_bookings_class_session_id ON class_bookings(class_session_id);
CREATE INDEX IF NOT EXISTS idx_class_bookings_client_id ON class_bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_class_bookings_customer_id ON class_bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_class_bookings_organization_id ON class_bookings(organization_id);

-- ============================================
-- PART 2: Fix bookings table (ensure consistency)
-- ============================================

-- Add client_id if missing
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

-- Make customer_id nullable for client bookings
ALTER TABLE bookings 
ALTER COLUMN customer_id DROP NOT NULL;

-- Add constraint to ensure exactly one customer type
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS check_customer_or_client_booking;
ALTER TABLE bookings 
ADD CONSTRAINT check_customer_or_client_booking 
CHECK (
  (customer_id IS NOT NULL AND client_id IS NULL) OR 
  (customer_id IS NULL AND client_id IS NOT NULL)
);

-- Add same constraint to class_bookings
ALTER TABLE class_bookings DROP CONSTRAINT IF EXISTS check_customer_or_client_booking;
ALTER TABLE class_bookings 
ADD CONSTRAINT check_customer_or_client_booking 
CHECK (
  (customer_id IS NOT NULL AND client_id IS NULL) OR 
  (customer_id IS NULL AND client_id IS NOT NULL)
);

-- ============================================
-- PART 3: Fix RLS policies
-- ============================================

-- Enable RLS on class_bookings
ALTER TABLE class_bookings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Public can create class bookings" ON class_bookings;
DROP POLICY IF EXISTS "Users can view their organization class bookings" ON class_bookings;
DROP POLICY IF EXISTS "Users can manage their organization class bookings" ON class_bookings;

-- Create new comprehensive policies
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

-- ============================================
-- PART 4: Grant permissions
-- ============================================

GRANT ALL ON class_bookings TO authenticated;
GRANT INSERT, SELECT ON class_bookings TO anon;

GRANT ALL ON bookings TO authenticated;
GRANT INSERT, SELECT ON bookings TO anon;

-- ============================================
-- PART 5: Verify the fix
-- ============================================

-- Check that class_session_id column now exists
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'class_bookings' 
  AND column_name = 'class_session_id';

-- If this returns a row, the fix was successful!