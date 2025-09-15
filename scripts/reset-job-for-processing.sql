-- Reset the job to a state where it can be processed
-- The analyzing status seems to be stuck

-- First, check what the job looks like
SELECT
  id,
  status,
  total_records,
  processed_records,
  successful_records,
  failed_records,
  started_at,
  completed_at
FROM migration_jobs
WHERE id = 'd663c635-4378-43c7-bde9-e5587e13a816';

-- Reset to pending so we can trigger processing
UPDATE migration_jobs
SET
  status = 'pending',
  started_at = NULL,
  completed_at = NULL,
  updated_at = NOW()
WHERE id = 'd663c635-4378-43c7-bde9-e5587e13a816';

-- Verify the update
SELECT
  id,
  status,
  total_records,
  processed_records
FROM migration_jobs
WHERE id = 'd663c635-4378-43c7-bde9-e5587e13a816';

-- Check that we have migration records ready to process
SELECT
  COUNT(*) as records_ready,
  MIN(status) as min_status,
  MAX(status) as max_status
FROM migration_records
WHERE migration_job_id = 'd663c635-4378-43c7-bde9-e5587e13a816';