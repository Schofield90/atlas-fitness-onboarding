-- Performance optimization indexes for common query patterns
-- These indexes target the most frequent query patterns identified in the codebase

-- Leads table indexes
CREATE INDEX IF NOT EXISTS idx_leads_organization_status ON leads(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_organization_created ON leads(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source) WHERE source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_created_by ON leads(created_by) WHERE created_by IS NOT NULL;

-- Bookings table indexes
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_class_session_id ON bookings(class_session_id);
CREATE INDEX IF NOT EXISTS idx_bookings_organization_status ON bookings(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);

-- Class sessions table indexes
CREATE INDEX IF NOT EXISTS idx_class_sessions_org_start ON class_sessions(organization_id, start_time);
CREATE INDEX IF NOT EXISTS idx_class_sessions_program_id ON class_sessions(program_id);

-- Messages table indexes (for timeline queries)
CREATE INDEX IF NOT EXISTS idx_messages_organization_created ON messages(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_lead_id ON messages(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_customer_id ON messages(customer_id) WHERE customer_id IS NOT NULL;

-- Automation workflows table indexes
CREATE INDEX IF NOT EXISTS idx_automation_workflows_org_active ON automation_workflows(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_automation_workflows_trigger ON automation_workflows(trigger_type);

-- Lead activities table indexes (for activity feeds)
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_created_at ON lead_activities(created_at DESC);

-- Organization members table indexes
CREATE INDEX IF NOT EXISTS idx_organization_members_org_user ON organization_members(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);

-- Analyze tables to update statistics for query planner
ANALYZE leads;
ANALYZE bookings;
ANALYZE class_sessions;
ANALYZE messages;
ANALYZE automation_workflows;
ANALYZE lead_activities;
ANALYZE organization_members;