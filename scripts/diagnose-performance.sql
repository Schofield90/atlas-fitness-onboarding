-- =====================================================
-- PERFORMANCE DIAGNOSIS QUERIES
-- Run these to check what might be slowing down the site
-- =====================================================

-- 1. Check for long-running queries
SELECT
  pid,
  now() - pg_stat_activity.query_start AS duration,
  query,
  state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 seconds'
  AND state != 'idle'
ORDER BY duration DESC;

-- 2. Count migration records (might be too many)
SELECT
  COUNT(*) as total_records,
  COUNT(DISTINCT migration_job_id) as jobs_count
FROM migration_records
WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b748e';

-- 3. Check migration_jobs polling frequency
SELECT
  COUNT(*) as query_count,
  MAX(created_at) as latest,
  MIN(created_at) as earliest
FROM migration_logs
WHERE created_at > NOW() - INTERVAL '10 minutes';

-- 4. Check for stuck jobs that might be constantly retrying
SELECT
  id,
  status,
  total_records,
  processed_records,
  started_at,
  updated_at,
  NOW() - updated_at as time_since_update
FROM migration_jobs
WHERE status IN ('processing', 'analyzing', 'mapping')
  AND organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
ORDER BY updated_at DESC;

-- 5. Check database connections
SELECT
  COUNT(*) as connection_count,
  state,
  application_name
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state, application_name
ORDER BY connection_count DESC;

-- 6. Check table sizes (might be too large)
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'migration%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;