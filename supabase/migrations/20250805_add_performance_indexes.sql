-- Migration: Add Performance Indexes for Atlas Fitness CRM
-- Date: 2025-08-05
-- Description: Adds comprehensive performance indexes based on common query patterns,
-- including composite indexes, JSON/JSONB GIN indexes, partial indexes for active records,
-- and full-text search indexes for leads

-- =============================================================================
-- UP MIGRATION - Add Performance Indexes
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. LEADS TABLE PERFORMANCE INDEXES
-- -----------------------------------------------------------------------------

-- Composite index for organization + status filtering (most common query pattern)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_org_status 
ON leads(organization_id, status) 
WHERE status != 'lost';

-- Composite index for organization + lead score (high-value leads)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_org_score 
ON leads(organization_id, lead_score DESC) 
WHERE lead_score >= 50;

-- Composite index for organization + assigned user
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_org_assigned 
ON leads(organization_id, assigned_to) 
WHERE assigned_to IS NOT NULL;

-- Composite index for organization + source + created date (campaign analysis)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_org_source_created 
ON leads(organization_id, source, created_at DESC);

-- Partial index for hot/warm leads only (active leads)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_active_leads 
ON leads(organization_id, status, lead_score DESC, created_at DESC) 
WHERE status IN ('hot', 'warm');

-- Full-text search index for lead names and emails
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_search_name_email 
ON leads USING gin(to_tsvector('english', name || ' ' || email));

-- GIN index for metadata JSONB fields
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_metadata_gin 
ON leads USING gin(metadata);

-- GIN index for AI analysis JSONB fields
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_ai_analysis_gin 
ON leads USING gin(ai_analysis) 
WHERE ai_analysis IS NOT NULL;

-- Index for lead qualification process
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_qualification 
ON leads(organization_id, status, qualification_notes) 
WHERE qualification_notes IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 2. CLIENTS TABLE PERFORMANCE INDEXES
-- -----------------------------------------------------------------------------

-- Composite index for organization + membership status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_org_membership_status 
ON clients(organization_id, membership_status, end_date) 
WHERE membership_status = 'active';

-- Composite index for organization + revenue analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_org_revenue 
ON clients(organization_id, total_revenue DESC, membership_type);

-- Composite index for organization + engagement tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_org_engagement 
ON clients(organization_id, engagement_score DESC, membership_status) 
WHERE membership_status = 'active';

-- Index for client lifecycle analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_lifecycle 
ON clients(organization_id, start_date, end_date, membership_status);

-- GIN index for client preferences
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_preferences_gin 
ON clients USING gin(preferences);

-- Full-text search for client names and emails
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_search_name_email 
ON clients USING gin(to_tsvector('english', name || ' ' || email));

-- -----------------------------------------------------------------------------
-- 3. CAMPAIGNS TABLE PERFORMANCE INDEXES
-- -----------------------------------------------------------------------------

-- Composite index for organization + platform + status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_org_platform_status 
ON campaigns(organization_id, platform, status);

-- Index for campaign performance analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_performance 
ON campaigns(organization_id, status, leads_generated DESC, spend_amount DESC) 
WHERE status = 'active';

-- Index for campaign date range queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_date_range 
ON campaigns(organization_id, start_date, end_date) 
WHERE status IN ('active', 'completed');

-- GIN index for target audience analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_target_audience_gin 
ON campaigns USING gin(target_audience);

-- GIN index for AI insights
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_ai_insights_gin 
ON campaigns USING gin(ai_insights) 
WHERE ai_insights != '{}';

-- GIN index for AI recommendations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_ai_recommendations_gin 
ON campaigns USING gin(ai_recommendations) 
WHERE ai_recommendations != '[]';

-- -----------------------------------------------------------------------------
-- 4. LEAD_ACTIVITIES TABLE PERFORMANCE INDEXES
-- -----------------------------------------------------------------------------

-- Primary composite index for lead activity history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_activities_lead_date 
ON lead_activities(lead_id, activity_date DESC);

-- Composite index for organization + activity type reporting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_activities_org_type_date 
ON lead_activities(organization_id, activity_type, activity_date DESC);

-- Index for user performance tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_activities_user_date 
ON lead_activities(user_id, activity_date DESC) 
WHERE user_id IS NOT NULL;

-- Index for campaign effectiveness tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_activities_campaign 
ON lead_activities(related_campaign_id, activity_date DESC) 
WHERE related_campaign_id IS NOT NULL;

-- Index for automation performance tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_activities_automation 
ON lead_activities(related_automation_id, activity_date DESC) 
WHERE related_automation_id IS NOT NULL;

-- Composite index for activity outcome analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_activities_outcome 
ON lead_activities(organization_id, activity_type, outcome, activity_date DESC) 
WHERE outcome IS NOT NULL;

-- GIN index for activity metadata
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_activities_metadata_gin 
ON lead_activities USING gin(metadata);

-- -----------------------------------------------------------------------------
-- 5. STAFF_TASKS TABLE PERFORMANCE INDEXES
-- -----------------------------------------------------------------------------

