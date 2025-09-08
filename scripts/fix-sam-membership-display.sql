-- Fix Sam's membership display issue

-- 1. Check which Sam is actually booked for the Tuesday class
SELECT 
    cb.id as booking_id,
    cb.customer_id,
    cb.booking_status,
    l.id as lead_id,
    l.name,
    l.email,
    cs.start_time
FROM class_bookings cb
JOIN class_sessions cs ON cs.id = cb.class_session_id
LEFT JOIN leads l ON l.id = cb.customer_id
WHERE cs.id = 'eee4508e-0c96-44dd-9d7e-16f0250b22d5';

-- 2. Check both Sam records
SELECT 
    id,
    name,
    email,
    organization_id,
    created_at
FROM leads
WHERE name = 'Sam Schofield'
ORDER BY created_at;

-- 3. Check which Sam has the active membership
SELECT 
    cm.id,
    cm.customer_id,
    cm.status,
    l.id as lead_id,
    l.name,
    l.email,
    mp.name as plan_name
FROM customer_memberships cm
JOIN leads l ON l.id = cm.customer_id
LEFT JOIN membership_plans mp ON mp.id = cm.membership_plan_id
WHERE l.name = 'Sam Schofield'
AND cm.status = 'active';

-- 4. If the booked Sam doesn't have a membership, create one for the RIGHT Sam
-- First, identify the correct Sam ID from the booking
WITH booked_sam AS (
    SELECT DISTINCT cb.customer_id
    FROM class_bookings cb
    JOIN class_sessions cs ON cs.id = cb.class_session_id
    WHERE cs.id = 'eee4508e-0c96-44dd-9d7e-16f0250b22d5'
)
-- Create membership for the booked Sam if they don't have one
INSERT INTO customer_memberships (
    id,
    customer_id,
    organization_id,
    membership_plan_id,
    status,
    start_date,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    bs.customer_id,
    '63589490-8f55-4157-bd3a-e141594b748e',
    (SELECT id FROM membership_plans WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b748e' AND name LIKE '%Monthly%' LIMIT 1),
    'active',
    CURRENT_DATE,
    NOW(),
    NOW()
FROM booked_sam bs
WHERE NOT EXISTS (
    SELECT 1 FROM customer_memberships cm 
    WHERE cm.customer_id = bs.customer_id 
    AND cm.status = 'active'
);

-- 5. Verify the correct Sam now has a membership
SELECT 
    cb.customer_id as booked_customer_id,
    l.name as booked_customer_name,
    cm.id as membership_id,
    cm.status as membership_status,
    mp.name as plan_name
FROM class_bookings cb
JOIN class_sessions cs ON cs.id = cb.class_session_id
JOIN leads l ON l.id = cb.customer_id
LEFT JOIN customer_memberships cm ON cm.customer_id = cb.customer_id AND cm.status = 'active'
LEFT JOIN membership_plans mp ON mp.id = cm.membership_plan_id
WHERE cs.id = 'eee4508e-0c96-44dd-9d7e-16f0250b22d5';