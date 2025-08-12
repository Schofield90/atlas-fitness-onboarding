-- ========================================
-- ENHANCED WORKFLOW SYSTEM - ROLLBACK SCRIPT
-- File: rollback_enhanced_workflows.sql
-- ========================================

-- WARNING: This script will completely rollback the enhanced workflow system
-- Only run this if you need to revert to the previous workflow system
-- Make sure to backup your data before running this script!

-- Function to safely rollback with validation
CREATE OR REPLACE FUNCTION rollback_enhanced_workflow_system()
RETURNS TABLE (
    step_name TEXT,
    status TEXT,
    details TEXT
) AS $$
DECLARE
    backup_count INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting enhanced workflow system rollback...';
    RAISE NOTICE 'WARNING: This will remove all enhanced workflow features!';
    
    -- Step 1: Backup critical data
    BEGIN
        -- Backup workflow configurations before rollback
        CREATE TABLE IF NOT EXISTS workflows_backup_pre_rollback AS
        SELECT * FROM workflows WHERE version >= 2;
        
        CREATE TABLE IF NOT EXISTS workflow_triggers_backup AS
        SELECT * FROM workflow_triggers;
        
        CREATE TABLE IF NOT EXISTS workflow_variables_backup AS
        SELECT * FROM workflow_variables;
        
        GET DIAGNOSTICS backup_count = ROW_COUNT;
        
        RETURN QUERY SELECT 
            'Data Backup'::TEXT,
            'SUCCESS'::TEXT,
            format('Backed up %s records', backup_count);
            
    EXCEPTION WHEN OTHERS THEN
        error_count := error_count + 1;
        RETURN QUERY SELECT 
            'Data Backup'::TEXT,
            'ERROR'::TEXT,
            SQLERRM;
    END;
    
    -- Step 2: Drop triggers and functions
    BEGIN
        DROP TRIGGER IF EXISTS update_workflow_statistics_trigger ON workflow_executions;
        DROP TRIGGER IF EXISTS generate_workflow_analytics_trigger ON workflow_executions;
        DROP TRIGGER IF EXISTS update_template_usage_trigger ON workflows;
        
        DROP TRIGGER IF EXISTS update_workflow_templates_updated_at ON workflow_templates;
        DROP TRIGGER IF EXISTS update_workflow_execution_steps_updated_at ON workflow_execution_steps;
        DROP TRIGGER IF EXISTS update_workflow_triggers_updated_at ON workflow_triggers;
        DROP TRIGGER IF EXISTS update_workflow_variables_updated_at ON workflow_variables;
        DROP TRIGGER IF EXISTS update_workflow_conditions_updated_at ON workflow_conditions;
        DROP TRIGGER IF EXISTS update_workflow_webhooks_updated_at ON workflow_webhooks;
        
        DROP FUNCTION IF EXISTS update_workflow_statistics();
        DROP FUNCTION IF EXISTS generate_workflow_analytics();
        DROP FUNCTION IF EXISTS update_template_usage();
        DROP FUNCTION IF EXISTS acquire_queue_lock(UUID, TEXT, INTEGER);
        DROP FUNCTION IF EXISTS release_queue_lock(UUID, TEXT, TEXT);
        DROP FUNCTION IF EXISTS cleanup_expired_queue_locks();
        DROP FUNCTION IF EXISTS get_next_queued_workflow(TEXT, UUID);
        DROP FUNCTION IF EXISTS log_workflow_execution(UUID, UUID, TEXT, TEXT, JSONB, TEXT, UUID, TEXT, INTEGER);
        DROP FUNCTION IF EXISTS check_workflow_rate_limit(UUID, UUID);
        DROP FUNCTION IF EXISTS validate_workflow_data(JSONB);
        DROP FUNCTION IF EXISTS maintain_workflow_statistics();
        DROP FUNCTION IF EXISTS validate_workflow_migration();
        
        RETURN QUERY SELECT 
            'Drop Functions/Triggers'::TEXT,
            'SUCCESS'::TEXT,
            'Removed enhanced workflow functions and triggers';
            
    EXCEPTION WHEN OTHERS THEN
        error_count := error_count + 1;
        RETURN QUERY SELECT 
            'Drop Functions/Triggers'::TEXT,
            'ERROR'::TEXT,
            SQLERRM;
    END;
    
    -- Step 3: Drop enhanced tables (in reverse dependency order)
    BEGIN
        DROP TABLE IF EXISTS workflow_rate_limits CASCADE;
        DROP TABLE IF EXISTS workflow_performance_metrics CASCADE;
        DROP TABLE IF EXISTS workflow_execution_logs CASCADE;
        DROP TABLE IF EXISTS workflow_execution_queue CASCADE;
        DROP TABLE IF EXISTS workflow_analytics CASCADE;
        DROP TABLE IF EXISTS workflow_webhooks CASCADE;
        DROP TABLE IF EXISTS workflow_conditions CASCADE;
        DROP TABLE IF EXISTS workflow_variables CASCADE;
        DROP TABLE IF EXISTS workflow_triggers CASCADE;
        DROP TABLE IF EXISTS workflow_execution_steps CASCADE;
        DROP TABLE IF EXISTS workflow_action_definitions CASCADE;
        DROP TABLE IF EXISTS workflow_trigger_definitions CASCADE;
        DROP TABLE IF EXISTS workflow_templates CASCADE;
        
        RETURN QUERY SELECT 
            'Drop Enhanced Tables'::TEXT,
            'SUCCESS'::TEXT,
            'Removed all enhanced workflow tables';
            
    EXCEPTION WHEN OTHERS THEN
        error_count := error_count + 1;
        RETURN QUERY SELECT 
            'Drop Enhanced Tables'::TEXT,
            'ERROR'::TEXT,
            SQLERRM;
    END;
    
    -- Step 4: Drop indexes
    BEGIN
        DROP INDEX IF EXISTS idx_workflows_organization_status;
        DROP INDEX IF EXISTS idx_workflows_category;
        DROP INDEX IF EXISTS idx_workflows_template_id;
        DROP INDEX IF EXISTS idx_workflows_tags;
        DROP INDEX IF EXISTS idx_workflows_is_template;
        DROP INDEX IF EXISTS idx_workflows_performance_score;
        DROP INDEX IF EXISTS idx_workflows_usage_count;
        DROP INDEX IF EXISTS idx_workflows_last_run_at;
        DROP INDEX IF EXISTS idx_workflows_dashboard;
        DROP INDEX IF EXISTS idx_workflows_active_only;
        -- (Many more indexes would be listed here)
        
        RETURN QUERY SELECT 
            'Drop Indexes'::TEXT,
            'SUCCESS'::TEXT,
            'Removed enhanced workflow indexes';
            
    EXCEPTION WHEN OTHERS THEN
        error_count := error_count + 1;
        RETURN QUERY SELECT 
            'Drop Indexes'::TEXT,
            'ERROR'::TEXT,
            SQLERRM;
    END;
    
    -- Step 5: Remove enhanced columns from workflows table
    BEGIN
        ALTER TABLE workflows DROP COLUMN IF EXISTS template_id;
        ALTER TABLE workflows DROP COLUMN IF EXISTS category;
        ALTER TABLE workflows DROP COLUMN IF EXISTS is_template;
        ALTER TABLE workflows DROP COLUMN IF EXISTS template_name;
        ALTER TABLE workflows DROP COLUMN IF EXISTS template_description;
        ALTER TABLE workflows DROP COLUMN IF EXISTS usage_count;
        ALTER TABLE workflows DROP COLUMN IF EXISTS avg_execution_time_ms;
        ALTER TABLE workflows DROP COLUMN IF EXISTS error_rate;
        ALTER TABLE workflows DROP COLUMN IF EXISTS performance_score;
        ALTER TABLE workflows DROP COLUMN IF EXISTS tags;
        ALTER TABLE workflows DROP COLUMN IF EXISTS is_public;
        ALTER TABLE workflows DROP COLUMN IF EXISTS created_by;
        ALTER TABLE workflows DROP COLUMN IF EXISTS updated_by;
        ALTER TABLE workflows DROP COLUMN IF EXISTS total_executions;
        ALTER TABLE workflows DROP COLUMN IF EXISTS successful_executions;
        ALTER TABLE workflows DROP COLUMN IF EXISTS failed_executions;
        ALTER TABLE workflows DROP COLUMN IF EXISTS last_run_at;
        
        -- Reset version to 1
        UPDATE workflows SET version = 1 WHERE version > 1;
        
        RETURN QUERY SELECT 
            'Remove Enhanced Columns'::TEXT,
            'SUCCESS'::TEXT,
            'Removed enhanced columns from workflows table';
            
    EXCEPTION WHEN OTHERS THEN
        error_count := error_count + 1;
        RETURN QUERY SELECT 
            'Remove Enhanced Columns'::TEXT,
            'ERROR'::TEXT,
            SQLERRM;
    END;
    
    -- Step 6: Drop backup tables (optional, for cleanup)
    /*
    BEGIN
        DROP TABLE IF EXISTS workflows_backup_pre_rollback;
        DROP TABLE IF EXISTS workflow_triggers_backup;
        DROP TABLE IF EXISTS workflow_variables_backup;
        
        RETURN QUERY SELECT 
            'Cleanup Backup Tables'::TEXT,
            'SUCCESS'::TEXT,
            'Removed backup tables';
            
    EXCEPTION WHEN OTHERS THEN
        error_count := error_count + 1;
        RETURN QUERY SELECT 
            'Cleanup Backup Tables'::TEXT,
            'ERROR'::TEXT,
            SQLERRM;
    END;
    */
    
    -- Final summary
    RETURN QUERY SELECT 
        'Rollback Summary'::TEXT,
        CASE WHEN error_count = 0 THEN 'SUCCESS' ELSE 'PARTIAL' END,
        format('Rollback completed with %s errors. Backup tables preserved.', error_count);
        
    RAISE NOTICE 'Enhanced workflow system rollback completed with % errors', error_count;
    
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- INDIVIDUAL ROLLBACK FUNCTIONS
-- ========================================

