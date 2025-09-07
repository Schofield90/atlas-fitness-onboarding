-- Fix booking system to support both leads and clients
-- This migration adds client_id support to the bookings table

-- 1. Add client_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2. Make customer_id nullable (already done by your SQL, but safe to re-run)
ALTER TABLE bookings ALTER COLUMN customer_id DROP NOT NULL;

-- 3. Drop old constraint if exists and add new one
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS check_customer_or_client_booking;
ALTER TABLE bookings 
ADD CONSTRAINT check_customer_or_client_booking 
CHECK (
  (customer_id IS NOT NULL AND client_id IS NULL) OR 
  (customer_id IS NULL AND client_id IS NOT NULL)
);

-- 4. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_organization_id ON bookings(organization_id);

-- 5. Update RLS policies to support both customer types
DROP POLICY IF EXISTS "Public can create bookings" ON bookings;
CREATE POLICY "Public can create bookings" ON bookings
  FOR INSERT WITH CHECK (true);

-- 6. Grant necessary permissions
GRANT INSERT ON bookings TO anon;
GRANT INSERT ON bookings TO authenticated;