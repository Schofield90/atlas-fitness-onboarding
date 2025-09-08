-- Check Sam's membership status

-- 1. Find Sam's customer ID
SELECT 
    id,
    name,
    email,
    status,
    organization_id
FROM leads
WHERE email LIKE '%sam%' OR name LIKE '%Sam%';

-- 2. Check if Sam has any membership records
SELECT 
    cm.*,
    l.name as customer_name,
    l.email as customer_email
FROM customer_memberships cm
JOIN leads l ON l.id = cm.customer_id
WHERE l.email LIKE '%sam%' OR l.name LIKE '%Sam%';

-- 3. Check all active memberships in the organization
SELECT 
    cm.customer_id,
    cm.plan_name,
    cm.status,
    cm.start_date,
    cm.end_date,
    l.name as customer_name,
    l.email as customer_email
FROM customer_memberships cm
JOIN leads l ON l.id = cm.customer_id
WHERE cm.organization_id IN (
    SELECT organization_id FROM leads WHERE name LIKE '%Sam%'
)
ORDER BY cm.created_at DESC
LIMIT 10;

-- 4. If Sam doesn't have a membership, create one for testing
-- UNCOMMENT TO RUN:
/*
INSERT INTO customer_memberships (
    customer_id,
    organization_id,
    plan_name,
    status,
    start_date,
    created_at,
    updated_at
)
SELECT 
    l.id,
    l.organization_id,
    'Unlimited Monthly',
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
);
*/