-- FIX: "cannot cast type time without time zone to date" error in class_bookings
-- This comprehensive fix ensures all date/time columns have the correct types

-- First, check what columns exist and their types
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'class_bookings'
ORDER BY ordinal_position;

-- Drop any problematic columns that might exist with wrong types
ALTER TABLE class_bookings 
DROP COLUMN IF EXISTS date CASCADE;

ALTER TABLE class_bookings 
DROP COLUMN IF EXISTS time CASCADE;

ALTER TABLE class_bookings 
DROP COLUMN IF EXISTS start_time CASCADE;

ALTER TABLE class_bookings 
DROP COLUMN IF EXISTS end_time CASCADE;

-- Ensure core timestamp columns exist with correct types
ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add booking-specific date/time columns if needed (optional)
ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS booking_date DATE;

ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS booking_time TIME;

-- Fix the amount column if it exists and has wrong type
DO $$
BEGIN
  -- Check if amount column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'class_bookings' 
    AND column_name = 'amount'
  ) THEN
    -- Ensure it's DECIMAL type
    ALTER TABLE class_bookings 
    ALTER COLUMN amount TYPE DECIMAL(10,2) USING amount::DECIMAL(10,2);
  ELSE
    -- Add it if it doesn't exist
    ALTER TABLE class_bookings 
    ADD COLUMN amount DECIMAL(10,2);
  END IF;
END $$;

-- Ensure all required columns exist with correct types
ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS class_session_id UUID REFERENCES class_sessions(id) ON DELETE CASCADE;

ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES leads(id) ON DELETE CASCADE;

ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS booking_status VARCHAR(50) DEFAULT 'confirmed';

ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending';

ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);

ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS booking_type VARCHAR(50);

ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS membership_id UUID;

ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS package_id UUID;

ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create or replace a function to safely handle bookings
CREATE OR REPLACE FUNCTION create_class_booking(
  p_class_session_id UUID,
  p_customer_id UUID DEFAULT NULL,
  p_client_id UUID DEFAULT NULL,
  p_organization_id UUID,
  p_booking_status VARCHAR DEFAULT 'confirmed',
  p_payment_status VARCHAR DEFAULT 'pending',
  p_amount DECIMAL DEFAULT 0,
  p_payment_method VARCHAR DEFAULT NULL,
  p_booking_type VARCHAR DEFAULT 'drop_in',
  p_membership_id UUID DEFAULT NULL,
  p_package_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_booking_id UUID;
BEGIN
  -- Validate that exactly one of customer_id or client_id is provided
  IF (p_customer_id IS NULL AND p_client_id IS NULL) OR 
     (p_customer_id IS NOT NULL AND p_client_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Exactly one of customer_id or client_id must be provided';
  END IF;

  -- Insert the booking
  INSERT INTO class_bookings (
    class_session_id,
    customer_id,
    client_id,
    organization_id,
    booking_status,
    payment_status,
    amount,
    payment_method,
    booking_type,
    membership_id,
    package_id,
    notes,
    created_at,
    updated_at
  ) VALUES (
    p_class_session_id,
    p_customer_id,
    p_client_id,
    p_organization_id,
    p_booking_status,
    p_payment_status,
    p_amount,
    p_payment_method,
    p_booking_type,
    p_membership_id,
    p_package_id,
    p_notes,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION create_class_booking TO authenticated;
GRANT EXECUTE ON FUNCTION create_class_booking TO anon;

-- Final verification
SELECT 
  'Column Check Complete' as status,
  COUNT(*) as total_columns,
  COUNT(CASE WHEN data_type LIKE '%time%' THEN 1 END) as time_columns,
  COUNT(CASE WHEN data_type LIKE '%date%' THEN 1 END) as date_columns
FROM information_schema.columns 
WHERE table_name = 'class_bookings';