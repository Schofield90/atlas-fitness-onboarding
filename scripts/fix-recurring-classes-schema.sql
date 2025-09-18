-- Fix recurring classes schema
-- This script adds the missing columns for recurring class functionality

-- Add recurrence-related columns if they don't exist
ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS recurrence_rule TEXT;
ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS recurrence_end_date TIMESTAMPTZ;
ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS parent_session_id UUID REFERENCES class_sessions(id);

-- Note: We're not adding is_recurring or occurrence_date as they cause issues
-- We use parent_session_id to identify recurring sessions

-- Add index for better performance when querying recurring sessions
CREATE INDEX IF NOT EXISTS idx_class_sessions_parent_session_id ON class_sessions(parent_session_id);

-- Add comments for documentation
COMMENT ON COLUMN class_sessions.recurrence_rule IS 'RRULE format string defining the recurrence pattern';
COMMENT ON COLUMN class_sessions.recurrence_end_date IS 'End date for the recurring series';
COMMENT ON COLUMN class_sessions.parent_session_id IS 'Reference to the original session in a recurring series';