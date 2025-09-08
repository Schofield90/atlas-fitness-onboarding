-- Comprehensive verification of booking system state
-- Run this to check if Sam's booking and counts are correct

-- 1. Check Sam's customer record
SELECT 
    id, 
    COALESCE(first_name || ' ' || last_name, name, email) as name,
    email, 
    status,
    organization_id
FROM leads
WHERE email LIKE '%sam%' OR name LIKE '%Sam%' OR first_name LIKE '%Sam%';

-- 2. Check Tuesday 6am class and its booking count
SELECT 
    cs.id,
    cs.title,
    cs.start_time,
    cs.current_bookings,
    cs.max_capacity,
    cs.organization_id,
    p.name as program_name
FROM class_sessions cs
LEFT JOIN programs p ON p.id = cs.program_id
WHERE cs.start_time >= '2025-09-09 06:00:00'
AND cs.start_time < '2025-09-09 07:00:00'
ORDER BY cs.start_time;

-- 3. Check all bookings for Tuesday 6am from class_bookings table
SELECT 
    cb.id,
    cb.class_session_id,
    cb.customer_id,
    cb.booking_status,
    COALESCE(l.first_name || ' ' || l.last_name, l.name, l.email) as customer_name,
    cs.title,
    cs.start_time,
    cs.current_bookings
FROM class_bookings cb
JOIN class_sessions cs ON cs.id = cb.class_session_id
LEFT JOIN leads l ON l.id = cb.customer_id
WHERE cs.start_time >= '2025-09-09 06:00:00'
AND cs.start_time < '2025-09-09 07:00:00'
ORDER BY cs.start_time, cb.created_at;

-- 4. Check if there are any bookings in the legacy bookings table
SELECT 
    b.id,
    b.class_session_id,
    b.customer_id,
    b.status,
    COALESCE(l.first_name || ' ' || l.last_name, l.name, l.email) as customer_name,
    cs.title,
    cs.start_time
FROM bookings b
JOIN class_sessions cs ON cs.id = b.class_session_id
LEFT JOIN leads l ON l.id = b.customer_id
WHERE cs.start_time >= '2025-09-09 06:00:00'
AND cs.start_time < '2025-09-09 07:00:00'
ORDER BY cs.start_time, b.created_at;

-- 5. Verify the unified_booking_view shows correct data
SELECT 
    ubv.id,
    ubv.class_session_id,
    ubv.customer_name,
    ubv.customer_email,
    ubv.status,
    ubv.source_table,
    cs.title,
    cs.start_time,
    cs.current_bookings
FROM unified_booking_view ubv
JOIN class_sessions cs ON cs.id = ubv.class_session_id
WHERE cs.start_time >= '2025-09-09 06:00:00'
AND cs.start_time < '2025-09-09 07:00:00'
ORDER BY cs.start_time;

-- 6. Summary: Count bookings by class for Tuesday
SELECT 
    cs.id,
    cs.title,
    cs.start_time,
    cs.current_bookings as shown_count,
    (SELECT COUNT(*) FROM class_bookings WHERE class_session_id = cs.id AND booking_status IN ('confirmed', 'attended')) as actual_bookings,
    (SELECT COUNT(*) FROM bookings WHERE class_session_id = cs.id AND status IN ('confirmed', 'attended')) as legacy_bookings,
    cs.max_capacity
FROM class_sessions cs
WHERE cs.start_time >= '2025-09-09'
AND cs.start_time < '2025-09-10'
ORDER BY cs.start_time;

-- 7. If counts are still wrong, force update them
-- UNCOMMENT THE LINES BELOW TO FIX COUNTS:
/*
UPDATE class_sessions 
SET current_bookings = (
    SELECT COUNT(*)
    FROM class_bookings
    WHERE class_session_id = class_sessions.id
    AND booking_status IN ('confirmed', 'attended')
) + (
    SELECT COUNT(*)
    FROM bookings
    WHERE class_session_id = class_sessions.id
    AND status IN ('confirmed', 'attended')
    AND NOT EXISTS (
        SELECT 1 FROM class_bookings cb
        WHERE cb.class_session_id = bookings.class_session_id
        AND cb.customer_id = bookings.customer_id
    )
)
WHERE start_time >= '2025-09-09'
AND start_time < '2025-09-10';
*/