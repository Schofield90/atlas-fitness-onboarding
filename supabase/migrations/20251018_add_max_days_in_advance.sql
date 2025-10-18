-- Add max_days_in_advance column to booking_links table
ALTER TABLE booking_links
ADD COLUMN IF NOT EXISTS max_days_in_advance INTEGER DEFAULT 30;

COMMENT ON COLUMN booking_links.max_days_in_advance IS 'Maximum number of days in advance that bookings can be made';
