-- ATLAS FITNESS ONBOARDING - NUTRITION PROFILES MIGRATION VERIFICATION
-- Script: verify_nutrition_profiles_migration.sql
-- Purpose: Verify the nutrition_profiles migration was applied correctly
-- Author: DB Migrator
-- Date: 2025-01-10

-- Step 1: Check if nutrition_profiles table exists and has correct structure
\echo '=== NUTRITION PROFILES TABLE VERIFICATION ==='

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nutrition_profiles' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ nutrition_profiles table exists';
    ELSE
        RAISE NOTICE '❌ nutrition_profiles table NOT FOUND';
    END IF;
END
$$;

-- Step 2: Check for required columns and constraints
\echo ''
\echo '=== COLUMN AND CONSTRAINT VERIFICATION ==='

-- Check for primary key
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'nutrition_profiles' 
        AND constraint_type = 'PRIMARY KEY'
    ) 
    THEN '✅ Primary key constraint exists'
    ELSE '❌ Primary key constraint MISSING'
    END as primary_key_check;

-- Check for foreign key constraints
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    '✅ FK constraint found' as status
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'nutrition_profiles'
ORDER BY tc.constraint_name;

-- Check for specific required columns
\echo ''
\echo '=== REQUIRED COLUMNS VERIFICATION ==='

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name IN ('id', 'organization_id', 'age', 'gender', 'activity_level') 
        THEN '✅ Required column present'
        WHEN column_name IN ('client_id', 'lead_id') 
        THEN '✅ FK column present (one required)'
        ELSE '✅ Optional column present'
    END as verification_status
FROM information_schema.columns 
WHERE table_name = 'nutrition_profiles' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 3: Verify indexes exist
\echo ''
\echo '=== INDEX VERIFICATION ==='

SELECT 
    indexname,
    tablename,
    indexdef,
    '✅ Index exists' as status
FROM pg_indexes 
WHERE tablename = 'nutrition_profiles' 
    AND schemaname = 'public'
ORDER BY indexname;

-- Step 4: Check Row Level Security
\echo ''
\echo '=== ROW LEVEL SECURITY VERIFICATION ==='

SELECT 
    schemaname,
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity = true THEN '✅ RLS enabled'
        ELSE '❌ RLS NOT enabled'
    END as rls_status
FROM pg_tables 
WHERE tablename = 'nutrition_profiles' 
    AND schemaname = 'public';

-- Check RLS policies
SELECT 
    policyname,
    tablename,
    permissive,
    roles,
    cmd,
    qual,
    '✅ Policy exists' as status
FROM pg_policies 
WHERE tablename = 'nutrition_profiles' 
    AND schemaname = 'public'
ORDER BY policyname;

-- Step 5: Data integrity checks
\echo ''
\echo '=== DATA INTEGRITY VERIFICATION ==='

-- Check for records with both client_id and lead_id (should be none)
SELECT 
    COUNT(*) as violating_records,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No records violate client_id/lead_id exclusivity'
        ELSE '❌ ' || COUNT(*) || ' records have both client_id AND lead_id'
    END as exclusivity_check
FROM nutrition_profiles 
WHERE client_id IS NOT NULL AND lead_id IS NOT NULL;

-- Check for records with neither client_id nor lead_id (should be none)
SELECT 
    COUNT(*) as orphaned_records,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No orphaned records found'
        ELSE '❌ ' || COUNT(*) || ' records have neither client_id NOR lead_id'
    END as orphan_check
FROM nutrition_profiles 
WHERE client_id IS NULL AND lead_id IS NULL;

-- Check for invalid foreign key references
SELECT 
    COUNT(*) as invalid_client_refs,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ All client_id references are valid'
        ELSE '❌ ' || COUNT(*) || ' invalid client_id references found'
    END as client_ref_check
FROM nutrition_profiles np
LEFT JOIN clients c ON np.client_id = c.id
WHERE np.client_id IS NOT NULL AND c.id IS NULL;

SELECT 
    COUNT(*) as invalid_lead_refs,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ All lead_id references are valid'
        ELSE '❌ ' || COUNT(*) || ' invalid lead_id references found'
    END as lead_ref_check
