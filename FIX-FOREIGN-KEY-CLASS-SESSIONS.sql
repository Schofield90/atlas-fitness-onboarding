-- =============================================
-- FIX FOREIGN KEY CLASS SESSIONS CONSTRAINT
-- Migration: Fix class_bookings.schedule_id to reference class_sessions(id)
-- Issue: MultiClassBookingModal fetches from class_sessions but FK points to schedules table
-- =============================================

-- Drop the incorrect foreign key constraint if it exists
ALTER TABLE class_bookings 
DROP CONSTRAINT IF EXISTS class_bookings_schedule_id_fkey;

-- Drop the old schedules table foreign key if it exists (from previous migrations)
ALTER TABLE class_bookings 
DROP CONSTRAINT IF EXISTS bookings_schedule_id_fkey;

-- Add the correct foreign key constraint to reference class_sessions table
ALTER TABLE class_bookings 
ADD CONSTRAINT class_bookings_schedule_id_fkey 
FOREIGN KEY (schedule_id) REFERENCES class_sessions(id) ON DELETE CASCADE;

-- Rename schedule_id to class_session_id for clarity (optional but clearer)
ALTER TABLE class_bookings 
RENAME COLUMN schedule_id TO class_session_id;

-- Update the foreign key constraint with the new column name
ALTER TABLE class_bookings 
DROP CONSTRAINT IF EXISTS class_bookings_schedule_id_fkey;

ALTER TABLE class_bookings 
ADD CONSTRAINT class_bookings_class_session_id_fkey 
FOREIGN KEY (class_session_id) REFERENCES class_sessions(id) ON DELETE CASCADE;

-- Add helpful comment
COMMENT ON COLUMN class_bookings.class_session_id IS 'References class_sessions table - the actual class instance being booked';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_class_bookings_class_session_id ON class_bookings(class_session_id);