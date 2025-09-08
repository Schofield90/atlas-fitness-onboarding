-- Emergency fix for booking counts
-- This script will fix the booking count mismatch issue

-- Step 1: First, let's see what's in the tables
SELECT 
    cs.id,
    cs.title,
    cs.start_time,
    cs.current_bookings as shown_count,
    (SELECT COUNT(*) FROM class_bookings cb WHERE cb.class_session_id = cs.id AND cb.booking_status IN ('confirmed', 'attended')) as actual_count
FROM class_sessions cs
WHERE cs.organization_id IN (SELECT id FROM organizations WHERE name LIKE '%Atlas%')
AND cs.start_time >= '2025-09-09'
AND cs.start_time < '2025-09-10'
ORDER BY cs.start_time;

-- Step 2: Force update ALL booking counts based on actual bookings
UPDATE class_sessions 
SET current_bookings = subquery.total_count
FROM (
    SELECT 
        cs.id,
        COUNT(cb.id) as total_count
    FROM class_sessions cs
    LEFT JOIN class_bookings cb ON cb.class_session_id = cs.id 
        AND cb.booking_status IN ('confirmed', 'attended')
    GROUP BY cs.id
) as subquery
WHERE class_sessions.id = subquery.id;

-- Step 3: Also check the bookings table (legacy)
UPDATE class_sessions 
SET current_bookings = current_bookings + subquery.total_count
FROM (
    SELECT 
        cs.id,
        COUNT(b.id) as total_count
    FROM class_sessions cs
    LEFT JOIN bookings b ON b.class_session_id = cs.id 
        AND b.status IN ('confirmed', 'attended')
    WHERE b.id NOT IN (
        SELECT id FROM class_bookings
    )
    GROUP BY cs.id
) as subquery
WHERE class_sessions.id = subquery.id AND subquery.total_count > 0;

-- Step 4: Show the results for Tuesday classes
SELECT 
    cs.id,
    cs.title,
    cs.start_time,
    cs.current_bookings,
    cs.max_capacity,
    (SELECT COUNT(*) FROM class_bookings WHERE class_session_id = cs.id AND booking_status IN ('confirmed', 'attended')) as bookings_in_class_bookings,
    (SELECT COUNT(*) FROM bookings WHERE class_session_id = cs.id AND status IN ('confirmed', 'attended')) as bookings_in_bookings
FROM class_sessions cs
WHERE cs.start_time >= '2025-09-09'
AND cs.start_time < '2025-09-10'
ORDER BY cs.start_time;

-- Step 5: List all bookings for Tuesday to verify
SELECT 
    cb.id,
    cb.class_session_id,
    cb.customer_id,
    cb.booking_status,
    l.first_name || ' ' || l.last_name as customer_name,
    cs.title,
    cs.start_time
FROM class_bookings cb
JOIN class_sessions cs ON cs.id = cb.class_session_id
LEFT JOIN leads l ON l.id = cb.customer_id
WHERE cs.start_time >= '2025-09-09'
AND cs.start_time < '2025-09-10'
ORDER BY cs.start_time;