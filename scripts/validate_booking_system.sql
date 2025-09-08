-- Validation Script: Test booking system fixes after migration
-- This script validates that the migration successfully fixed the booking system issues
-- Run this after applying 20250908_fix_booking_system_comprehensive.sql

-- =============================================================================
-- PART 1: Schema validation tests
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'BOOKING SYSTEM VALIDATION TESTS';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
END $$;

-- Test 1: Verify constraint exists and is properly configured
SELECT 
  'CONSTRAINT_CHECK' as test_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'check_customer_or_client_booking' 
      AND table_name = 'bookings'
    ) THEN 'PASS - Constraint exists on bookings table'
    ELSE 'FAIL - Constraint missing on bookings table'
  END as result;

-- Test 2: Verify required columns exist
SELECT 
  'COLUMN_CHECK' as test_name,
  string_agg(
    CASE 
      WHEN column_name IN ('customer_id', 'client_id', 'class_session_id', 'booking_status', 'payment_status') 
      THEN column_name || ' ✓'
      ELSE column_name 
    END, 
    ', '
  ) as available_columns
FROM information_schema.columns 
WHERE table_name = 'bookings'
ORDER BY ordinal_position;

-- Test 3: Check if class_bookings table has been properly updated
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'class_bookings') THEN
    RAISE NOTICE 'class_bookings table exists - checking columns...';
  ELSE
    RAISE NOTICE 'class_bookings table does not exist - this is expected in some setups';
  END IF;
END $$;

-- Test 4: Verify RLS policies exist
SELECT 
  'RLS_POLICY_CHECK' as test_name,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  CASE 
    WHEN policyname ILIKE '%allow%' THEN 'UPDATED POLICY ✓'
    ELSE 'ORIGINAL POLICY'
  END as policy_status
FROM pg_policies 
WHERE tablename IN ('bookings', 'class_bookings')
ORDER BY tablename, policyname;

-- Test 5: Check indexes for performance
SELECT 
  'INDEX_CHECK' as test_name,
  indexname,
  tablename,
  indexdef
FROM pg_indexes 
WHERE tablename IN ('bookings', 'class_bookings')
AND indexname ILIKE '%booking%'
ORDER BY tablename, indexname;

-- =============================================================================
-- PART 2: Functional tests with sample data
-- =============================================================================

-- Test 6: Create sample class session for testing
DO $$
DECLARE
  test_org_id UUID;
  test_session_id UUID;
  test_customer_id UUID;
  test_client_id UUID;
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'FUNCTIONAL TESTS WITH SAMPLE DATA';
  RAISE NOTICE '============================================';
  
  -- Get or create test organization
  SELECT id INTO test_org_id FROM organizations LIMIT 1;
  IF test_org_id IS NULL THEN
    INSERT INTO organizations (name, slug) VALUES ('Test Org', 'test-org') RETURNING id INTO test_org_id;
    RAISE NOTICE 'Created test organization: %', test_org_id;
  END IF;
  
  -- Get or create test program
  IF NOT EXISTS (SELECT 1 FROM programs WHERE organization_id = test_org_id LIMIT 1) THEN
    INSERT INTO programs (organization_id, name) VALUES (test_org_id, 'Test Program');
    RAISE NOTICE 'Created test program';
  END IF;
  
  -- Create test class session
  INSERT INTO class_sessions (
    organization_id, 
    program_id, 
    name,
    start_time, 
    end_time,
    max_capacity
  ) 
  SELECT 
    test_org_id,
    id,
    'Test Class Session',
    NOW() + INTERVAL '1 day',
    NOW() + INTERVAL '1 day 1 hour',
    10
  FROM programs 
  WHERE organization_id = test_org_id 
  LIMIT 1
  RETURNING id INTO test_session_id;
  
  RAISE NOTICE 'Created test class session: %', test_session_id;
  
  -- Get or create test customer (from leads table)
  SELECT id INTO test_customer_id FROM leads WHERE organization_id = test_org_id LIMIT 1;
  IF test_customer_id IS NULL THEN
    INSERT INTO leads (organization_id, email, name) 
    VALUES (test_org_id, 'test-customer@example.com', 'Test Customer') 
    RETURNING id INTO test_customer_id;
    RAISE NOTICE 'Created test customer: %', test_customer_id;
  END IF;
  
  -- Get or create test client
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN
    SELECT id INTO test_client_id FROM clients WHERE organization_id = test_org_id LIMIT 1;
    IF test_client_id IS NULL THEN
      INSERT INTO clients (organization_id, email, name) 
      VALUES (test_org_id, 'test-client@example.com', 'Test Client') 
      RETURNING id INTO test_client_id;
      RAISE NOTICE 'Created test client: %', test_client_id;
    END IF;
  END IF;
  
  -- Store test IDs for later tests
  CREATE TEMP TABLE test_data AS 
  SELECT test_org_id as org_id, test_session_id as session_id, test_customer_id as customer_id, test_client_id as client_id;
  
END $$;

-- Test 7: Test booking creation with customer_id only
DO $$
DECLARE
  booking_id UUID;
  test_session_id UUID;
  test_customer_id UUID;
BEGIN
  SELECT session_id, customer_id INTO test_session_id, test_customer_id FROM test_data;
  
  BEGIN
    INSERT INTO bookings (customer_id, class_session_id, booking_status, payment_status)
    VALUES (test_customer_id, test_session_id, 'test_booking', 'test_payment')
    RETURNING id INTO booking_id;
    
    RAISE NOTICE 'TEST 7 PASS: Successfully created booking with customer_id only: %', booking_id;
    
    -- Clean up test booking
    DELETE FROM bookings WHERE id = booking_id;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 7 FAIL: Could not create booking with customer_id only: %', SQLERRM;
  END;
