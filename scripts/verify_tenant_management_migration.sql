-- =============================================
-- TENANT MANAGEMENT MIGRATION VERIFICATION SCRIPT
-- =============================================

-- Test 1: Verify organizations table enhancements
SELECT 'TEST 1: Organizations table structure' as test;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'organizations' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test 2: Verify new tables exist
SELECT 'TEST 2: New tables created' as test;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'tenant_plan_features',
  'usage_ledger', 
  'tenant_risk_scores',
  'customer_success_managers',
  'tenant_events'
)
ORDER BY table_name;

-- Test 3: Verify indexes were created
SELECT 'TEST 3: Performance indexes' as test;
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%organizations%'
OR indexname LIKE 'idx_%usage_ledger%'
OR indexname LIKE 'idx_%tenant_%'
ORDER BY tablename, indexname;

-- Test 4: Verify plan features data
SELECT 'TEST 4: Plan features populated' as test;
SELECT plan_slug, feature_category, COUNT(*) as feature_count
FROM tenant_plan_features
GROUP BY plan_slug, feature_category
ORDER BY plan_slug, feature_category;

-- Test 5: Test usage tracking function
SELECT 'TEST 5: Usage tracking function' as test;
DO $$
DECLARE
  test_org_id UUID;
  usage_id UUID;
BEGIN
  -- Get a test organization
  SELECT id INTO test_org_id FROM organizations LIMIT 1;
  
  IF test_org_id IS NOT NULL THEN
    -- Test usage tracking
    SELECT track_usage(test_org_id, 'sms_sent', 5, '{"test": true}'::jsonb) INTO usage_id;
    RAISE NOTICE 'Usage tracking test successful. Usage ID: %', usage_id;
  ELSE
    RAISE NOTICE 'No organizations found for testing';
  END IF;
END $$;

-- Test 6: Verify admin view
SELECT 'TEST 6: Admin dashboard view' as test;
SELECT COUNT(*) as total_organizations,
       COUNT(CASE WHEN status = 'trial' THEN 1 END) as trial_orgs,
       COUNT(CASE WHEN status = 'active' THEN 1 END) as active_orgs,
       AVG(health_score) as avg_health_score,
       AVG(risk_score) as avg_risk_score
FROM admin_tenant_dashboard;

-- Test 7: Verify RLS policies
SELECT 'TEST 7: RLS policies created' as test;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('usage_ledger', 'tenant_risk_scores', 'tenant_events', 'customer_success_managers')
ORDER BY tablename, policyname;

-- Test 8: Test risk score calculation
SELECT 'TEST 8: Risk score calculation' as test;
DO $$
DECLARE
  test_org_id UUID;
BEGIN
  -- Get a test organization
  SELECT id INTO test_org_id FROM organizations LIMIT 1;
  
  IF test_org_id IS NOT NULL THEN
    -- Calculate risk score
    PERFORM calculate_tenant_risk_score(test_org_id);
    RAISE NOTICE 'Risk score calculation completed for org: %', test_org_id;
    
    -- Check if score was created
    IF EXISTS (SELECT 1 FROM tenant_risk_scores WHERE org_id = test_org_id) THEN
      RAISE NOTICE 'Risk score record created successfully';
    ELSE
      RAISE WARNING 'Risk score record was not created';
    END IF;
  ELSE
    RAISE NOTICE 'No organizations found for testing';
  END IF;
END $$;

-- Test 9: Verify triggers are working
SELECT 'TEST 9: Activity triggers' as test;
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE '%org_activity%'
ORDER BY event_object_table, trigger_name;

-- Test 10: Sample data verification
SELECT 'TEST 10: Sample tenant data' as test;
SELECT 
  name,
  status,
  health_score,
  risk_score,
  churn_risk_level,
  trial_ends_at,
  last_activity_at
FROM organizations
LIMIT 5;

-- Performance check
SELECT 'PERFORMANCE: Query execution times' as test;
\timing on

EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM admin_tenant_dashboard 
WHERE churn_risk_level = 'high'
LIMIT 10;

EXPLAIN (ANALYZE, BUFFERS)
SELECT org_id, SUM(quantity) as total_usage
FROM usage_ledger 
WHERE usage_type = 'sms_sent'
AND billing_period_start >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY org_id
LIMIT 10;

\timing off

SELECT 'VERIFICATION COMPLETE' as result;