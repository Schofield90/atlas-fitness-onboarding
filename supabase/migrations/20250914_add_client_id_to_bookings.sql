-- Add client_id column to bookings table to support both leads and clients
-- This allows bookings to be associated with either leads (customer_id) or clients (client_id)

DO $$
BEGIN
  -- Add the client_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' 
    AND column_name = 'client_id'
  ) THEN
    ALTER TABLE bookings 
    ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE CASCADE;
  END IF;
  
  -- Add index for client_id
  CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON bookings(client_id);
  
  -- Update the constraint to allow either customer_id OR client_id (but not both)
  -- First check if constraint exists and drop it
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'check_customer_or_client_booking'
    AND table_name = 'bookings'
  ) THEN
    ALTER TABLE bookings DROP CONSTRAINT check_customer_or_client_booking;
  END IF;
  
  -- Make customer_id nullable since we can use client_id instead
  ALTER TABLE bookings ALTER COLUMN customer_id DROP NOT NULL;
  
  -- Add check constraint to ensure exactly one of customer_id or client_id is set
  ALTER TABLE bookings 
  ADD CONSTRAINT check_customer_or_client_booking 
  CHECK (
    (customer_id IS NOT NULL AND client_id IS NULL) OR 
    (customer_id IS NULL AND client_id IS NOT NULL)
  );
END $$;

-- Update RLS policies to handle both customer_id and client_id
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

DROP POLICY IF EXISTS "Users can manage bookings in their organization" ON bookings;
CREATE POLICY "Users can manage bookings in their organization" ON bookings
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'staff')
      AND is_active = true
    )
  );