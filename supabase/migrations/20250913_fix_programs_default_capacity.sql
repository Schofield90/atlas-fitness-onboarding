-- Add default_capacity column to programs table
ALTER TABLE public.programs 
ADD COLUMN IF NOT EXISTS default_capacity INTEGER DEFAULT 15;

-- Update existing programs to have default_capacity of 15
UPDATE public.programs 
SET default_capacity = 15 
WHERE default_capacity IS NULL;

-- Also update the max_participants column to 15 for existing programs
UPDATE public.programs 
SET max_participants = 15
WHERE max_participants = 12;

-- Update class_sessions to use 15 as default max_capacity
UPDATE public.class_sessions
SET max_capacity = 15
WHERE max_capacity = 12
AND organization_id IS NOT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.programs.default_capacity IS 'Default capacity for class sessions of this program type';

-- Also fix the default for future class_sessions
ALTER TABLE public.class_sessions 
ALTER COLUMN max_capacity SET DEFAULT 15;