-- Add missing columns to migration tables for GoTeamUp import compatibility

-- Add source_row_number column to migration_records table if it doesn't exist
ALTER TABLE public.migration_records 
ADD COLUMN IF NOT EXISTS source_row_number INTEGER;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_migration_records_source_row 
ON public.migration_records(migration_job_id, source_row_number);

-- Add any other missing columns that might be needed
COMMENT ON COLUMN public.migration_records.source_row_number IS 'Row number from the source CSV file for tracking';

-- Add missing columns to migration_jobs table
ALTER TABLE public.migration_jobs 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS name VARCHAR(255),
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS successful_imports INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS failed_imports INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_step TEXT,
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS estimated_time_remaining DECIMAL(10,2);

-- Add comments for documentation
COMMENT ON COLUMN public.migration_jobs.description IS 'Human-readable description of the migration job';
COMMENT ON COLUMN public.migration_jobs.name IS 'Name of the migration job for display purposes';
COMMENT ON COLUMN public.migration_jobs.settings IS 'JSON settings for the migration including skipDuplicates, validateData, etc';
COMMENT ON COLUMN public.migration_jobs.successful_imports IS 'Number of successfully imported records';
COMMENT ON COLUMN public.migration_jobs.failed_imports IS 'Number of failed import records';
COMMENT ON COLUMN public.migration_jobs.progress_percentage IS 'Current progress as a percentage (0-100)';
COMMENT ON COLUMN public.migration_jobs.current_step IS 'Current step being executed in the migration';
COMMENT ON COLUMN public.migration_jobs.error_message IS 'Error message if the migration failed';
COMMENT ON COLUMN public.migration_jobs.estimated_time_remaining IS 'Estimated time remaining in minutes';

-- Update the migration_dashboard view to include the new columns
CREATE OR REPLACE VIEW public.migration_dashboard AS
SELECT 
  mj.id,
  mj.organization_id,
  mj.source_system,
  mj.status,
  mj.total_records,
  mj.processed_records,
  mj.successful_records,
  mj.failed_records,
  -- Add alias columns for compatibility
  COALESCE(mj.successful_imports, mj.successful_records) as successful_imports,
  COALESCE(mj.failed_imports, mj.failed_records) as failed_imports,
  mj.started_at,
  mj.completed_at,
  mj.created_at,
  mj.created_by,
  mj.name,
  mj.description,
  mj.settings,
  mj.progress_percentage,
  mj.current_step,
  mj.error_message,
  mj.estimated_time_remaining,
  COUNT(DISTINCT mf.id) as file_count,
  COUNT(DISTINCT mc.id) as conflict_count,
  EXTRACT(EPOCH FROM (COALESCE(mj.completed_at, NOW()) - mj.started_at)) / 60 as duration_minutes
FROM public.migration_jobs mj
LEFT JOIN public.migration_files mf ON mf.migration_job_id = mj.id
LEFT JOIN public.migration_conflicts mc ON mc.migration_job_id = mj.id AND mc.resolved_at IS NULL
GROUP BY mj.id;

-- Grant permissions on the view
GRANT SELECT ON public.migration_dashboard TO authenticated;