-- Add default_capacity column to programs table if it doesn't exist
ALTER TABLE public.programs 
ADD COLUMN IF NOT EXISTS default_capacity INTEGER;

-- Set default_capacity from max_participants if it exists and default_capacity is null
UPDATE public.programs 
SET default_capacity = COALESCE(max_participants, 20)
WHERE default_capacity IS NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.programs.default_capacity IS 'Default capacity for class sessions of this program type';

-- Update class_sessions to use program's default_capacity where appropriate
UPDATE public.class_sessions cs
SET max_capacity = p.default_capacity
FROM public.programs p
WHERE cs.program_id = p.id
AND cs.max_capacity IS NULL
AND p.default_capacity IS NOT NULL;

-- Set a sensible default for future class_sessions (but allow override)
ALTER TABLE public.class_sessions 
ALTER COLUMN max_capacity SET DEFAULT 20;

-- Ensure programs have a sensible default for default_capacity
ALTER TABLE public.programs
ALTER COLUMN default_capacity SET DEFAULT 20;