-- Primary composite index for assigned tasks
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staff_tasks_assigned_status_due 
ON staff_tasks(assigned_to, status, due_date) 
WHERE assigned_to IS NOT NULL;

-- Index for organization task overview
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staff_tasks_org_status_priority 
ON staff_tasks(organization_id, status, priority, due_date);

-- Index for lead-related tasks
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staff_tasks_lead_status 
ON staff_tasks(related_lead_id, status, due_date DESC) 
WHERE related_lead_id IS NOT NULL;

-- Index for client-related tasks
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staff_tasks_client_status 
ON staff_tasks(related_client_id, status, due_date DESC) 
WHERE related_client_id IS NOT NULL;

-- Partial index for overdue tasks
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staff_tasks_overdue 
ON staff_tasks(organization_id, assigned_to, due_date, priority) 
WHERE status IN ('pending', 'in_progress') AND due_date < NOW();

-- Index for AI-generated tasks analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staff_tasks_ai_generated 
ON staff_tasks(organization_id, ai_generated, ai_priority_score DESC, created_at DESC) 
WHERE ai_generated = true;

-- GIN index for AI context
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staff_tasks_ai_context_gin 
ON staff_tasks USING gin(ai_context) 
WHERE ai_generated = true;

-- -----------------------------------------------------------------------------
-- 6. AUTOMATIONS TABLE PERFORMANCE INDEXES
-- -----------------------------------------------------------------------------

-- Index for active automations by organization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_automations_org_active 
ON automations(organization_id, is_active, trigger_type) 
WHERE is_active = true;

-- Index for automation performance analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_automations_performance 
ON automations(organization_id, success_count DESC, failure_count, last_executed_at) 
WHERE is_active = true;

-- GIN index for trigger configuration
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_automations_trigger_config_gin 
ON automations USING gin(trigger_config);

-- GIN index for actions configuration
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_automations_actions_gin 
ON automations USING gin(actions);

-- -----------------------------------------------------------------------------
-- 7. MESSAGES TABLE PERFORMANCE INDEXES
-- -----------------------------------------------------------------------------

-- Primary composite index for lead message history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_lead_created 
ON messages(lead_id, created_at DESC);

-- Composite index for organization + type + status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_org_type_status 
ON messages(organization_id, type, status, created_at DESC);

-- Index for user message performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_user_type_created 
ON messages(user_id, type, created_at DESC);

-- Partial index for failed messages
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_failed 
ON messages(organization_id, type, error_code, created_at DESC) 
WHERE status = 'failed';

-- Index for delivery tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_delivery_tracking 
ON messages(organization_id, status, sent_at, delivered_at) 
WHERE status IN ('sent', 'delivered', 'read');

-- Full-text search for message content
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_content_search 
ON messages USING gin(to_tsvector('english', COALESCE(subject, '') || ' ' || body));

-- -----------------------------------------------------------------------------
-- 8. CONTACTS TABLE PERFORMANCE INDEXES
-- -----------------------------------------------------------------------------

-- Composite index for organization + opt-in status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_org_opt_in 
ON contacts(phone, sms_opt_in, whatsapp_opt_in, email_opt_in) 
WHERE sms_opt_in = true OR whatsapp_opt_in = true OR email_opt_in = true;

-- Index for contact search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_search 
ON contacts USING gin(to_tsvector('english', 
    COALESCE(first_name, '') || ' ' || 
    COALESCE(last_name, '') || ' ' || 
    COALESCE(email, '') || ' ' || 
    phone
));

-- GIN index for contact metadata
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_metadata_gin 
ON contacts USING gin(metadata);

-- GIN index for tags
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_tags_gin 
ON contacts USING gin(tags);

-- -----------------------------------------------------------------------------
-- 9. FACEBOOK INTEGRATION PERFORMANCE INDEXES
-- -----------------------------------------------------------------------------

-- Index for Facebook lead processing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_facebook_leads_processing 
ON facebook_leads(organization_id, processing_status, created_at DESC);

-- GIN index for Facebook lead data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_facebook_leads_data_gin 
ON facebook_leads USING gin(lead_data);

-- -----------------------------------------------------------------------------
-- 10. CALENDAR AND BOOKING PERFORMANCE INDEXES
-- -----------------------------------------------------------------------------

-- Index for calendar events by organization and date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calendar_events_org_date 
ON calendar_events(organization_id, start_time, end_time);

-- Index for lead-related calendar events
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calendar_events_lead_date 
ON calendar_events(lead_id, start_time) 
WHERE lead_id IS NOT NULL;

-- =============================================================================
-- CREATE HELPFUL COMMENTS ON INDEXES
-- =============================================================================

COMMENT ON INDEX idx_leads_org_status IS 'Optimizes lead filtering by organization and status (most common query)';
COMMENT ON INDEX idx_leads_search_name_email IS 'Enables full-text search across lead names and emails';
COMMENT ON INDEX idx_leads_active_leads IS 'Partial index for high-priority active leads only';
COMMENT ON INDEX idx_campaigns_performance IS 'Optimizes campaign performance analysis queries';
COMMENT ON INDEX idx_lead_activities_lead_date IS 'Primary index for lead activity timeline queries';
COMMENT ON INDEX idx_staff_tasks_overdue IS 'Partial index for identifying overdue tasks';
COMMENT ON INDEX idx_messages_content_search IS 'Enables full-text search within message content';
COMMENT ON INDEX idx_contacts_search IS 'Composite full-text search across all contact fields';

