-- ========================================
-- ENHANCED WORKFLOW SYSTEM - INDEXES & PERFORMANCE
-- Migration: 20250812_workflow_indexes_performance.sql
-- ========================================

-- ========================================
-- WORKFLOW TABLE INDEXES
-- ========================================

-- Enhanced indexes on existing workflows table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_organization_status 
  ON workflows(organization_id, status) 
  WHERE status IN ('active', 'draft');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_category 
  ON workflows(category) 
  WHERE category IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_template_id 
  ON workflows(template_id) 
  WHERE template_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_tags 
  ON workflows USING GIN(tags) 
  WHERE tags IS NOT NULL AND array_length(tags, 1) > 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_is_template 
  ON workflows(is_template, organization_id) 
  WHERE is_template = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_performance_score 
  ON workflows(performance_score DESC, organization_id) 
  WHERE performance_score > 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_usage_count 
  ON workflows(usage_count DESC, organization_id) 
  WHERE usage_count > 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_last_run_at 
  ON workflows(last_run_at DESC NULLS LAST, organization_id);

-- ========================================
-- WORKFLOW TEMPLATE INDEXES
-- ========================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_templates_organization_category 
  ON workflow_templates(organization_id, category);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_templates_public_featured 
  ON workflow_templates(is_public, is_featured, rating DESC) 
  WHERE is_public = true AND is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_templates_usage_count 
  ON workflow_templates(usage_count DESC, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_templates_tags 
  ON workflow_templates USING GIN(tags) 
  WHERE tags IS NOT NULL AND array_length(tags, 1) > 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_templates_rating 
  ON workflow_templates(rating DESC, usage_count DESC) 
  WHERE rating > 0;

-- ========================================
-- EXECUTION RELATED INDEXES
-- ========================================

-- Workflow executions indexes (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'workflow_executions') THEN
        -- Check if indexes don't already exist before creating
        IF NOT EXISTS (SELECT FROM pg_indexes WHERE tablename = 'workflow_executions' AND indexname = 'idx_workflow_executions_workflow_status_time') THEN
            CREATE INDEX CONCURRENTLY idx_workflow_executions_workflow_status_time 
              ON workflow_executions(workflow_id, status, started_at DESC);
        END IF;
        
        IF NOT EXISTS (SELECT FROM pg_indexes WHERE tablename = 'workflow_executions' AND indexname = 'idx_workflow_executions_organization_status') THEN
            CREATE INDEX CONCURRENTLY idx_workflow_executions_organization_status 
              ON workflow_executions(organization_id, status, started_at DESC);
        END IF;
        
        IF NOT EXISTS (SELECT FROM pg_indexes WHERE tablename = 'workflow_executions' AND indexname = 'idx_workflow_executions_started_at') THEN
            CREATE INDEX CONCURRENTLY idx_workflow_executions_started_at 
              ON workflow_executions(started_at DESC);
        END IF;
        
        IF NOT EXISTS (SELECT FROM pg_indexes WHERE tablename = 'workflow_executions' AND indexname = 'idx_workflow_executions_completed_at') THEN
            CREATE INDEX CONCURRENTLY idx_workflow_executions_completed_at 
              ON workflow_executions(completed_at DESC NULLS LAST);
        END IF;
    END IF;
END $$;

-- Execution steps indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_execution_steps_execution_node 
  ON workflow_execution_steps(execution_id, node_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_execution_steps_status_time 
  ON workflow_execution_steps(status, started_at DESC NULLS LAST);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_execution_steps_node_type 
  ON workflow_execution_steps(node_type, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_execution_steps_retry_count 
  ON workflow_execution_steps(retry_count, status) 
  WHERE retry_count > 0;

-- ========================================
-- TRIGGER SYSTEM INDEXES
-- ========================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_triggers_organization_active 
  ON workflow_triggers(organization_id, is_active) 
  WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_triggers_workflow_type 
  ON workflow_triggers(workflow_id, trigger_type, is_active);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_triggers_type_schedule 
  ON workflow_triggers(trigger_type, schedule_type, next_run_at) 
  WHERE is_active = true AND next_run_at IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_triggers_webhook_endpoint 
  ON workflow_triggers(webhook_endpoint) 
  WHERE webhook_endpoint IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_triggers_success_rate 
  ON workflow_triggers(
    CASE WHEN trigger_count > 0 
    THEN success_count::decimal / trigger_count 
    ELSE 0 END DESC,
    trigger_count DESC
  ) WHERE trigger_count > 0;

-- ========================================
-- VARIABLE SYSTEM INDEXES
-- ========================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_variables_organization_scope 
  ON workflow_variables(organization_id, scope);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_variables_workflow_name 
  ON workflow_variables(workflow_id, name) 
  WHERE workflow_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_variables_data_type 
  ON workflow_variables(data_type, scope);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_variables_is_secret 
  ON workflow_variables(organization_id, is_secret) 
  WHERE is_secret = true;

-- ========================================
-- ANALYTICS INDEXES
-- ========================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_analytics_workflow_date_hour 
  ON workflow_analytics(workflow_id, date DESC, hour DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_analytics_organization_date 
  ON workflow_analytics(organization_id, date DESC, hour DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_analytics_performance 
  ON workflow_analytics(date DESC, avg_execution_time_ms ASC, successful_count DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_analytics_error_rate 
  ON workflow_analytics(
    CASE WHEN executions_count > 0 
    THEN failed_count::decimal / executions_count 
    ELSE 0 END DESC,
    date DESC
  ) WHERE executions_count > 0;

-- ========================================
-- EXECUTION QUEUE INDEXES
-- ========================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_execution_queue_status_priority 
  ON workflow_execution_queue(status, priority DESC, created_at ASC) 
  WHERE status IN ('queued', 'processing');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_execution_queue_scheduled_ready 
  ON workflow_execution_queue(scheduled_at, status) 
  WHERE status = 'queued' AND scheduled_at <= NOW();

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_execution_queue_retry_ready 
  ON workflow_execution_queue(next_retry_at, status, retry_count) 
  WHERE status = 'queued' AND next_retry_at IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_execution_queue_worker_lock 
  ON workflow_execution_queue(worker_id, lock_expires_at) 
  WHERE worker_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_execution_queue_organization_status 
  ON workflow_execution_queue(organization_id, status, priority DESC);

-- ========================================
-- LOGGING INDEXES
-- ========================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_execution_logs_execution_time 
  ON workflow_execution_logs(execution_id, logged_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_execution_logs_organization_level 
  ON workflow_execution_logs(organization_id, log_level, logged_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_execution_logs_node_step 
  ON workflow_execution_logs(node_id, step_id, logged_at DESC) 
  WHERE node_id IS NOT NULL OR step_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_execution_logs_error_level 
  ON workflow_execution_logs(log_level, logged_at DESC) 
  WHERE log_level = 'error';

-- ========================================
-- WEBHOOK INDEXES
-- ========================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_webhooks_endpoint_active 
  ON workflow_webhooks(endpoint_id, is_active) 
  WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_webhooks_organization_workflow 
  ON workflow_webhooks(organization_id, workflow_id, is_active);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_webhooks_success_rate 
  ON workflow_webhooks(
    CASE WHEN total_requests > 0 
    THEN successful_requests::decimal / total_requests 
    ELSE 0 END DESC,
    total_requests DESC
  ) WHERE total_requests > 0;

-- ========================================
-- PERFORMANCE METRICS INDEXES
-- ========================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_performance_metrics_workflow_period 
  ON workflow_performance_metrics(workflow_id, metric_type, period_start DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_performance_metrics_organization_period 
  ON workflow_performance_metrics(organization_id, metric_type, period_start DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_performance_metrics_scores 
  ON workflow_performance_metrics(
    performance_score DESC, 
    reliability_score DESC, 
    efficiency_score DESC,
    period_start DESC
  );

-- ========================================
-- RATE LIMITS INDEXES
-- ========================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_rate_limits_organization_active 
  ON workflow_rate_limits(organization_id, is_active) 
  WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_rate_limits_workflow_type 
  ON workflow_rate_limits(workflow_id, limit_type, is_active) 
  WHERE workflow_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_rate_limits_window 
  ON workflow_rate_limits(window_start, window_end) 
  WHERE is_active = true;

-- ========================================
-- CONDITIONS INDEXES
-- ========================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_conditions_organization_shared 
  ON workflow_conditions(organization_id, is_shared, category);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_conditions_type_operator 
  ON workflow_conditions(condition_type, operator);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_conditions_usage 
  ON workflow_conditions(usage_count DESC, is_shared DESC) 
  WHERE usage_count > 0;

-- ========================================
-- ACTION/TRIGGER DEFINITION INDEXES
-- ========================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_action_definitions_type_active 
  ON workflow_action_definitions(action_type, is_active) 
  WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_action_definitions_category 
  ON workflow_action_definitions(category, is_active) 
  WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_action_definitions_premium 
  ON workflow_action_definitions(is_premium, category) 
  WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_trigger_definitions_type_active 
  ON workflow_trigger_definitions(trigger_type, is_active) 
  WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_trigger_definitions_features 
  ON workflow_trigger_definitions(supports_scheduling, supports_webhook, is_active) 
  WHERE is_active = true;

-- ========================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- ========================================

-- Dashboard queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_dashboard 
  ON workflows(organization_id, status, last_run_at DESC NULLS LAST, usage_count DESC);

-- Template marketplace
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_templates_marketplace 
  ON workflow_templates(is_public, is_featured, category, rating DESC, usage_count DESC) 
  WHERE is_public = true;

-- Analytics dashboard
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_analytics_dashboard 
  ON workflow_analytics(organization_id, date DESC, successful_count DESC, avg_execution_time_ms ASC);

-- Queue processing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_queue_processing 
  ON workflow_execution_queue(
    status, 
    COALESCE(scheduled_at, created_at), 
    priority DESC,
    organization_id
  ) WHERE status = 'queued';

-- ========================================
-- PARTIAL INDEXES FOR SPECIFIC CONDITIONS
-- ========================================

-- Active workflows only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_active_only 
  ON workflows(organization_id, category, updated_at DESC) 
  WHERE status = 'active';

-- Failed executions for error analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_executions_failed 
  ON workflow_executions(workflow_id, started_at DESC, error) 
  WHERE status = 'failed' AND error IS NOT NULL;

-- Public templates with high ratings
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_templates_high_rated 
  ON workflow_templates(category, rating DESC, usage_count DESC) 
  WHERE is_public = true AND rating >= 4.0;

-- Recent execution logs for debugging
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_execution_logs_recent 
  ON workflow_execution_logs(execution_id, log_level, logged_at DESC) 
  WHERE logged_at >= NOW() - INTERVAL '7 days';

-- ========================================
-- STATISTICS AND MAINTENANCE
-- ========================================

-- Update table statistics for query planner
DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOR table_name IN 
        SELECT t.table_name 
        FROM information_schema.tables t
        WHERE t.table_schema = 'public' 
        AND t.table_name LIKE 'workflow%'
        AND t.table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('ANALYZE %I', table_name);
    END LOOP;
END $$;

-- Create function to maintain workflow statistics
CREATE OR REPLACE FUNCTION maintain_workflow_statistics()
RETURNS void AS $$
BEGIN
    -- Update workflow performance scores based on recent execution data
    UPDATE workflows 
    SET performance_score = (
        SELECT CASE 
            WHEN total_executions >= 10 THEN 
                LEAST(100, GREATEST(0, 
                    100 - (failed_executions * 100.0 / total_executions) - 
                    CASE WHEN avg_execution_time_ms > 30000 THEN 20 ELSE 0 END
                ))
            ELSE 0 
        END
    )
    WHERE total_executions > 0;
    
    -- Clean up old analytics data (keep 13 months)
    DELETE FROM workflow_analytics 
    WHERE date < CURRENT_DATE - INTERVAL '13 months';
    
    -- Clean up old execution logs (keep 30 days)  
    DELETE FROM workflow_execution_logs 
    WHERE logged_at < NOW() - INTERVAL '30 days';
    
    -- Clean up completed/failed queue items (keep 7 days)
    DELETE FROM workflow_execution_queue 
    WHERE status IN ('completed', 'failed', 'cancelled')
    AND completed_at < NOW() - INTERVAL '7 days';
    
    -- Update table statistics
    ANALYZE workflows;
    ANALYZE workflow_executions;
    ANALYZE workflow_analytics;
END;
$$ LANGUAGE plpgsql;