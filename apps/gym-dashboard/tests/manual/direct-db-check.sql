-- TeamUp Import Verification SQL
-- Run this directly in Supabase SQL Editor
-- Organization ID: ee1206d7-62fb-49cf-9f39-95b9c54423a4

-- 1. Check class_types count
SELECT 'Class Types' as metric, COUNT(*) as count
FROM class_types
WHERE organization_id = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4';

-- 2. Check class_schedules count and day_of_week validity
SELECT 'Class Schedules' as metric, COUNT(*) as count
FROM class_schedules
WHERE organization_id = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4';

SELECT 'Schedules with NULL day_of_week' as metric, COUNT(*) as count
FROM class_schedules
WHERE organization_id = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4'
  AND day_of_week IS NULL;

-- 3. Check class_sessions count (future only)
SELECT 'Future Class Sessions' as metric, COUNT(*) as count
FROM class_sessions
WHERE organization_id = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4'
  AND start_time >= NOW();

-- 4. Sample class_schedules with day/time info
SELECT
  CASE day_of_week
    WHEN 0 THEN 'Sunday'
    WHEN 1 THEN 'Monday'
    WHEN 2 THEN 'Tuesday'
    WHEN 3 THEN 'Wednesday'
    WHEN 4 THEN 'Thursday'
    WHEN 5 THEN 'Friday'
    WHEN 6 THEN 'Saturday'
    ELSE 'INVALID'
  END as day,
  start_time,
  end_time,
  instructor_name,
  room_location,
  created_at
FROM class_schedules
WHERE organization_id = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4'
ORDER BY created_at DESC
LIMIT 10;

-- 5. Sample future class_sessions
SELECT
  name,
  start_time,
  instructor_name,
  location,
  capacity,
  created_at
FROM class_sessions
WHERE organization_id = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4'
  AND start_time >= NOW()
ORDER BY start_time ASC
LIMIT 10;

-- 6. Session date range
SELECT
  'First Session' as label,
  MIN(start_time) as date
FROM class_sessions
WHERE organization_id = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4'
  AND start_time >= NOW()
UNION ALL
SELECT
  'Last Session' as label,
  MAX(start_time) as date
FROM class_sessions
WHERE organization_id = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4'
  AND start_time >= NOW();

-- 7. Validation Summary
SELECT
  (SELECT COUNT(*) FROM class_types WHERE organization_id = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4') as class_types_count,
  (SELECT COUNT(*) FROM class_schedules WHERE organization_id = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4') as schedules_count,
  (SELECT COUNT(*) FROM class_sessions WHERE organization_id = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4' AND start_time >= NOW()) as future_sessions_count,
  (SELECT COUNT(*) FROM class_schedules WHERE organization_id = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4' AND day_of_week IS NULL) as invalid_schedules_count,
  CASE
    WHEN (SELECT COUNT(*) FROM class_types WHERE organization_id = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4') >= 30
      AND (SELECT COUNT(*) FROM class_schedules WHERE organization_id = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4') >= 40
      AND (SELECT COUNT(*) FROM class_sessions WHERE organization_id = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4' AND start_time >= NOW()) >= 120
      AND (SELECT COUNT(*) FROM class_schedules WHERE organization_id = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4' AND day_of_week IS NULL) = 0
    THEN '✅ ALL TESTS PASSED'
    ELSE '❌ SOME TESTS FAILED'
  END as test_result;
