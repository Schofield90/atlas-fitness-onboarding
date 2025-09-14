-- Add missing columns to migration tables

-- Add source_row_number column to migration_records table if it doesn't exist
ALTER TABLE public.migration_records 
ADD COLUMN IF NOT EXISTS source_row_number INTEGER;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_migration_records_source_row 
ON public.migration_records(migration_job_id, source_row_number);

-- Add any other missing columns that might be needed
COMMENT ON COLUMN public.migration_records.source_row_number IS 'Row number from the source CSV file for tracking';