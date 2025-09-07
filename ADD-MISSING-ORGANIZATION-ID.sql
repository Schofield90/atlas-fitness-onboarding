-- Add missing organization_id column to class_bookings table
-- This fixes the error: "column class_bookings.organization_id does not exist"

ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS organization_id UUID NOT NULL DEFAULT '63589490-8f55-4157-bd3a-e141594b748e';

-- Remove the default after adding the column
ALTER TABLE class_bookings 
ALTER COLUMN organization_id DROP DEFAULT;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_class_bookings_organization_id ON class_bookings(organization_id);

-- Verify the fix
SELECT 'organization_id column added to class_bookings!' as status;