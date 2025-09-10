-- ATLAS FITNESS ONBOARDING - NUTRITION PROFILES REFERENCE BACKFILL
-- Script: backfill_nutrition_profile_references.sql
-- Purpose: Safely backfill missing client/lead references in nutrition_profiles
-- Author: DB Migrator
-- Date: 2025-01-10

-- This script helps resolve orphaned nutrition profiles by establishing proper FK relationships

\echo '=== NUTRITION PROFILES REFERENCE BACKFILL ==='

-- Step 1: Analyze current reference state
\echo ''
\echo '=== CURRENT REFERENCE STATE ANALYSIS ==='

DO $$
DECLARE
    total_profiles integer;
    client_based integer;
    lead_based integer;
    orphaned integer;
    dual_referenced integer;
BEGIN
    SELECT COUNT(*) FROM nutrition_profiles INTO total_profiles;
    SELECT COUNT(*) FROM nutrition_profiles WHERE client_id IS NOT NULL INTO client_based;
    SELECT COUNT(*) FROM nutrition_profiles WHERE lead_id IS NOT NULL INTO lead_based;
    SELECT COUNT(*) FROM nutrition_profiles WHERE client_id IS NULL AND lead_id IS NULL INTO orphaned;
    SELECT COUNT(*) FROM nutrition_profiles WHERE client_id IS NOT NULL AND lead_id IS NOT NULL INTO dual_referenced;
    
    RAISE NOTICE 'Total nutrition profiles: %', total_profiles;
    RAISE NOTICE 'Client-based profiles: %', client_based;
    RAISE NOTICE 'Lead-based profiles: %', lead_based;
    RAISE NOTICE 'Orphaned profiles (no reference): %', orphaned;
    RAISE NOTICE 'Dual-referenced profiles (INVALID): %', dual_referenced;
    
    IF orphaned > 0 THEN
        RAISE NOTICE '⚠️ Found % orphaned profiles that need reference backfill', orphaned;
    END IF;
    
    IF dual_referenced > 0 THEN
        RAISE NOTICE '❌ Found % profiles with both client_id AND lead_id (constraint violation)', dual_referenced;
    END IF;
END
$$;

-- Step 2: Fix dual-referenced profiles (keep client_id, remove lead_id)
\echo ''
\echo '=== FIXING DUAL-REFERENCED PROFILES ==='

UPDATE nutrition_profiles 
SET lead_id = NULL,
    updated_at = NOW()
WHERE client_id IS NOT NULL AND lead_id IS NOT NULL;

GET DIAGNOSTICS dual_reference_fixes = ROW_COUNT;

DO $$
BEGIN
    IF dual_reference_fixes > 0 THEN
        RAISE NOTICE '✅ Fixed % dual-referenced profiles (kept client_id, removed lead_id)', dual_reference_fixes;
    ELSE
        RAISE NOTICE '✅ No dual-referenced profiles found';
    END IF;
END
$$;

-- Step 3: Attempt to backfill orphaned profiles
\echo ''
\echo '=== BACKFILLING ORPHANED PROFILES ==='

-- Create a temporary analysis table
CREATE TEMP TABLE orphaned_profile_analysis AS
SELECT 
    np.id,
    np.organization_id,
    np.created_at,
    np.updated_at,
    -- Try to find matching clients by organization and timing
    (
        SELECT c.id 
        FROM clients c 
        WHERE c.organization_id = np.organization_id
        AND c.created_at <= np.created_at + INTERVAL '1 hour'
        AND c.created_at >= np.created_at - INTERVAL '1 hour'
        ORDER BY ABS(EXTRACT(EPOCH FROM (c.created_at - np.created_at)))
        LIMIT 1
    ) as potential_client_id,
    -- Try to find matching leads by organization and timing
    (
        SELECT l.id 
        FROM leads l 
        WHERE l.organization_id = np.organization_id
        AND l.created_at <= np.created_at + INTERVAL '1 hour'
        AND l.created_at >= np.created_at - INTERVAL '1 hour'
        ORDER BY ABS(EXTRACT(EPOCH FROM (l.created_at - np.created_at)))
        LIMIT 1
    ) as potential_lead_id
FROM nutrition_profiles np
WHERE np.client_id IS NULL AND np.lead_id IS NULL;

-- Report potential matches
SELECT 
    'Orphaned profiles analysis' as analysis_type,
    COUNT(*) as total_orphaned,
    COUNT(potential_client_id) as potential_client_matches,
    COUNT(potential_lead_id) as potential_lead_matches,
    COUNT(CASE WHEN potential_client_id IS NOT NULL OR potential_lead_id IS NOT NULL THEN 1 END) as total_potential_matches
FROM orphaned_profile_analysis;

-- Step 4: Backfill client references (preferred)
WITH client_backfill AS (
    UPDATE nutrition_profiles 
    SET client_id = opa.potential_client_id,
        updated_at = NOW()
    FROM orphaned_profile_analysis opa
    WHERE nutrition_profiles.id = opa.id
        AND opa.potential_client_id IS NOT NULL
        AND nutrition_profiles.client_id IS NULL 
        AND nutrition_profiles.lead_id IS NULL
    RETURNING nutrition_profiles.id
)
SELECT 
    COUNT(*) as backfilled_client_count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Successfully backfilled client references'
        ELSE '✅ No client references to backfill'
    END as client_backfill_status