END $$;

-- Test 8: Test booking creation with client_id only
DO $$
DECLARE
  booking_id UUID;
  test_session_id UUID;
  test_client_id UUID;
BEGIN
  SELECT session_id, client_id INTO test_session_id, test_client_id FROM test_data;
  
  BEGIN
    INSERT INTO bookings (client_id, class_session_id, booking_status, payment_status)
    VALUES (test_client_id, test_session_id, 'test_booking', 'test_payment')
    RETURNING id INTO booking_id;
    
    RAISE NOTICE 'TEST 8 PASS: Successfully created booking with client_id only: %', booking_id;
    
    -- Clean up test booking
    DELETE FROM bookings WHERE id = booking_id;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 8 FAIL: Could not create booking with client_id only: %', SQLERRM;
  END;
END $$;

-- Test 9: Test booking creation with both customer_id and client_id (should now be allowed)
DO $$
DECLARE
  booking_id UUID;
  test_session_id UUID;
  test_customer_id UUID;
  test_client_id UUID;
BEGIN
  SELECT session_id, customer_id, client_id INTO test_session_id, test_customer_id, test_client_id FROM test_data;
  
  BEGIN
    INSERT INTO bookings (customer_id, client_id, class_session_id, booking_status, payment_status)
    VALUES (test_customer_id, test_client_id, test_session_id, 'test_booking', 'test_payment')
    RETURNING id INTO booking_id;
    
    RAISE NOTICE 'TEST 9 PASS: Successfully created booking with both customer_id and client_id: %', booking_id;
    
    -- Clean up test booking
    DELETE FROM bookings WHERE id = booking_id;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 9 FAIL: Could not create booking with both customer_id and client_id: %', SQLERRM;
  END;
END $$;

-- Test 10: Test booking creation with neither customer_id nor client_id (should fail)
DO $$
DECLARE
  booking_id UUID;
  test_session_id UUID;
BEGIN
  SELECT session_id INTO test_session_id FROM test_data;
  
  BEGIN
    INSERT INTO bookings (class_session_id, booking_status, payment_status)
    VALUES (test_session_id, 'test_booking', 'test_payment')
    RETURNING id INTO booking_id;
    
    RAISE NOTICE 'TEST 10 FAIL: Should not have been able to create booking without customer identifiers: %', booking_id;
    DELETE FROM bookings WHERE id = booking_id;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 10 PASS: Correctly prevented booking creation without customer identifiers: %', SQLERRM;
  END;
END $$;

-- Test 11: Check unified_bookings view
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'unified_bookings') THEN
    RAISE NOTICE 'TEST 11 PASS: unified_bookings view exists';
    
    -- Test querying the view
    PERFORM * FROM unified_bookings LIMIT 1;
    RAISE NOTICE 'TEST 11 PASS: unified_bookings view is queryable';
  ELSE
    RAISE NOTICE 'TEST 11 FAIL: unified_bookings view does not exist';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'TEST 11 FAIL: Error querying unified_bookings view: %', SQLERRM;
END $$;

-- =============================================================================
-- PART 3: Query performance tests
-- =============================================================================

-- Test 12: Check query plans for critical booking queries
EXPLAIN (ANALYZE, BUFFERS) 
SELECT b.*, cs.name as class_name, cs.start_time 
FROM bookings b 
JOIN class_sessions cs ON b.class_session_id = cs.id 
WHERE b.booking_status = 'confirmed'
LIMIT 10;

-- Test 13: Check index usage
SELECT 
  'INDEX_USAGE_CHECK' as test_name,
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename IN ('bookings', 'class_bookings')
ORDER BY idx_scan DESC;

-- =============================================================================
-- PART 4: Cleanup test data
-- =============================================================================

-- Clean up any remaining test data
DO $$
DECLARE
  test_session_id UUID;
  test_customer_id UUID;
  test_client_id UUID;
  test_org_id UUID;
BEGIN
  SELECT org_id, session_id, customer_id, client_id INTO test_org_id, test_session_id, test_customer_id, test_client_id FROM test_data;
  
  -- Delete test bookings (should be already cleaned up)
  DELETE FROM bookings WHERE booking_status = 'test_booking' OR payment_status = 'test_payment';
  
  -- Delete test class session
  DELETE FROM class_sessions WHERE id = test_session_id;
  
  -- Delete test program
  DELETE FROM programs WHERE organization_id = test_org_id AND name = 'Test Program';
  
  -- Delete test customer if created by this script
  DELETE FROM leads WHERE id = test_customer_id AND email = 'test-customer@example.com';
  
  -- Delete test client if created by this script
  IF test_client_id IS NOT NULL THEN
    DELETE FROM clients WHERE id = test_client_id AND email = 'test-client@example.com';
  END IF;
  
  -- Delete test organization if created by this script
  DELETE FROM organizations WHERE id = test_org_id AND slug = 'test-org';
  
  RAISE NOTICE 'Test data cleanup completed';
END $$;

-- Final summary
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'VALIDATION TESTS COMPLETED';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Review the test results above to ensure:';
  RAISE NOTICE '1. All constraints are properly configured';
  RAISE NOTICE '2. RLS policies allow appropriate access';
  RAISE NOTICE '3. Booking creation works with different customer types';
  RAISE NOTICE '4. Query performance is acceptable';
  RAISE NOTICE '5. Unified booking view is functional';
  RAISE NOTICE '';
  RAISE NOTICE 'If all tests passed, the booking system migration was successful!';
END $$;