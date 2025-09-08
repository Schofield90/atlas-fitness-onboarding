-- Fix customer's upcoming sessions by ensuring they have future bookings

-- 1. Check the customer's current bookings
SELECT 
    cb.id,
    cb.customer_id,
    cb.booking_status,
    cs.start_time,
    cs.name as class_name,
    l.name as customer_name
FROM class_bookings cb
JOIN class_sessions cs ON cs.id = cb.class_session_id
LEFT JOIN leads l ON l.id = cb.customer_id
WHERE cb.customer_id = '1df0e47c-1892-4b1e-ad32-956ebdbf0bab'
ORDER BY cs.start_time DESC;

-- 2. Find future classes (Tuesday 9th and later)
SELECT 
    cs.id,
    cs.name,
    cs.start_time,
    cs.current_bookings,
    cs.max_capacity
FROM class_sessions cs
WHERE cs.organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
AND cs.start_time >= CURRENT_TIMESTAMP
ORDER BY cs.start_time
LIMIT 5;

-- 3. Create a booking for the customer for Tuesday's class (if not already booked)
INSERT INTO class_bookings (
    id,
    organization_id,
    class_session_id,
    customer_id,
    booking_status,
    booking_type,
    payment_status,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    '63589490-8f55-4157-bd3a-e141594b748e',
    'eee4508e-0c96-44dd-9d7e-16f0250b22d5', -- Tuesday 6am class
    '1df0e47c-1892-4b1e-ad32-956ebdbf0bab', -- The customer ID from the logs
    'confirmed',
    'drop_in',
    'succeeded',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM class_bookings 
    WHERE customer_id = '1df0e47c-1892-4b1e-ad32-956ebdbf0bab'
    AND class_session_id = 'eee4508e-0c96-44dd-9d7e-16f0250b22d5'
);

-- 4. Also book them for another future class
INSERT INTO class_bookings (
    id,
    organization_id,
    class_session_id,
    customer_id,
    booking_status,
    booking_type,
    payment_status,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    cs.organization_id,
    cs.id,
    '1df0e47c-1892-4b1e-ad32-956ebdbf0bab',
    'confirmed',
    'drop_in',
    'succeeded',
    NOW(),
    NOW()
FROM class_sessions cs
WHERE cs.organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
AND cs.start_time > '2025-09-09 12:00:00'
AND cs.current_bookings < cs.max_capacity
AND NOT EXISTS (
    SELECT 1 FROM class_bookings cb
    WHERE cb.customer_id = '1df0e47c-1892-4b1e-ad32-956ebdbf0bab'
    AND cb.class_session_id = cs.id
)
LIMIT 1;

-- 5. Update booking counts for affected sessions
UPDATE class_sessions 
SET current_bookings = (
    SELECT COUNT(*)
    FROM class_bookings
    WHERE class_session_id = class_sessions.id
    AND booking_status IN ('confirmed', 'attended')
)
WHERE id IN (
    SELECT DISTINCT class_session_id 
    FROM class_bookings 
    WHERE customer_id = '1df0e47c-1892-4b1e-ad32-956ebdbf0bab'
);

-- 6. Verify the customer now has upcoming sessions
SELECT 
    cb.id,
    cb.booking_status,
    cs.name as class_name,
    cs.start_time,
    CASE 
        WHEN cs.start_time > CURRENT_TIMESTAMP THEN 'UPCOMING'
        ELSE 'PAST'
    END as session_status,
    l.name as customer_name
FROM class_bookings cb
JOIN class_sessions cs ON cs.id = cb.class_session_id
LEFT JOIN leads l ON l.id = cb.customer_id
WHERE cb.customer_id = '1df0e47c-1892-4b1e-ad32-956ebdbf0bab'
ORDER BY cs.start_time;