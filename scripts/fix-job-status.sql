-- Fix job status to ready_to_process after successful parse
-- The job has records but is marked as failed

-- Update the job that has parsed records but wrong status
UPDATE migration_jobs
SET
  status = 'ready_to_process',
  error_message = NULL,
  updated_at = NOW()
WHERE id = 'd663c635-4378-43c7-bde9-e5587e13a816'
  AND organization_id = '63589490-8f55-4157-bd3a-e141594b748e';

-- Verify the update
SELECT
  id,
  status,
  total_records,
  processed_records,
  successful_records,
  failed_records,
  error_message
FROM migration_jobs
WHERE id = 'd663c635-4378-43c7-bde9-e5587e13a816';

-- Check why 21 records might be missing (227 total - 206 created)
SELECT
  COUNT(*) as total_parsed_records,
  COUNT(DISTINCT source_row_number) as unique_rows,
  MIN(source_row_number) as first_row,
  MAX(source_row_number) as last_row
FROM migration_records
WHERE migration_job_id = 'd663c635-4378-43c7-bde9-e5587e13a816';