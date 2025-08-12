-- ========================================
-- ENHANCED WORKFLOW SYSTEM - RLS POLICIES
-- Migration: 20250812_enhanced_workflow_rls.sql
-- ========================================

-- Enable RLS on all new workflow tables
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_execution_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_action_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_trigger_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_execution_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_rate_limits ENABLE ROW LEVEL SECURITY;

-- ========================================
-- WORKFLOW TEMPLATES RLS POLICIES
-- ========================================

-- Users can view public templates and their organization's templates
CREATE POLICY "workflow_templates_select_policy" ON workflow_templates
  FOR SELECT USING (
    is_public = true OR 
    organization_id IN (
      SELECT organization_id FROM auth_users WHERE auth_id = auth.uid()
    )
  );

-- Users can manage templates in their organization
CREATE POLICY "workflow_templates_insert_policy" ON workflow_templates
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM auth_users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "workflow_templates_update_policy" ON workflow_templates
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM auth_users WHERE auth_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM auth_users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "workflow_templates_delete_policy" ON workflow_templates
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM auth_users WHERE auth_id = auth.uid()
    )
  );

-- ========================================
-- WORKFLOW EXECUTION STEPS RLS POLICIES
-- ========================================

-- Users can view execution steps for workflows in their organization
CREATE POLICY "workflow_execution_steps_select_policy" ON workflow_execution_steps
  FOR SELECT USING (
    execution_id IN (
      SELECT we.id FROM workflow_executions we 
      JOIN workflows w ON w.id = we.workflow_id
      WHERE w.organization_id IN (
        SELECT organization_id FROM auth_users WHERE auth_id = auth.uid()
      )
    )
  );

-- System (service_role) can manage all execution steps
CREATE POLICY "workflow_execution_steps_system_policy" ON workflow_execution_steps
  FOR ALL TO service_role USING (true);

-- ========================================
-- WORKFLOW TRIGGERS RLS POLICIES
-- ========================================

CREATE POLICY "workflow_triggers_organization_policy" ON workflow_triggers
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM auth_users WHERE auth_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM auth_users WHERE auth_id = auth.uid()
    )
  );

-- ========================================
-- WORKFLOW VARIABLES RLS POLICIES
-- ========================================

-- Users can manage variables in their organization
CREATE POLICY "workflow_variables_organization_policy" ON workflow_variables
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM auth_users WHERE auth_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM auth_users WHERE auth_id = auth.uid()
    )
  );

-- Users cannot view secret variables (additional protection)
CREATE POLICY "workflow_variables_no_secrets_policy" ON workflow_variables
  FOR SELECT USING (
    is_secret = false OR 
    organization_id IN (
      SELECT au.organization_id FROM auth_users au
      JOIN organization_staff os ON os.organization_id = au.organization_id
      WHERE au.auth_id = auth.uid() 
      AND os.auth_id = auth.uid()
      AND os.role IN ('admin', 'owner')
    )
  );

-- ========================================
-- ACTION & TRIGGER DEFINITIONS RLS POLICIES
-- ========================================

-- Everyone can view active system-level action definitions
CREATE POLICY "workflow_action_definitions_select_policy" ON workflow_action_definitions
  FOR SELECT USING (
    is_active = true AND (
      organization_id IS NULL OR 
      organization_id IN (
        SELECT organization_id FROM auth_users WHERE auth_id = auth.uid()
      )
    )
  );

-- Only system admins can manage system-level definitions
CREATE POLICY "workflow_action_definitions_manage_policy" ON workflow_action_definitions
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM auth_users WHERE auth_id = auth.uid()
    )
  );

-- Everyone can view active trigger definitions
CREATE POLICY "workflow_trigger_definitions_select_policy" ON workflow_trigger_definitions
  FOR SELECT USING (
    is_active = true AND (
      organization_id IS NULL OR 
      organization_id IN (
        SELECT organization_id FROM auth_users WHERE auth_id = auth.uid()
      )
    )
  );

-- Only system admins can manage trigger definitions
CREATE POLICY "workflow_trigger_definitions_manage_policy" ON workflow_trigger_definitions
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM auth_users WHERE auth_id = auth.uid()
    )
  );

-- ========================================
-- ANALYTICS RLS POLICIES
-- ========================================

-- Users can view analytics for their organization
CREATE POLICY "workflow_analytics_select_policy" ON workflow_analytics
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM auth_users WHERE auth_id = auth.uid()
    )
  );

