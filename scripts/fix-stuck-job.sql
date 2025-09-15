-- Fix any stuck jobs that might be causing performance issues
-- These jobs might be in a loop trying to process

-- 1. Check for stuck jobs
SELECT
  id,
  status,
  total_records,
  processed_records,
  started_at,
  NOW() - started_at as duration
FROM migration_jobs
WHERE status IN ('processing', 'analyzing', 'mapping')
  AND organization_id = '63589490-8f55-4157-bd3a-e141594b748e';

-- 2. Reset any jobs that have been stuck for more than 10 minutes
UPDATE migration_jobs
SET
  status = 'failed',
  completed_at = NOW(),
  updated_at = NOW()
WHERE status IN ('processing', 'analyzing', 'mapping')
  AND organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
  AND started_at < NOW() - INTERVAL '10 minutes';

-- 3. Set the specific job to a simpler status
UPDATE migration_jobs
SET
  status = 'pending',
  started_at = NULL,
  updated_at = NOW()
WHERE id = 'd663c635-4378-43c7-bde9-e5587e13a816';

-- 4. Clear any locks or pending operations
DELETE FROM migration_logs
WHERE migration_job_id = 'd663c635-4378-43c7-bde9-e5587e13a816'
  AND created_at < NOW() - INTERVAL '1 hour';