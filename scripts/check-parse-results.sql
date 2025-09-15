-- Check if parsing created migration records
-- Run this after clicking Parse CSV to see if records were created

-- 1. Check the latest migration job status
SELECT
  id,
  source_system,
  status,
  total_records,
  processed_records,
  created_at,
  updated_at
FROM migration_jobs
WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
ORDER BY created_at DESC
LIMIT 5;

-- 2. Count migration records for recent jobs
SELECT
  mj.id as job_id,
  mj.status as job_status,
  mj.total_records,
  COUNT(mr.id) as actual_records_count,
  MIN(mr.created_at) as first_record_created,
  MAX(mr.created_at) as last_record_created
FROM migration_jobs mj
LEFT JOIN migration_records mr ON mj.id = mr.migration_job_id
WHERE mj.organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
GROUP BY mj.id, mj.status, mj.total_records
ORDER BY mj.created_at DESC
LIMIT 5;

-- 3. Check sample migration records for the most recent job
SELECT
  id,
  migration_job_id,
  source_row_number,
  status,
  record_type,
  created_at,
  jsonb_pretty(source_data) as source_data
FROM migration_records
WHERE migration_job_id IN (
  SELECT id
  FROM migration_jobs
  WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
  ORDER BY created_at DESC
  LIMIT 1
)
ORDER BY source_row_number
LIMIT 5;

-- 4. Check if there are any errors in migration_logs
SELECT
  level,
  message,
  created_at
FROM migration_logs
WHERE migration_job_id IN (
  SELECT id
  FROM migration_jobs
  WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
  ORDER BY created_at DESC
  LIMIT 1
)
AND level = 'error'
ORDER BY created_at DESC
LIMIT 10;