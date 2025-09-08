-- Fix Sam's booking and ensure it shows properly everywhere

-- 1. First, find Sam's customer ID
SELECT id, first_name, last_name, email, status
FROM leads
WHERE first_name = 'Sam' AND last_name = 'Schofield';

-- 2. Find the Tuesday 6am class session
SELECT id, title, start_time, current_bookings, max_capacity
FROM class_sessions
WHERE start_time >= '2025-09-09 06:00:00'
AND start_time < '2025-09-09 07:00:00'
AND title LIKE '%Group%';

-- 3. Check if Sam has a booking for Tuesday 6am
SELECT 
    cb.*,
    cs.title,
    cs.start_time,
    cs.current_bookings
FROM class_bookings cb
JOIN class_sessions cs ON cs.id = cb.class_session_id
WHERE cs.start_time >= '2025-09-09 06:00:00'
AND cs.start_time < '2025-09-09 07:00:00';

-- 4. Force update the booking count for the Tuesday 6am class
-- Replace 'CLASS_SESSION_ID' with the actual ID from step 2
UPDATE class_sessions
SET current_bookings = (
    SELECT COUNT(*)
    FROM class_bookings
    WHERE class_session_id = class_sessions.id
    AND booking_status IN ('confirmed', 'attended')
)
WHERE start_time >= '2025-09-09 06:00:00'
AND start_time < '2025-09-09 07:00:00';

-- 5. If Sam's booking exists but has wrong status, fix it
UPDATE class_bookings
SET booking_status = 'confirmed'
WHERE customer_id IN (
    SELECT id FROM leads 
    WHERE first_name = 'Sam' AND last_name = 'Schofield'
)
AND class_session_id IN (
    SELECT id FROM class_sessions
    WHERE start_time >= '2025-09-09 06:00:00'
    AND start_time < '2025-09-09 07:00:00'
);

-- 6. Final verification - this should show 1 booking for Tuesday 6am
SELECT 
    cs.id,
    cs.title,
    cs.start_time,
    cs.current_bookings,
    cs.max_capacity,
    COUNT(cb.id) as actual_bookings,
    STRING_AGG(l.first_name || ' ' || l.last_name, ', ') as attendees
FROM class_sessions cs
LEFT JOIN class_bookings cb ON cb.class_session_id = cs.id 
    AND cb.booking_status IN ('confirmed', 'attended')
LEFT JOIN leads l ON l.id = cb.customer_id
WHERE cs.start_time >= '2025-09-09 06:00:00'
AND cs.start_time < '2025-09-09 07:00:00'
GROUP BY cs.id, cs.title, cs.start_time, cs.current_bookings, cs.max_capacity
ORDER BY cs.start_time;