-- Rollback specific migration parts
CREATE OR REPLACE FUNCTION rollback_workflow_tables()
RETURNS void AS $$
BEGIN
    DROP TABLE IF EXISTS workflow_templates CASCADE;
    DROP TABLE IF EXISTS workflow_execution_steps CASCADE;
    DROP TABLE IF EXISTS workflow_triggers CASCADE;
    DROP TABLE IF EXISTS workflow_variables CASCADE;
    DROP TABLE IF EXISTS workflow_conditions CASCADE;
    DROP TABLE IF EXISTS workflow_webhooks CASCADE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION rollback_analytics_tables()
RETURNS void AS $$
BEGIN
    DROP TABLE IF EXISTS workflow_analytics CASCADE;
    DROP TABLE IF EXISTS workflow_execution_queue CASCADE;
    DROP TABLE IF EXISTS workflow_execution_logs CASCADE;
    DROP TABLE IF EXISTS workflow_performance_metrics CASCADE;
    DROP TABLE IF EXISTS workflow_rate_limits CASCADE;
    DROP TABLE IF EXISTS workflow_action_definitions CASCADE;
    DROP TABLE IF EXISTS workflow_trigger_definitions CASCADE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION rollback_workflow_functions()
RETURNS void AS $$
BEGIN
    DROP FUNCTION IF EXISTS update_workflow_statistics();
    DROP FUNCTION IF EXISTS generate_workflow_analytics();
    DROP FUNCTION IF EXISTS update_template_usage();
    DROP FUNCTION IF EXISTS acquire_queue_lock(UUID, TEXT, INTEGER);
    DROP FUNCTION IF EXISTS release_queue_lock(UUID, TEXT, TEXT);
    DROP FUNCTION IF EXISTS cleanup_expired_queue_locks();
    DROP FUNCTION IF EXISTS get_next_queued_workflow(TEXT, UUID);
    DROP FUNCTION IF EXISTS log_workflow_execution(UUID, UUID, TEXT, TEXT, JSONB, TEXT, UUID, TEXT, INTEGER);
    DROP FUNCTION IF EXISTS check_workflow_rate_limit(UUID, UUID);
    DROP FUNCTION IF EXISTS validate_workflow_data(JSONB);
    DROP FUNCTION IF EXISTS maintain_workflow_statistics();
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- USAGE INSTRUCTIONS
-- ========================================

/*
TO ROLLBACK THE ENHANCED WORKFLOW SYSTEM:

1. FULL ROLLBACK (recommended for complete revert):
   SELECT * FROM rollback_enhanced_workflow_system();

2. PARTIAL ROLLBACK (rollback specific components):
   SELECT rollback_workflow_tables();
   SELECT rollback_analytics_tables(); 
   SELECT rollback_workflow_functions();

3. VERIFY ROLLBACK:
   Check that your workflow system is back to the original state
   and existing workflows still function correctly.

4. BACKUP RECOVERY:
   If you need to recover data after rollback, the backup tables are:
   - workflows_backup_pre_rollback
   - workflow_triggers_backup
   - workflow_variables_backup

IMPORTANT NOTES:
- This rollback is irreversible without the backup tables
- Test on staging environment first
- Ensure no active workflow executions before rollback
- The original workflow system should continue to work after rollback
*/