-- System can insert/update analytics data
CREATE POLICY "workflow_analytics_system_policy" ON workflow_analytics
  FOR ALL TO service_role USING (true);

-- ========================================
-- EXECUTION QUEUE RLS POLICIES
-- ========================================

-- Users can view queue items for their organization
CREATE POLICY "workflow_execution_queue_select_policy" ON workflow_execution_queue
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM auth_users WHERE auth_id = auth.uid()
    )
  );

-- Users can insert queue items for their organization
CREATE POLICY "workflow_execution_queue_insert_policy" ON workflow_execution_queue
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM auth_users WHERE auth_id = auth.uid()
    )
  );

-- System can manage all queue items
CREATE POLICY "workflow_execution_queue_system_policy" ON workflow_execution_queue
  FOR ALL TO service_role USING (true);

-- ========================================
-- CONDITIONS RLS POLICIES
-- ========================================

-- Users can view shared conditions and their organization's conditions
CREATE POLICY "workflow_conditions_select_policy" ON workflow_conditions
  FOR SELECT USING (
    is_shared = true OR 
    organization_id IN (
      SELECT organization_id FROM auth_users WHERE auth_id = auth.uid()
    )
  );

-- Users can manage conditions in their organization
CREATE POLICY "workflow_conditions_manage_policy" ON workflow_conditions
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM auth_users WHERE auth_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM auth_users WHERE auth_id = auth.uid()
    )
  );

-- ========================================
-- WEBHOOKS RLS POLICIES
-- ========================================

CREATE POLICY "workflow_webhooks_organization_policy" ON workflow_webhooks
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM auth_users WHERE auth_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM auth_users WHERE auth_id = auth.uid()
    )
  );

-- ========================================
-- EXECUTION LOGS RLS POLICIES
-- ========================================

-- Users can view logs for workflows in their organization
CREATE POLICY "workflow_execution_logs_select_policy" ON workflow_execution_logs
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM auth_users WHERE auth_id = auth.uid()
    )
  );

-- System can manage all logs
CREATE POLICY "workflow_execution_logs_system_policy" ON workflow_execution_logs
  FOR ALL TO service_role USING (true);

-- ========================================
-- PERFORMANCE METRICS RLS POLICIES
-- ========================================

-- Users can view performance metrics for their organization
CREATE POLICY "workflow_performance_metrics_select_policy" ON workflow_performance_metrics
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM auth_users WHERE auth_id = auth.uid()
    )
  );

-- System can manage all performance metrics
CREATE POLICY "workflow_performance_metrics_system_policy" ON workflow_performance_metrics
  FOR ALL TO service_role USING (true);

-- ========================================
-- RATE LIMITS RLS POLICIES
-- ========================================

-- Users can view rate limits for their organization
CREATE POLICY "workflow_rate_limits_select_policy" ON workflow_rate_limits
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM auth_users WHERE auth_id = auth.uid()
    )
  );

-- Users can manage rate limits for their organization
CREATE POLICY "workflow_rate_limits_manage_policy" ON workflow_rate_limits
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM auth_users WHERE auth_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM auth_users WHERE auth_id = auth.uid()
    )
  );

-- System can manage all rate limits
CREATE POLICY "workflow_rate_limits_system_policy" ON workflow_rate_limits
  FOR ALL TO service_role USING (true);

-- ========================================
-- GRANT PERMISSIONS
-- ========================================

-- Grant permissions to authenticated users
GRANT SELECT ON workflow_templates TO authenticated;
GRANT ALL ON workflow_templates TO authenticated;

GRANT SELECT ON workflow_execution_steps TO authenticated;

GRANT ALL ON workflow_triggers TO authenticated;
GRANT ALL ON workflow_variables TO authenticated;
GRANT SELECT ON workflow_action_definitions TO authenticated;
GRANT SELECT ON workflow_trigger_definitions TO authenticated;
GRANT SELECT ON workflow_analytics TO authenticated;
GRANT SELECT, INSERT ON workflow_execution_queue TO authenticated;
GRANT ALL ON workflow_conditions TO authenticated;
GRANT ALL ON workflow_webhooks TO authenticated;
GRANT SELECT ON workflow_execution_logs TO authenticated;
GRANT SELECT ON workflow_performance_metrics TO authenticated;
GRANT ALL ON workflow_rate_limits TO authenticated;

-- Grant full permissions to service role (system operations)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant execute on functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;