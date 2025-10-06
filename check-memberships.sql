-- Check recent membership imports
SELECT 
  COUNT(*) as total_memberships,
  COUNT(DISTINCT membership_plan_id) as unique_plans,
  COUNT(CASE WHEN custom_price_pennies IS NOT NULL THEN 1 END) as custom_priced,
  COUNT(CASE WHEN billing_source = 'goteamup' THEN 1 END) as goteamup_billing,
  COUNT(CASE WHEN billing_source = 'crm' THEN 1 END) as crm_billing
FROM customer_memberships
WHERE organization_id = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4';