FROM client_backfill;

-- Step 5: Backfill lead references (for remaining orphans)
WITH lead_backfill AS (
    UPDATE nutrition_profiles 
    SET lead_id = opa.potential_lead_id,
        updated_at = NOW()
    FROM orphaned_profile_analysis opa
    WHERE nutrition_profiles.id = opa.id
        AND opa.potential_lead_id IS NOT NULL
        AND nutrition_profiles.client_id IS NULL 
        AND nutrition_profiles.lead_id IS NULL
        AND opa.potential_client_id IS NULL  -- Only if no client match was found
    RETURNING nutrition_profiles.id
)
SELECT 
    COUNT(*) as backfilled_lead_count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Successfully backfilled lead references'
        ELSE '✅ No lead references to backfill'
    END as lead_backfill_status
FROM lead_backfill;

-- Step 6: Report remaining orphaned profiles
\echo ''
\echo '=== REMAINING ORPHANED PROFILES ANALYSIS ==='

SELECT 
    np.id,
    np.organization_id,
    np.age,
    np.gender,
    np.created_at,
    'Requires manual intervention' as status
FROM nutrition_profiles np
WHERE np.client_id IS NULL AND np.lead_id IS NULL
ORDER BY np.created_at DESC;

-- Count remaining orphans
DO $$
DECLARE
    remaining_orphans integer;
BEGIN
    SELECT COUNT(*) FROM nutrition_profiles 
    WHERE client_id IS NULL AND lead_id IS NULL INTO remaining_orphans;
    
    IF remaining_orphans = 0 THEN
        RAISE NOTICE '✅ All orphaned profiles successfully resolved';
    ELSE
        RAISE NOTICE '⚠️ % profiles remain orphaned and require manual intervention', remaining_orphans;
        RAISE NOTICE 'These profiles may need to be deleted or manually assigned references';
    END IF;
END
$$;

-- Step 7: Validate all foreign key relationships
\echo ''
\echo '=== FOREIGN KEY VALIDATION ==='

-- Check for broken client_id references
SELECT 
    COUNT(*) as broken_client_refs,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ All client_id references are valid'
        ELSE '❌ ' || COUNT(*) || ' broken client_id references found'
    END as client_validation
FROM nutrition_profiles np
LEFT JOIN clients c ON np.client_id = c.id
WHERE np.client_id IS NOT NULL AND c.id IS NULL;

-- Check for broken lead_id references
SELECT 
    COUNT(*) as broken_lead_refs,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ All lead_id references are valid'
        ELSE '❌ ' || COUNT(*) || ' broken lead_id references found'
    END as lead_validation
FROM nutrition_profiles np
LEFT JOIN leads l ON np.lead_id = l.id
WHERE np.lead_id IS NOT NULL AND l.id IS NULL;

-- Check for broken organization_id references
SELECT 
    COUNT(*) as broken_org_refs,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ All organization_id references are valid'
        ELSE '❌ ' || COUNT(*) || ' broken organization_id references found'
    END as org_validation
FROM nutrition_profiles np
LEFT JOIN organizations o ON np.organization_id = o.id
WHERE np.organization_id IS NOT NULL AND o.id IS NULL;

-- Step 8: Final state summary
\echo ''
\echo '=== BACKFILL SUMMARY ==='

DO $$
DECLARE
    final_total integer;
    final_client_based integer;
    final_lead_based integer;
    final_orphaned integer;
BEGIN
    SELECT COUNT(*) FROM nutrition_profiles INTO final_total;
    SELECT COUNT(*) FROM nutrition_profiles WHERE client_id IS NOT NULL INTO final_client_based;
    SELECT COUNT(*) FROM nutrition_profiles WHERE lead_id IS NOT NULL INTO final_lead_based;
    SELECT COUNT(*) FROM nutrition_profiles WHERE client_id IS NULL AND lead_id IS NULL INTO final_orphaned;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== BACKFILL COMPLETE ===';
    RAISE NOTICE 'Final state:';
    RAISE NOTICE 'Total nutrition profiles: %', final_total;
    RAISE NOTICE 'Client-based profiles: % (%.1f%%)', final_client_based, 
        CASE WHEN final_total > 0 THEN (final_client_based::float / final_total * 100) ELSE 0 END;
    RAISE NOTICE 'Lead-based profiles: % (%.1f%%)', final_lead_based,
        CASE WHEN final_total > 0 THEN (final_lead_based::float / final_total * 100) ELSE 0 END;
    RAISE NOTICE 'Orphaned profiles: %', final_orphaned;
    RAISE NOTICE '';
    
    IF final_orphaned = 0 THEN
        RAISE NOTICE '✅ Backfill completed successfully - no orphaned profiles remain';
    ELSE
        RAISE NOTICE '⚠️ % profiles still orphaned - manual intervention required', final_orphaned;
    END IF;
END
$$;

-- Cleanup temporary table
DROP TABLE IF EXISTS orphaned_profile_analysis;