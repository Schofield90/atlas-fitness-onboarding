-- Check Sam's membership data (simplified)

-- Check customer_memberships table
SELECT 
  cm.*,
  mp.name as plan_name,
  mp.price as plan_price
FROM customer_memberships cm
LEFT JOIN membership_plans mp ON mp.id = cm.membership_plan_id
WHERE 
  cm.client_id = '25815bb6-91e2-4c17-8386-fde8a7a0722d'
  OR cm.customer_id IN (
    SELECT id FROM leads 
    WHERE client_id = '25815bb6-91e2-4c17-8386-fde8a7a0722d'
       OR email = 'samschofield90@hotmail.co.uk'
  )
ORDER BY cm.created_at DESC;