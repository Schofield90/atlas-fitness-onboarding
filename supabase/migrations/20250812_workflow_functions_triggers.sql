-- ========================================
-- ENHANCED WORKFLOW SYSTEM - FUNCTIONS & TRIGGERS
-- Migration: 20250812_workflow_functions_triggers.sql
-- ========================================

-- Function to update workflow statistics
CREATE OR REPLACE FUNCTION update_workflow_statistics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update workflow stats when execution completes
  IF NEW.status IN ('completed', 'failed') AND OLD.status != NEW.status THEN
    UPDATE workflows
    SET 
      total_executions = total_executions + 1,
      successful_executions = CASE 
        WHEN NEW.status = 'completed' THEN successful_executions + 1 
        ELSE successful_executions 
      END,
      failed_executions = CASE 
        WHEN NEW.status = 'failed' THEN failed_executions + 1 
        ELSE failed_executions 
      END,
      last_run_at = COALESCE(NEW.completed_at, NOW()),
      avg_execution_time_ms = CASE 
        WHEN NEW.completed_at IS NOT NULL AND NEW.started_at IS NOT NULL 
        THEN (
          COALESCE(avg_execution_time_ms * (total_executions - 1), 0) + 
          EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) * 1000
        ) / GREATEST(total_executions, 1)
        ELSE avg_execution_time_ms 
      END,
      error_rate = CASE 
        WHEN total_executions > 0 
        THEN ROUND(failed_executions::DECIMAL / GREATEST(total_executions, 1), 4)
        ELSE 0 
      END,
      performance_score = CASE 
        WHEN total_executions >= 10 THEN 
          GREATEST(0, LEAST(100, 100 - (failed_executions * 100 / GREATEST(total_executions, 1))))
        ELSE 0 
      END,
      updated_at = NOW()
    WHERE id = NEW.workflow_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply statistics trigger (check if workflow_executions table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'workflow_executions') THEN
        DROP TRIGGER IF EXISTS update_workflow_statistics_trigger ON workflow_executions;
        CREATE TRIGGER update_workflow_statistics_trigger
          AFTER UPDATE ON workflow_executions
          FOR EACH ROW
          EXECUTE FUNCTION update_workflow_statistics();
    END IF;
END $$;

-- Function to generate analytics data
CREATE OR REPLACE FUNCTION generate_workflow_analytics()
RETURNS TRIGGER AS $$
DECLARE
  analytics_date DATE;
  analytics_hour INTEGER;
  execution_time INTEGER;
  org_id UUID;
BEGIN
  -- Only process completed or failed executions
  IF NEW.status NOT IN ('completed', 'failed') THEN
    RETURN NEW;
  END IF;
  
  -- Get organization_id
  SELECT organization_id INTO org_id 
  FROM workflows 
  WHERE id = NEW.workflow_id;
  
  -- Extract date and hour
  analytics_date := DATE(COALESCE(NEW.completed_at, NOW()));
  analytics_hour := EXTRACT(HOUR FROM COALESCE(NEW.completed_at, NOW()));
  
  -- Calculate execution time
  execution_time := CASE 
    WHEN NEW.completed_at IS NOT NULL AND NEW.started_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) * 1000
    ELSE 0 
  END;
  
  -- Insert or update analytics record
  INSERT INTO workflow_analytics (
    organization_id, workflow_id, date, hour,
    executions_count, successful_count, failed_count,
    total_execution_time_ms, avg_execution_time_ms,
    min_execution_time_ms, max_execution_time_ms,
    total_nodes_executed, total_actions_performed
  ) VALUES (
    org_id, NEW.workflow_id, analytics_date, analytics_hour,
    1, 
    CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
    CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END,
    execution_time, execution_time, execution_time, execution_time,
    1, 1 -- Default values, can be enhanced later
  )
  ON CONFLICT (workflow_id, date, hour) DO UPDATE SET
    executions_count = workflow_analytics.executions_count + 1,
    successful_count = workflow_analytics.successful_count + 
      CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
    failed_count = workflow_analytics.failed_count + 
      CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END,
    total_execution_time_ms = workflow_analytics.total_execution_time_ms + execution_time,
    avg_execution_time_ms = CASE
      WHEN workflow_analytics.executions_count + 1 > 0 
      THEN (workflow_analytics.total_execution_time_ms + execution_time) / (workflow_analytics.executions_count + 1)
      ELSE 0
    END,
    min_execution_time_ms = LEAST(workflow_analytics.min_execution_time_ms, execution_time),
    max_execution_time_ms = GREATEST(workflow_analytics.max_execution_time_ms, execution_time),
    total_nodes_executed = workflow_analytics.total_nodes_executed + 1,
    total_actions_performed = workflow_analytics.total_actions_performed + 1,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply analytics trigger
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'workflow_executions') THEN
        DROP TRIGGER IF EXISTS generate_workflow_analytics_trigger ON workflow_executions;
        CREATE TRIGGER generate_workflow_analytics_trigger
          AFTER UPDATE ON workflow_executions
          FOR EACH ROW
          EXECUTE FUNCTION generate_workflow_analytics();
    END IF;
