-- Add capacity columns to programs table
ALTER TABLE programs ADD COLUMN IF NOT EXISTS max_capacity INTEGER DEFAULT 20;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS default_capacity INTEGER DEFAULT 20;

-- Ensure class_sessions have capacity columns
ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS max_capacity INTEGER DEFAULT 20;
ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 20;

-- Update existing programs with sensible defaults
UPDATE programs SET max_capacity = 20 WHERE max_capacity IS NULL;
UPDATE programs SET default_capacity = 20 WHERE default_capacity IS NULL;

-- Update existing class_sessions with sensible defaults
UPDATE class_sessions SET max_capacity = COALESCE(capacity, 20) WHERE max_capacity IS NULL;
UPDATE class_sessions SET capacity = COALESCE(max_capacity, 20) WHERE capacity IS NULL;

-- Add comments
COMMENT ON COLUMN programs.max_capacity IS 'Maximum number of participants for this program';
COMMENT ON COLUMN programs.default_capacity IS 'Default capacity for new class sessions of this program';
COMMENT ON COLUMN class_sessions.max_capacity IS 'Maximum capacity for this specific class session';
COMMENT ON COLUMN class_sessions.capacity IS 'Current capacity for this class session';