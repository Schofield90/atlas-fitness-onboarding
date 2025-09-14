-- Fix missing resolution_status column in migration_conflicts table
-- This fixes the 500 error on /api/migration/jobs/[id]/conflicts

-- Add resolution_status column to migration_conflicts table if it doesn't exist
ALTER TABLE public.migration_conflicts 
ADD COLUMN IF NOT EXISTS resolution_status VARCHAR(50) DEFAULT 'pending';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_migration_conflicts_status 
ON public.migration_conflicts(migration_job_id, resolution_status);

-- Update any existing conflicts to have pending status if NULL
UPDATE public.migration_conflicts 
SET resolution_status = 'pending' 
WHERE resolution_status IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.migration_conflicts.resolution_status IS 'Status of conflict resolution: pending, resolved, skipped';

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'migration_conflicts' 
AND column_name = 'resolution_status';