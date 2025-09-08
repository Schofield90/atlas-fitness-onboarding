-- Debug Sam's booking and membership

-- 1. Find Sam's exact booking record
SELECT 
    cb.id,
    cb.customer_id,
    cb.booking_status,
    cb.created_at,
    l.name as customer_name,
    l.email,
    cs.id as session_id,
    cs.start_time
FROM class_bookings cb
JOIN class_sessions cs ON cs.id = cb.class_session_id
LEFT JOIN leads l ON l.id = cb.customer_id
WHERE cs.start_time >= '2025-09-09 05:00:00'
AND cs.start_time < '2025-09-09 06:00:00';

-- 2. Check what the unified_booking_view returns for this session
SELECT 
    ubv.id,
    ubv.customer_id,
    ubv.customer_name,
    ubv.status,
    ubv.source_table
FROM unified_booking_view ubv
WHERE ubv.class_session_id = 'eee4508e-0c96-44dd-9d7e-16f0250b22d5';

-- 3. Check if Sam has any membership records at all
SELECT 
    cm.*,
    l.name as customer_name
FROM customer_memberships cm
JOIN leads l ON l.id = cm.customer_id
WHERE l.name LIKE '%Sam%' OR l.email LIKE '%sam%';

-- 4. Check the exact columns in customer_memberships table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'customer_memberships'
ORDER BY ordinal_position;

-- 5. If Sam doesn't have a membership, create one
-- UNCOMMENT AND RUN THIS:
/*
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
    l.id,
    l.organization_id,
    (SELECT id FROM membership_plans WHERE organization_id = l.organization_id LIMIT 1),
    'active',
    CURRENT_DATE,
    NOW(),
    NOW()
FROM leads l
WHERE l.name LIKE '%Sam%'
AND NOT EXISTS (
    SELECT 1 FROM customer_memberships cm 
    WHERE cm.customer_id = l.id 
    AND cm.status = 'active'
)
RETURNING *;
*/