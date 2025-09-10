-- Check Sam's membership data

-- First, get Sam's IDs
WITH sam_ids AS (
  SELECT 
    c.id as client_id,
    c.email,
    c.organization_id,
    l.id as lead_id
  FROM clients c
  LEFT JOIN leads l ON l.client_id = c.id OR l.email = c.email
  WHERE c.id = '25815bb6-91e2-4c17-8386-fde8a7a0722d'
)
-- Check customer_memberships table
SELECT 
  'customer_memberships' as table_name,
  cm.id,
  cm.customer_id,
  cm.client_id,
  cm.status,
  cm.start_date,
  cm.end_date,
  cm.membership_plan_id,
  cm.created_at,
  mp.name as plan_name,
  mp.price,
  mp.credits_per_period
FROM customer_memberships cm
LEFT JOIN membership_plans mp ON mp.id = cm.membership_plan_id
WHERE 
  cm.client_id IN (SELECT client_id FROM sam_ids)
  OR cm.customer_id IN (SELECT lead_id FROM sam_ids)
  
UNION ALL

-- Check memberships table (if it exists)
SELECT 
  'memberships' as table_name,
  m.id,
  m.customer_id,
  m.client_id,
  m.status,
  m.start_date,
  m.end_date,
  m.membership_plan_id,
  m.created_at,
  mp.name as plan_name,
  mp.price,
  mp.credits_per_period
FROM memberships m
LEFT JOIN membership_plans mp ON mp.id = m.membership_plan_id
WHERE 
  m.client_id IN (SELECT client_id FROM sam_ids)
  OR m.customer_id IN (SELECT lead_id FROM sam_ids)

ORDER BY table_name, created_at DESC;