-- Final fix for class_bookings table - add all missing columns
-- This fixes both "organization_id does not exist" and "booked_at does not exist" errors

-- Add organization_id column
ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS organization_id UUID NOT NULL DEFAULT '63589490-8f55-4157-bd3a-e141594b748e';

-- Add booked_at column for tracking when the booking was made
ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS booked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add status column if missing
ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'confirmed';

-- Add any other commonly needed columns
ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Remove defaults after adding columns
ALTER TABLE class_bookings 
ALTER COLUMN organization_id DROP DEFAULT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_class_bookings_organization_id ON class_bookings(organization_id);
CREATE INDEX IF NOT EXISTS idx_class_bookings_booked_at ON class_bookings(booked_at);
CREATE INDEX IF NOT EXISTS idx_class_bookings_status ON class_bookings(status);

-- Verify all columns exist
SELECT 
    column_name,
    data_type,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'class_bookings'
ORDER BY 
    ordinal_position;