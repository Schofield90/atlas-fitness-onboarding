-- Verify booking system for ALL organizations
-- This will show booking counts and attendees for all Tuesday classes

-- 1. Check all class sessions for Tuesday with their booking counts
SELECT 
    cs.id,
    cs.name,
    cs.start_time,
    cs.current_bookings,
    cs.max_capacity,
    cs.organization_id,
    o.name as org_name
FROM class_sessions cs
LEFT JOIN organizations o ON o.id = cs.organization_id
WHERE cs.start_time >= '2025-09-09 00:00:00'
AND cs.start_time < '2025-09-10 00:00:00'
ORDER BY cs.organization_id, cs.start_time;

-- 2. Check all bookings for Tuesday across all organizations
SELECT 
    cb.id,
    cb.class_session_id,
    cb.customer_id,
    cb.booking_status,
    COALESCE(l.name, l.email, 'Unknown') as customer_name,
    cs.name as class_name,
    cs.start_time,
    cs.current_bookings,
    cs.organization_id
FROM class_bookings cb
JOIN class_sessions cs ON cs.id = cb.class_session_id
LEFT JOIN leads l ON l.id = cb.customer_id
WHERE cs.start_time >= '2025-09-09 00:00:00'
AND cs.start_time < '2025-09-10 00:00:00'
AND cb.booking_status IN ('confirmed', 'attended')
ORDER BY cs.organization_id, cs.start_time;

-- 3. Force update booking counts if needed (for ALL organizations)
UPDATE class_sessions 
SET current_bookings = (
    SELECT COUNT(*)
    FROM class_bookings
    WHERE class_session_id = class_sessions.id
    AND booking_status IN ('confirmed', 'attended')
)
WHERE start_time >= '2025-09-09 00:00:00'
AND start_time < '2025-09-10 00:00:00';

-- 4. Check if the unified view is working
SELECT 
    ubv.*,
    cs.name as class_name,
    cs.start_time,
    cs.organization_id
FROM unified_booking_view ubv
JOIN class_sessions cs ON cs.id = ubv.class_session_id
WHERE cs.start_time >= '2025-09-09 00:00:00'
AND cs.start_time < '2025-09-10 00:00:00'
ORDER BY cs.organization_id, cs.start_time;

-- 5. Check what columns exist in customer_memberships table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'customer_memberships'
ORDER BY ordinal_position;

-- 6. Summary: Count bookings by organization for Tuesday
SELECT 
    cs.organization_id,
    o.name as org_name,
    COUNT(DISTINCT cs.id) as total_classes,
    SUM(cs.current_bookings) as total_bookings,
    SUM(cs.max_capacity) as total_capacity
FROM class_sessions cs
LEFT JOIN organizations o ON o.id = cs.organization_id
WHERE cs.start_time >= '2025-09-09 00:00:00'
AND cs.start_time < '2025-09-10 00:00:00'
GROUP BY cs.organization_id, o.name
ORDER BY cs.organization_id;