END $$;

-- Function to update template usage count
CREATE OR REPLACE FUNCTION update_template_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment usage count when workflow is created from template
  IF NEW.template_id IS NOT NULL THEN
    UPDATE workflow_templates
    SET 
      usage_count = usage_count + 1,
      updated_at = NOW()
    WHERE id = NEW.template_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply template usage trigger
DROP TRIGGER IF EXISTS update_template_usage_trigger ON workflows;
CREATE TRIGGER update_template_usage_trigger
  AFTER INSERT ON workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_template_usage();

-- Function to manage execution queue locks
CREATE OR REPLACE FUNCTION acquire_queue_lock(
  p_queue_id UUID,
  p_worker_id TEXT,
  p_lock_duration_minutes INTEGER DEFAULT 30
)
RETURNS BOOLEAN AS $$
DECLARE
  lock_acquired BOOLEAN := FALSE;
BEGIN
  UPDATE workflow_execution_queue
  SET 
    status = 'processing',
    worker_id = p_worker_id,
    locked_at = NOW(),
    lock_expires_at = NOW() + (p_lock_duration_minutes || ' minutes')::INTERVAL,
    started_at = NOW(),
    updated_at = NOW()
  WHERE 
    id = p_queue_id 
    AND status = 'queued'
    AND (lock_expires_at IS NULL OR lock_expires_at < NOW());
    
  GET DIAGNOSTICS lock_acquired = FOUND;
  RETURN lock_acquired;
END;
$$ LANGUAGE plpgsql;

