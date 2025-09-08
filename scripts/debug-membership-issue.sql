-- Debug why Sam shows "No Membership"

-- 1. Find Sam's exact customer ID
SELECT 
    id,
    name,
    email,
    organization_id
FROM leads
WHERE name LIKE '%Sam%';

-- 2. Check if Sam has a membership record
SELECT 
    cm.id,
    cm.customer_id,
    cm.membership_plan_id,
    cm.status,
    mp.name as plan_name
FROM customer_memberships cm
LEFT JOIN membership_plans mp ON mp.id = cm.membership_plan_id
WHERE cm.customer_id IN (
    SELECT id FROM leads WHERE name LIKE '%Sam%'
);

-- 3. Check what membership plans exist
SELECT 
    id,
    name,
    organization_id
FROM membership_plans
WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b748e';

-- 4. Create membership plan and Sam's membership in one go
-- RUN THIS TO FIX:
-- First ensure a membership plan exists
INSERT INTO membership_plans (
    id,
    organization_id,
    name,
    description,
    price,
    billing_period,
    created_at,
    updated_at
)
VALUES (
    gen_random_uuid(),
    '63589490-8f55-4157-bd3a-e141594b748e',
    'Unlimited Monthly',
    'Unlimited access to all classes',
    9900,
    'monthly',
    NOW(),
    NOW()
)
ON CONFLICT DO NOTHING;

-- Then create Sam's membership
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
WHERE l.name = 'Sam Schofield'
AND NOT EXISTS (
    SELECT 1 FROM customer_memberships cm 
    WHERE cm.customer_id = l.id 
    AND cm.status = 'active'
);

-- 5. Verify the membership was created
SELECT 
    cm.id,
    cm.customer_id,
    cm.status,
    l.name as customer_name,
    mp.name as plan_name
FROM customer_memberships cm
JOIN leads l ON l.id = cm.customer_id
JOIN membership_plans mp ON mp.id = cm.membership_plan_id
WHERE l.name LIKE '%Sam%';