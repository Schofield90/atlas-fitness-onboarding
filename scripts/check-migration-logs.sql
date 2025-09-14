-- Check migration logs to see what's happening with failed jobs
-- Run this in Supabase SQL editor: https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new

-- 1. Check recent migration jobs
SELECT 
  id,
  source_system,
  status,
  total_records,
  processed_records,
  successful_records,
  failed_records,
  created_at,
  started_at,
  completed_at,
  EXTRACT(EPOCH FROM (completed_at - started_at)) as duration_seconds
FROM public.migration_jobs
WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check migration logs for the most recent failed job
SELECT 
  ml.level,
  ml.message,
  ml.details,
  ml.created_at
FROM public.migration_logs ml
JOIN public.migration_jobs mj ON ml.migration_job_id = mj.id
WHERE mj.organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
  AND mj.status = 'failed'
ORDER BY ml.created_at DESC
LIMIT 20;

-- 3. Check if there are any migration records created
SELECT 
  COUNT(*) as record_count,
  migration_job_id,
  status
FROM public.migration_records
WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
GROUP BY migration_job_id, status
ORDER BY migration_job_id DESC;

-- 4. Check for any migration conflicts
SELECT 
  COUNT(*) as conflict_count,
  migration_job_id,
  conflict_type
FROM public.migration_conflicts
WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
GROUP BY migration_job_id, conflict_type
ORDER BY migration_job_id DESC;

-- 5. Check the most recent job's error details
SELECT 
  id,
  status,
  error_message,
  ai_analysis->>'error' as ai_error,
  started_at,
  completed_at
FROM public.migration_jobs
WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
  AND status = 'failed'
ORDER BY created_at DESC
LIMIT 5;