-- Check if any memberships exist
SELECT 
  COUNT(*) as total_memberships,
  COUNT(DISTINCT membership_plan_id) as unique_plans
FROM memberships
WHERE organization_id = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4';

-- Check membership plans
SELECT 
  COUNT(*) as total_plans,
  name,
  price,
  billing_period
FROM membership_plans
WHERE organization_id = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4'
GROUP BY name, price, billing_period
ORDER BY name;
