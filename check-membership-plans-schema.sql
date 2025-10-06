-- Check membership_plans table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'membership_plans'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check for any existing plans
SELECT id, name, organization_id, price, billing_period
FROM membership_plans
WHERE organization_id = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4'
LIMIT 5;