-- =============================================================================
-- DOWN MIGRATION - Remove Performance Indexes
-- =============================================================================

/*
-- To rollback this migration, run these DROP INDEX statements:

-- Leads table indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_leads_org_status;
DROP INDEX CONCURRENTLY IF EXISTS idx_leads_org_score;
DROP INDEX CONCURRENTLY IF EXISTS idx_leads_org_assigned;
DROP INDEX CONCURRENTLY IF EXISTS idx_leads_org_source_created;
DROP INDEX CONCURRENTLY IF EXISTS idx_leads_active_leads;
DROP INDEX CONCURRENTLY IF EXISTS idx_leads_search_name_email;
DROP INDEX CONCURRENTLY IF EXISTS idx_leads_metadata_gin;
DROP INDEX CONCURRENTLY IF EXISTS idx_leads_ai_analysis_gin;
DROP INDEX CONCURRENTLY IF EXISTS idx_leads_qualification;

-- Clients table indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_clients_org_membership_status;
DROP INDEX CONCURRENTLY IF EXISTS idx_clients_org_revenue;
DROP INDEX CONCURRENTLY IF EXISTS idx_clients_org_engagement;
DROP INDEX CONCURRENTLY IF EXISTS idx_clients_lifecycle;
DROP INDEX CONCURRENTLY IF EXISTS idx_clients_preferences_gin;
DROP INDEX CONCURRENTLY IF EXISTS idx_clients_search_name_email;

-- Campaigns table indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_campaigns_org_platform_status;
DROP INDEX CONCURRENTLY IF EXISTS idx_campaigns_performance;
DROP INDEX CONCURRENTLY IF EXISTS idx_campaigns_date_range;
DROP INDEX CONCURRENTLY IF EXISTS idx_campaigns_target_audience_gin;
DROP INDEX CONCURRENTLY IF EXISTS idx_campaigns_ai_insights_gin;
DROP INDEX CONCURRENTLY IF EXISTS idx_campaigns_ai_recommendations_gin;

-- Lead activities table indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_lead_activities_lead_date;
DROP INDEX CONCURRENTLY IF EXISTS idx_lead_activities_org_type_date;
DROP INDEX CONCURRENTLY IF EXISTS idx_lead_activities_user_date;
DROP INDEX CONCURRENTLY IF EXISTS idx_lead_activities_campaign;
DROP INDEX CONCURRENTLY IF EXISTS idx_lead_activities_automation;
DROP INDEX CONCURRENTLY IF EXISTS idx_lead_activities_outcome;
DROP INDEX CONCURRENTLY IF EXISTS idx_lead_activities_metadata_gin;

-- Staff tasks table indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_staff_tasks_assigned_status_due;
DROP INDEX CONCURRENTLY IF EXISTS idx_staff_tasks_org_status_priority;
DROP INDEX CONCURRENTLY IF EXISTS idx_staff_tasks_lead_status;
DROP INDEX CONCURRENTLY IF EXISTS idx_staff_tasks_client_status;
DROP INDEX CONCURRENTLY IF EXISTS idx_staff_tasks_overdue;
DROP INDEX CONCURRENTLY IF EXISTS idx_staff_tasks_ai_generated;
DROP INDEX CONCURRENTLY IF EXISTS idx_staff_tasks_ai_context_gin;

-- Automations table indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_automations_org_active;
DROP INDEX CONCURRENTLY IF EXISTS idx_automations_performance;
DROP INDEX CONCURRENTLY IF EXISTS idx_automations_trigger_config_gin;
DROP INDEX CONCURRENTLY IF EXISTS idx_automations_actions_gin;

-- Messages table indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_messages_lead_created;
DROP INDEX CONCURRENTLY IF EXISTS idx_messages_org_type_status;
DROP INDEX CONCURRENTLY IF EXISTS idx_messages_user_type_created;
DROP INDEX CONCURRENTLY IF EXISTS idx_messages_failed;
DROP INDEX CONCURRENTLY IF EXISTS idx_messages_delivery_tracking;
DROP INDEX CONCURRENTLY IF EXISTS idx_messages_content_search;

-- Contacts table indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_contacts_org_opt_in;
DROP INDEX CONCURRENTLY IF EXISTS idx_contacts_search;
DROP INDEX CONCURRENTLY IF EXISTS idx_contacts_metadata_gin;
DROP INDEX CONCURRENTLY IF EXISTS idx_contacts_tags_gin;

-- Facebook integration indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_facebook_leads_processing;
DROP INDEX CONCURRENTLY IF EXISTS idx_facebook_leads_data_gin;

-- Calendar indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_calendar_events_org_date;
DROP INDEX CONCURRENTLY IF EXISTS idx_calendar_events_lead_date;

*/