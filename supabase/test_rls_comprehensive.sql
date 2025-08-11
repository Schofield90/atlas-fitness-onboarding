-- =============================================
-- COMPREHENSIVE RLS TESTING SCRIPT
-- Tests the Row Level Security policies for multi-tenant isolation
-- =============================================

-- =============================================
-- 1. VERIFY ALL TABLES HAVE RLS ENABLED
-- =============================================

SELECT 
  'RLS Status Check' as test_category,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  CASE 
    WHEN c.relrowsecurity THEN 'PASS' 
    ELSE 'FAIL - RLS NOT ENABLED' 
  END as status
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' 
AND c.relkind = 'r'
AND (
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = c.relname AND column_name = 'org_id')
  OR EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = c.relname AND column_name = 'organization_id')
)
ORDER BY rls_enabled, table_name;

-- =============================================
-- 2. VERIFY HELPER FUNCTIONS EXIST
-- =============================================

SELECT 
  'Helper Functions Check' as test_category,
  proname as function_name,
  CASE 
    WHEN proname IS NOT NULL THEN 'PASS - Function exists' 
    ELSE 'FAIL - Function missing' 
  END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'auth'
AND proname IN ('organization_id', 'has_organization_access', 'user_organizations', 'is_organization_admin');

-- =============================================
-- 3. COUNT POLICIES PER TABLE
-- =============================================

SELECT 
  'Policy Coverage Check' as test_category,
  c.relname as table_name,
  count(pol.policyname) as policy_count,
  CASE 
    WHEN count(pol.policyname) = 0 THEN 'FAIL - No policies'
    WHEN count(pol.policyname) < 3 THEN 'WARNING - Limited policies'
    WHEN count(pol.policyname) >= 5 THEN 'PASS - Comprehensive coverage'
    ELSE 'PASS - Basic coverage'
  END as status
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
LEFT JOIN pg_policy pol ON pol.polrelid = c.oid
WHERE n.nspname = 'public' 
AND c.relkind = 'r'
AND c.relrowsecurity = true
GROUP BY c.relname
ORDER BY policy_count DESC, table_name;

-- =============================================
-- 4. VERIFY SERVICE ROLE BYPASS POLICIES
-- =============================================

SELECT 
  'Service Role Bypass Check' as test_category,
  pol.schemaname,
  pol.tablename,
  count(*) as service_role_policies,
  CASE 
    WHEN count(*) > 0 THEN 'PASS - Service role can bypass RLS'
    ELSE 'FAIL - Service role blocked'
  END as status
FROM pg_policies pol
WHERE pol.schemaname = 'public'
AND pol.roles = ARRAY['service_role']
GROUP BY pol.schemaname, pol.tablename
ORDER BY tablename;

-- =============================================
-- 5. CHECK FOR PROPER POLICY NAMING CONVENTIONS
-- =============================================

SELECT 
  'Policy Naming Check' as test_category,
  schemaname,
  tablename,
  policyname,
  CASE 
    WHEN policyname LIKE '%_org_%' OR policyname LIKE '%service_role%' OR policyname LIKE 'users_%' OR policyname LIKE 'admins_%'
    THEN 'PASS - Good naming convention'
    ELSE 'WARNING - Consider renaming policy'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =============================================
-- 6. IDENTIFY CRITICAL TABLES WITHOUT RLS
-- =============================================

SELECT 
  'Critical Tables Check' as test_category,
  c.relname as table_name,
  'CRITICAL - Missing RLS on important table' as status
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' 
AND c.relkind = 'r'
AND c.relrowsecurity = false
AND c.relname IN (
  'leads', 'clients', 'opportunities', 'bookings', 'class_sessions', 
  'messages', 'staff_tasks', 'campaigns', 'automations', 'workflows',
  'email_logs', 'analytics_events', 'calendar_events', 'forms', 'contacts'
)
ORDER BY table_name;

-- =============================================
-- 7. VERIFY ORGANIZATION-SCOPED TABLES
-- =============================================

SELECT 
  'Organization Column Check' as test_category,
  t.table_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.column_name = 'org_id')
    THEN 'org_id'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.column_name = 'organization_id')
    THEN 'organization_id'
    ELSE 'NONE - Table may not be multi-tenant'
  END as organization_column,
  EXISTS (
    SELECT 1 FROM pg_class pc
    JOIN pg_namespace pn ON pc.relnamespace = pn.oid
    WHERE pn.nspname = 'public' 
    AND pc.relname = t.table_name
    AND pc.relrowsecurity = true
  ) as has_rls
FROM information_schema.tables t
WHERE t.table_schema = 'public'
AND t.table_type = 'BASE TABLE'
ORDER BY has_rls DESC, organization_column, table_name;

-- =============================================
-- 8. POLICY COMMAND COVERAGE CHECK
-- =============================================

SELECT 
  'Policy Commands Check' as test_category,
  pol.tablename,
  string_agg(DISTINCT pol.cmd, ', ' ORDER BY pol.cmd) as covered_commands,
  CASE 
    WHEN string_agg(DISTINCT pol.cmd, ', ' ORDER BY pol.cmd) ILIKE '%SELECT%' 
         AND string_agg(DISTINCT pol.cmd, ', ' ORDER BY pol.cmd) ILIKE '%INSERT%'
         AND string_agg(DISTINCT pol.cmd, ', ' ORDER BY pol.cmd) ILIKE '%UPDATE%'
    THEN 'PASS - Core operations covered'
    WHEN string_agg(DISTINCT pol.cmd, ', ' ORDER BY pol.cmd) ILIKE '%SELECT%'
    THEN 'WARNING - Only read access'
    ELSE 'FAIL - Incomplete coverage'
  END as status
FROM pg_policies pol
WHERE pol.schemaname = 'public'
GROUP BY pol.tablename
ORDER BY tablename;

-- =============================================
-- 9. RLS COMPREHENSIVE SUMMARY
-- =============================================

SELECT 
  'COMPREHENSIVE SUMMARY' as test_category,
  'Total tables with RLS' as metric,
  count(*) as value
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' 
AND c.relkind = 'r'
AND c.relrowsecurity = true

UNION ALL

SELECT 
  'COMPREHENSIVE SUMMARY' as test_category,
  'Total RLS policies' as metric,
  count(*) as value
FROM pg_policies
WHERE schemaname = 'public'

UNION ALL

SELECT 
  'COMPREHENSIVE SUMMARY' as test_category,
  'Tables with organization columns' as metric,
  count(*) as value
FROM information_schema.tables t
WHERE t.table_schema = 'public'
AND t.table_type = 'BASE TABLE'
AND (
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t.table_name AND column_name = 'org_id')
  OR EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t.table_name AND column_name = 'organization_id')
)

UNION ALL

SELECT 
  'COMPREHENSIVE SUMMARY' as test_category,
  'Service role bypass policies' as metric,
  count(*) as value
FROM pg_policies pol
WHERE pol.schemaname = 'public'
AND pol.roles = ARRAY['service_role'];

-- =============================================
-- 10. FINAL VALIDATION FUNCTION CALL
-- =============================================

-- Run the built-in test function from the migration
SELECT * FROM test_rls_isolation() 
WHERE test_result NOT LIKE 'PASS%'
ORDER BY test_result DESC, table_name;