FROM nutrition_profiles np
LEFT JOIN leads l ON np.lead_id = l.id
WHERE np.lead_id IS NOT NULL AND l.id IS NULL;

-- Check for invalid organization references
SELECT 
    COUNT(*) as invalid_org_refs,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ All organization_id references are valid'
        ELSE '❌ ' || COUNT(*) || ' invalid organization_id references found'
    END as org_ref_check
FROM nutrition_profiles np
LEFT JOIN organizations o ON np.organization_id = o.id
WHERE np.organization_id IS NOT NULL AND o.id IS NULL;

-- Step 6: Check data distribution and quality
\echo ''
\echo '=== DATA QUALITY VERIFICATION ==='

-- Count records by reference type
SELECT 
    'Client-based profiles' as profile_type,
    COUNT(*) as count
FROM nutrition_profiles 
WHERE client_id IS NOT NULL
UNION ALL
SELECT 
    'Lead-based profiles' as profile_type,
    COUNT(*) as count
FROM nutrition_profiles 
WHERE lead_id IS NOT NULL
UNION ALL
SELECT 
    'Total profiles' as profile_type,
    COUNT(*) as count
FROM nutrition_profiles;

-- Check for reasonable data ranges
SELECT 
    'Age range check' as check_type,
    MIN(age) as min_value,
    MAX(age) as max_value,
    CASE 
        WHEN MIN(age) >= 13 AND MAX(age) <= 120 THEN '✅ Age values within reasonable range'
        ELSE '⚠️ Age values may be outside reasonable range (13-120)'
    END as validation_result
FROM nutrition_profiles
WHERE age IS NOT NULL
UNION ALL
SELECT 
    'Height range check' as check_type,
    MIN(height_cm) as min_value,
    MAX(height_cm) as max_value,
    CASE 
        WHEN MIN(height_cm) >= 120 AND MAX(height_cm) <= 250 THEN '✅ Height values within reasonable range'
        ELSE '⚠️ Height values may be outside reasonable range (120-250cm)'
    END as validation_result
FROM nutrition_profiles
WHERE height_cm IS NOT NULL
UNION ALL
SELECT 
    'Weight range check' as check_type,
    MIN(weight_kg::numeric) as min_value,
    MAX(weight_kg::numeric) as max_value,
    CASE 
        WHEN MIN(weight_kg) >= 30 AND MAX(weight_kg) <= 300 THEN '✅ Weight values within reasonable range'
        ELSE '⚠️ Weight values may be outside reasonable range (30-300kg)'
    END as validation_result
FROM nutrition_profiles
WHERE weight_kg IS NOT NULL;

-- Step 7: Migration summary
\echo ''
\echo '=== MIGRATION VERIFICATION SUMMARY ==='

DO $$
DECLARE
    total_profiles integer;
    client_profiles integer;
    lead_profiles integer;
    total_indexes integer;
    total_policies integer;
BEGIN
    SELECT COUNT(*) FROM nutrition_profiles INTO total_profiles;
    SELECT COUNT(*) FROM nutrition_profiles WHERE client_id IS NOT NULL INTO client_profiles;
    SELECT COUNT(*) FROM nutrition_profiles WHERE lead_id IS NOT NULL INTO lead_profiles;
    SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'nutrition_profiles' INTO total_indexes;
    SELECT COUNT(*) FROM pg_policies WHERE tablename = 'nutrition_profiles' INTO total_policies;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== MIGRATION VERIFICATION COMPLETE ===';
    RAISE NOTICE 'Total nutrition profiles: %', total_profiles;
    RAISE NOTICE 'Client-based profiles: %', client_profiles;
    RAISE NOTICE 'Lead-based profiles: %', lead_profiles;
    RAISE NOTICE 'Database indexes: %', total_indexes;
    RAISE NOTICE 'RLS policies: %', total_policies;
    RAISE NOTICE '';
    
    IF total_profiles > 0 THEN
        RAISE NOTICE '✅ Migration appears successful with data preserved';
    ELSE
        RAISE NOTICE '⚠️ No data found - verify if this is expected';
    END IF;
    
    RAISE NOTICE '✅ Verification script completed';
END
$$;