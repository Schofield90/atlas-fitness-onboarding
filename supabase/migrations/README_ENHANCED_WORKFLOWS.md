# Enhanced Workflow System Migrations

This directory contains the complete migration set for implementing the enhanced workflow automation system for Atlas Fitness CRM.

## Migration Files Overview

### Core Migrations (Run in Order)

1. **`20250812_enhanced_workflow_tables.sql`**
   - Creates enhanced workflow tables (templates, steps, triggers, variables)
   - Adds new columns to existing workflows table
   - Backward compatible - preserves existing functionality

2. **`20250812_workflow_analytics_queue.sql`**
   - Creates analytics and execution queue tables
   - Implements performance tracking and monitoring
   - Adds rate limiting and logging capabilities

3. **`20250812_enhanced_workflow_rls.sql`**
   - Implements Row Level Security policies for all new tables
   - Ensures multi-tenant security isolation
   - Grants appropriate permissions to user roles

4. **`20250812_workflow_functions_triggers.sql`**
   - Creates database functions for workflow automation
   - Implements automatic statistics tracking
   - Adds queue management and validation functions

5. **`20250812_workflow_indexes_performance.sql`**
   - Creates performance indexes for all tables
   - Optimizes query performance for dashboard views
   - Includes maintenance functions

6. **`20250812_default_workflow_definitions.sql`**
   - Populates default action and trigger definitions
   - Provides 15+ built-in triggers and 20+ actions
   - Enables immediate workflow creation

7. **`20250812_migrate_existing_workflows.sql`**
   - Safely migrates existing workflow data
   - Creates default workflow templates
   - Includes migration validation

### Support Files

- **`rollback_enhanced_workflows.sql`** - Complete rollback script if needed

## Pre-Migration Checklist

- [ ] **Backup Database**: Create full backup before migration
- [ ] **Test Environment**: Run migrations in staging first
- [ ] **Active Workflows**: Ensure no workflows are currently executing
- [ ] **Dependencies**: Verify all required tables exist
- [ ] **Permissions**: Ensure migration user has sufficient privileges

## Migration Execution

### Automatic (Recommended)
```bash
# Run all migrations in sequence
supabase db push

# Or using Supabase CLI
supabase migration up
```

### Manual Execution
```sql
-- Run each file in order:
\i 20250812_enhanced_workflow_tables.sql
\i 20250812_workflow_analytics_queue.sql  
\i 20250812_enhanced_workflow_rls.sql
\i 20250812_workflow_functions_triggers.sql
\i 20250812_workflow_indexes_performance.sql
\i 20250812_default_workflow_definitions.sql
\i 20250812_migrate_existing_workflows.sql
```

## Post-Migration Validation

### 1. Verify Tables Created
```sql
-- Check new tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name LIKE 'workflow_%' 
ORDER BY table_name;
```

### 2. Validate Data Migration
```sql
-- Run built-in validation
SELECT * FROM validate_workflow_migration();
```

### 3. Test Permissions
```sql
-- Verify RLS policies are active
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename LIKE 'workflow_%';
```

### 4. Check Indexes
```sql
-- Verify indexes created
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename LIKE 'workflow_%'
ORDER BY tablename, indexname;
```

## New Features Enabled

### For Users
- **Workflow Templates** - Pre-built workflows for common tasks
- **Enhanced Analytics** - Detailed performance metrics and insights
- **Advanced Triggers** - Time-based, webhook, and conditional triggers
- **Variable System** - Global and workflow-specific variables
- **Better UI** - Enhanced workflow builder with more node types

### For Developers  
- **Extensible Actions** - Easy to add custom action types
- **Queue System** - Reliable async workflow execution
- **Rate Limiting** - Prevent workflow abuse
- **Detailed Logging** - Comprehensive execution logs
- **Performance Monitoring** - Built-in metrics collection

### For System Admins
- **Multi-tenant Security** - Complete organization isolation
- **Performance Optimization** - Advanced indexing strategy
- **Monitoring Tools** - Built-in health checks and maintenance
- **Rollback Capability** - Safe migration rollback if needed

## Troubleshooting

### Common Issues

**Migration Fails on Existing Data**
```sql
-- Check for existing workflows with issues
SELECT id, name, status FROM workflows 
WHERE workflow_data IS NULL OR workflow_data = '{}';
```

**Permission Errors**
```sql
-- Verify user has necessary permissions
SELECT has_table_privilege('workflow_templates', 'SELECT');
```

**Index Creation Timeouts**
```sql
-- Create indexes individually with CONCURRENTLY
CREATE INDEX CONCURRENTLY idx_workflows_organization_status 
ON workflows(organization_id, status);
```

### Performance Issues

**Slow Queries After Migration**
```sql
-- Update table statistics
ANALYZE workflows;
ANALYZE workflow_executions;
ANALYZE workflow_analytics;
```

**Large Dataset Migrations**
```sql
-- Monitor migration progress
SELECT COUNT(*) as migrated_workflows 
FROM workflows WHERE version >= 2;
```

## Rollback Procedure

**If migration needs to be reversed:**

```sql
-- Full system rollback (DESTRUCTIVE - backup first!)
SELECT * FROM rollback_enhanced_workflow_system();
```

**Verify rollback:**
```sql
-- Check workflows table is restored
\d workflows;

-- Verify enhanced tables are removed
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_name LIKE 'workflow_%' AND table_name != 'workflows';
```

## Maintenance

### Regular Tasks

**Weekly**
```sql
-- Clean up old analytics data
SELECT maintain_workflow_statistics();
```

**Monthly**  
```sql
-- Update performance metrics
ANALYZE workflows;
ANALYZE workflow_executions;
ANALYZE workflow_analytics;
```

### Monitoring Queries

**System Health**
```sql
-- Check workflow execution success rate
SELECT 
  w.name,
  w.total_executions,
  w.successful_executions,
  w.error_rate
FROM workflows w 
WHERE w.total_executions > 0
ORDER BY w.error_rate DESC
LIMIT 10;
```

**Performance Metrics**
```sql
-- Average execution times by workflow
SELECT 
  w.name,
  w.avg_execution_time_ms,
  w.performance_score
FROM workflows w
WHERE w.total_executions >= 10
ORDER BY w.avg_execution_time_ms DESC
LIMIT 10;
```

## Support

If you encounter issues:

1. **Check Logs**: Review migration output for specific errors
2. **Validate State**: Use validation functions to check data integrity  
3. **Test Staging**: Replicate issue in staging environment
4. **Rollback**: Use rollback script if necessary to restore functionality
5. **Contact**: Reach out with specific error messages and context

## Migration Success Metrics

✅ **Complete Success Indicators:**
- All 7 migration files executed without errors
- Validation function returns all "PASS" status
- Existing workflows continue to execute normally
- New workflow features are accessible in UI
- No performance degradation in workflow execution

⚠️ **Partial Success Indicators:**
- Some migrations succeeded but others failed
- Validation shows "WARN" status for some checks
- Enhanced features not fully available
- Some existing workflows may need attention

❌ **Migration Failure Indicators:**
- Multiple migration files failed
- Existing workflow execution is broken
- Database integrity issues
- Rollback may be required