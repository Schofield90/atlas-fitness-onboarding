-- Clean up future class sessions from September 19th, 2025 onwards
-- This will delete class sessions and their associated bookings
-- but preserve all historical data (September 18th and earlier)

-- First, let's see what we're about to delete
SELECT
  'Class sessions to delete' as type,
  COUNT(*) as count,
  MIN(start_time) as earliest,
  MAX(start_time) as latest
FROM class_sessions
WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
  AND start_time >= '2025-09-19 00:00:00'::timestamp;

-- Check bookings that will be deleted
SELECT
  'Bookings to delete' as type,
  COUNT(*) as count
FROM class_bookings cb
JOIN class_sessions cs ON cb.session_id = cs.id
WHERE cs.organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
  AND cs.start_time >= '2025-09-19 00:00:00'::timestamp;

-- Delete bookings for future class sessions first (due to foreign key constraints)
DELETE FROM class_bookings
WHERE session_id IN (
  SELECT id
  FROM class_sessions
  WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
    AND start_time >= '2025-09-19 00:00:00'::timestamp
);

-- Now delete the future class sessions
DELETE FROM class_sessions
WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
  AND start_time >= '2025-09-19 00:00:00'::timestamp;

-- Verify deletion
SELECT
  'Remaining future sessions' as check_type,
  COUNT(*) as count
FROM class_sessions
WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
  AND start_time >= '2025-09-19 00:00:00'::timestamp;

-- Show remaining sessions (should only be Sept 18th and earlier)
SELECT
  'Sessions on Sept 18th and earlier' as check_type,
  COUNT(*) as count,
  MAX(start_time) as latest_session
FROM class_sessions
WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
  AND start_time < '2025-09-19 00:00:00'::timestamp;

-- Confirm programs/class types are still intact
SELECT
  'Programs (class types) remaining' as check_type,
  COUNT(*) as count
FROM programs
WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b748e';