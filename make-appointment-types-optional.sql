-- Make appointment_type_ids column optional in booking_links table
ALTER TABLE booking_links
ALTER COLUMN appointment_type_ids DROP NOT NULL;

-- Verify the change
SELECT column_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'booking_links' AND column_name = 'appointment_type_ids';
