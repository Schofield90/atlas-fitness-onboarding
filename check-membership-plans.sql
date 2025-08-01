-- Check all membership plans in the database
SELECT 
  mp.*,
  o.name as organization_name
FROM membership_plans mp
LEFT JOIN organizations o ON o.id = mp.organization_id
ORDER BY mp.created_at DESC;

-- Check specifically for Atlas Fitness membership plans
SELECT * FROM membership_plans
WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
ORDER BY created_at DESC;