-- Function to release queue locks
CREATE OR REPLACE FUNCTION release_queue_lock(
  p_queue_id UUID,
  p_status TEXT,
  p_error_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE workflow_execution_queue
  SET 
    status = p_status,
    worker_id = NULL,
    locked_at = NULL,
    lock_expires_at = NULL,
    completed_at = CASE WHEN p_status IN ('completed', 'failed', 'cancelled') THEN NOW() ELSE completed_at END,
    error_message = p_error_message,
    updated_at = NOW()
  WHERE id = p_queue_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to clean expired queue locks
CREATE OR REPLACE FUNCTION cleanup_expired_queue_locks()
RETURNS INTEGER AS $$
DECLARE
  cleaned_count INTEGER := 0;
BEGIN
  UPDATE workflow_execution_queue
  SET 
    status = 'queued',
    worker_id = NULL,
    locked_at = NULL,
    lock_expires_at = NULL,
    retry_count = retry_count + 1,
    next_retry_at = CASE 
      WHEN retry_count < max_retries 
      THEN NOW() + ('5 minutes'::INTERVAL * POWER(2, retry_count))
      ELSE NULL 
    END,
    updated_at = NOW()
  WHERE 
    status = 'processing' 
    AND lock_expires_at IS NOT NULL 
    AND lock_expires_at < NOW()
    AND retry_count < max_retries;
    
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  
  -- Mark permanently failed items
  UPDATE workflow_execution_queue
  SET 
    status = 'failed',
    worker_id = NULL,
    locked_at = NULL,
    lock_expires_at = NULL,
    completed_at = NOW(),
    error_message = 'Maximum retries exceeded',
    updated_at = NOW()
  WHERE 
    status = 'processing' 
    AND lock_expires_at IS NOT NULL 
    AND lock_expires_at < NOW()
    AND retry_count >= max_retries;
    
  RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get next queued workflow
CREATE OR REPLACE FUNCTION get_next_queued_workflow(
  p_worker_id TEXT,
  p_organization_id UUID DEFAULT NULL
)
RETURNS TABLE (
  queue_id UUID,
  workflow_id UUID,
  organization_id UUID,
  trigger_data JSONB,
  context_data JSONB,
  input_variables JSONB,
  priority INTEGER
) AS $$
DECLARE
  selected_queue_id UUID;
BEGIN
  -- Select highest priority queued item
  SELECT id INTO selected_queue_id
  FROM workflow_execution_queue
  WHERE 
    status = 'queued'
    AND (p_organization_id IS NULL OR workflow_execution_queue.organization_id = p_organization_id)
    AND (scheduled_at IS NULL OR scheduled_at <= NOW())
    AND (next_retry_at IS NULL OR next_retry_at <= NOW())
  ORDER BY 
    priority DESC,
    created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  
  -- If found, try to acquire lock
  IF selected_queue_id IS NOT NULL THEN
    IF acquire_queue_lock(selected_queue_id, p_worker_id) THEN
      RETURN QUERY
      SELECT 
        weq.id,
        weq.workflow_id,
        weq.organization_id,
        weq.trigger_data,
        weq.context_data,
        weq.input_variables,
        weq.priority
      FROM workflow_execution_queue weq
      WHERE weq.id = selected_queue_id;
    END IF;
  END IF;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function to log workflow execution events
CREATE OR REPLACE FUNCTION log_workflow_execution(
  p_execution_id UUID,
  p_organization_id UUID,
  p_log_level TEXT,
  p_message TEXT,
  p_details JSONB DEFAULT '{}',
  p_node_id TEXT DEFAULT NULL,
  p_step_id UUID DEFAULT NULL,
  p_action_type TEXT DEFAULT NULL,
  p_execution_time_ms INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO workflow_execution_logs (
    execution_id,
    organization_id,
    log_level,
    message,
    details,
    node_id,
    step_id,
    action_type,
    execution_time_ms,
    logged_at
  ) VALUES (
    p_execution_id,
    p_organization_id,
    p_log_level,
    p_message,
    p_details,
    p_node_id,
    p_step_id,
    p_action_type,
    p_execution_time_ms,
    NOW()
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check rate limits
CREATE OR REPLACE FUNCTION check_workflow_rate_limit(
  p_organization_id UUID,
  p_workflow_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  limit_exceeded BOOLEAN := FALSE;
  current_window TIMESTAMPTZ;
  window_duration INTERVAL;
  limit_record RECORD;
BEGIN
  -- Check each applicable rate limit
  FOR limit_record IN 
    SELECT * FROM workflow_rate_limits 
    WHERE 
      organization_id = p_organization_id
      AND (workflow_id IS NULL OR workflow_id = p_workflow_id)
      AND is_active = TRUE
  LOOP
    -- Determine window duration
    window_duration := CASE limit_record.limit_type
      WHEN 'executions_per_minute' THEN '1 minute'::INTERVAL
      WHEN 'executions_per_hour' THEN '1 hour'::INTERVAL  
      WHEN 'executions_per_day' THEN '1 day'::INTERVAL
    END;
    
    current_window := date_trunc(
      CASE limit_record.limit_type
        WHEN 'executions_per_minute' THEN 'minute'
        WHEN 'executions_per_hour' THEN 'hour'
        WHEN 'executions_per_day' THEN 'day'
      END,
      NOW()
    );
    
    -- Reset window if needed
    IF limit_record.window_start < current_window THEN
      UPDATE workflow_rate_limits
      SET 
        current_count = 0,
        window_start = current_window,
        window_end = current_window + window_duration,
        reset_at = current_window + window_duration,
        updated_at = NOW()
      WHERE id = limit_record.id;
      
      limit_record.current_count := 0;
    END IF;
    
    -- Check if limit would be exceeded
    IF limit_record.current_count >= limit_record.limit_value THEN
      limit_exceeded := TRUE;
      
      UPDATE workflow_rate_limits
      SET 
        exceeded_at = NOW(),
        updated_at = NOW()
      WHERE id = limit_record.id;
      
      EXIT; -- Exit loop on first exceeded limit
    END IF;
  END LOOP;
  
  -- If not exceeded, increment counters
  IF NOT limit_exceeded THEN
    UPDATE workflow_rate_limits
    SET 
      current_count = current_count + 1,
      updated_at = NOW()
    WHERE 
      organization_id = p_organization_id
      AND (workflow_id IS NULL OR workflow_id = p_workflow_id)
      AND is_active = TRUE
      AND window_start = current_window;
  END IF;
  
  RETURN NOT limit_exceeded;
END;
$$ LANGUAGE plpgsql;

-- Function to validate workflow data
CREATE OR REPLACE FUNCTION validate_workflow_data(
  p_workflow_data JSONB
)
RETURNS TABLE (
  is_valid BOOLEAN,
  errors TEXT[]
) AS $$
DECLARE
  validation_errors TEXT[] := '{}';
  node_record JSONB;
  edge_record JSONB;
  node_ids TEXT[] := '{}';
  referenced_ids TEXT[] := '{}';
BEGIN
  -- Check required top-level keys
  IF NOT p_workflow_data ? 'nodes' THEN
    validation_errors := array_append(validation_errors, 'Missing required key: nodes');
  END IF;
  
  IF NOT p_workflow_data ? 'edges' THEN
    validation_errors := array_append(validation_errors, 'Missing required key: edges');
  END IF;
  
  -- Validate nodes
  FOR node_record IN SELECT * FROM jsonb_array_elements(p_workflow_data->'nodes')
  LOOP
    -- Check required node fields
    IF NOT node_record ? 'id' THEN
      validation_errors := array_append(validation_errors, 'Node missing required field: id');
    ELSE
      node_ids := array_append(node_ids, node_record->>'id');
    END IF;
    
    IF NOT node_record ? 'type' THEN
      validation_errors := array_append(validation_errors, 'Node missing required field: type');
    END IF;
    
    IF NOT node_record ? 'data' THEN
      validation_errors := array_append(validation_errors, 'Node missing required field: data');
    END IF;
  END LOOP;
  
  -- Validate edges
  FOR edge_record IN SELECT * FROM jsonb_array_elements(p_workflow_data->'edges')
  LOOP
    -- Check required edge fields
    IF NOT edge_record ? 'source' THEN
      validation_errors := array_append(validation_errors, 'Edge missing required field: source');
    ELSE
      referenced_ids := array_append(referenced_ids, edge_record->>'source');
    END IF;
    
    IF NOT edge_record ? 'target' THEN
      validation_errors := array_append(validation_errors, 'Edge missing required field: target');
    ELSE
      referenced_ids := array_append(referenced_ids, edge_record->>'target');
    END IF;
  END LOOP;
  
  -- Check that all referenced node IDs exist
  IF array_length(referenced_ids, 1) > 0 THEN
    SELECT array_agg(ref_id) INTO validation_errors 
    FROM unnest(referenced_ids) AS ref_id
    WHERE ref_id != ALL(node_ids);
    
    IF validation_errors IS NOT NULL THEN
      validation_errors := array_append(validation_errors, 'Edge references non-existent node ID(s)');
    END IF;
  END IF;
  
  RETURN QUERY SELECT 
    array_length(validation_errors, 1) IS NULL OR array_length(validation_errors, 1) = 0,
    COALESCE(validation_errors, '{}');
END;
$$ LANGUAGE plpgsql;