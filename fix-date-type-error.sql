-- FIX: "cannot cast type time without time zone to date" error
-- This error occurs when there's a data type mismatch in the class_bookings table

-- Check and fix the data types of date/time columns in class_bookings
ALTER TABLE class_bookings 
ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE USING created_at::TIMESTAMP WITH TIME ZONE;

ALTER TABLE class_bookings 
ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE USING updated_at::TIMESTAMP WITH TIME ZONE;

-- Add these columns if they don't exist with proper types
ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS booking_date DATE;

ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS booking_time TIME;

-- If there's a column that's incorrectly typed, fix it
DO $$
BEGIN
  -- Check if any columns have incorrect types
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'class_bookings' 
    AND column_name IN ('date', 'time', 'start_date', 'end_date')
    AND data_type = 'time without time zone'
  ) THEN
    -- Fix any time columns that should be dates
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_bookings' AND column_name = 'date' AND data_type = 'time without time zone') THEN
      ALTER TABLE class_bookings DROP COLUMN IF EXISTS date;
      ALTER TABLE class_bookings ADD COLUMN date DATE;
    END IF;
  END IF;
END $$;

-- Ensure all timestamp columns have proper defaults
ALTER TABLE class_bookings 
ALTER COLUMN created_at SET DEFAULT NOW();

ALTER TABLE class_bookings 
ALTER COLUMN updated_at SET DEFAULT NOW();

-- Check the actual column types
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'class_bookings'
AND column_name IN ('created_at', 'updated_at', 'booking_date', 'date', 'time', 'booking_time')
ORDER BY ordinal_position;