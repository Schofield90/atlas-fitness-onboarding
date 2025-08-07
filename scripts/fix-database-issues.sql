-- Fix Critical Database Issues
-- Based on validation report

-- 1. Add missing organization_id columns
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- 2. Fix NULL organization_id values
-- Get the default organization (Atlas Fitness)
DO $$
DECLARE
    default_org_id UUID;
BEGIN
    SELECT id INTO default_org_id FROM organizations WHERE name = 'Atlas Fitness' LIMIT 1;
    
    -- Update tasks
    UPDATE tasks SET organization_id = default_org_id WHERE organization_id IS NULL;
    
    -- Update sms_logs
    UPDATE sms_logs SET organization_id = default_org_id WHERE organization_id IS NULL;
    
    -- Update bookings (link through class_sessions)
    UPDATE bookings b
    SET organization_id = cs.organization_id
    FROM class_sessions cs
    WHERE b.class_session_id = cs.id
    AND b.organization_id IS NULL;
    
    -- Update memberships (link through member/lead)
    UPDATE memberships m
    SET organization_id = l.organization_id
    FROM leads l
    WHERE m.member_id = l.id
    AND m.organization_id IS NULL;
END $$;

-- 3. Add NOT NULL constraints after fixing data
ALTER TABLE tasks ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE bookings ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE memberships ALTER COLUMN organization_id SET NOT NULL;

-- 4. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_leads_organization_id ON leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_class_session_id ON bookings(class_session_id);
CREATE INDEX IF NOT EXISTS idx_bookings_member_id ON bookings(member_id);
CREATE INDEX IF NOT EXISTS idx_bookings_organization_id ON bookings(organization_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_start_time ON class_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_phone_number ON whatsapp_logs(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_logs_phone_number ON sms_logs(phone_number);
CREATE INDEX IF NOT EXISTS idx_tasks_organization_id ON tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_memberships_organization_id ON memberships(organization_id);

-- 5. Add RLS policies for organization isolation
-- Enable RLS on tables that don't have it
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tasks
CREATE POLICY "Users can view tasks in their organization" ON tasks
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can create tasks in their organization" ON tasks
    FOR INSERT WITH CHECK (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update tasks in their organization" ON tasks
    FOR UPDATE USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete tasks in their organization" ON tasks
    FOR DELETE USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- Create RLS policies for bookings
CREATE POLICY "Users can view bookings in their organization" ON bookings
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can create bookings in their organization" ON bookings
    FOR INSERT WITH CHECK (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update bookings in their organization" ON bookings
    FOR UPDATE USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete bookings in their organization" ON bookings
    FOR DELETE USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- Create RLS policies for memberships
CREATE POLICY "Users can view memberships in their organization" ON memberships
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can create memberships in their organization" ON memberships
    FOR INSERT WITH CHECK (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update memberships in their organization" ON memberships
    FOR UPDATE USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete memberships in their organization" ON memberships
    FOR DELETE USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- 6. Create a function to validate organization isolation
CREATE OR REPLACE FUNCTION validate_organization_access(
    p_user_id UUID,
    p_resource_table TEXT,
    p_resource_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    user_org_id UUID;
    resource_org_id UUID;
    query TEXT;
BEGIN
    -- Get user's organization
    SELECT organization_id INTO user_org_id
    FROM users
    WHERE id = p_user_id;
    
    IF user_org_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Build dynamic query to check resource organization
    query := format('SELECT organization_id FROM %I WHERE id = $1', p_resource_table);
    EXECUTE query INTO resource_org_id USING p_resource_id;
    
    RETURN user_org_id = resource_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create audit trigger for sensitive operations
CREATE TABLE IF NOT EXISTS security_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_security_audit_log_user_id ON security_audit_log(user_id);
CREATE INDEX idx_security_audit_log_organization_id ON security_audit_log(organization_id);
CREATE INDEX idx_security_audit_log_created_at ON security_audit_log(created_at);

-- 8. Create a view to help identify cross-organization data access attempts
CREATE OR REPLACE VIEW organization_access_violations AS
SELECT 
    'leads' as table_name,
    l1.id as record_id,
    l1.organization_id as record_org,
    u.organization_id as user_org,
    u.email as user_email,
    'User org does not match record org' as violation_type
FROM leads l1
CROSS JOIN users u
WHERE l1.organization_id != u.organization_id
AND EXISTS (
    SELECT 1 FROM leads l2 
    WHERE l2.email = u.email 
    AND l2.organization_id != u.organization_id
)
LIMIT 100;

-- Summary
DO $$
BEGIN
    RAISE NOTICE 'Database security fixes applied successfully!';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Review and test the changes';
    RAISE NOTICE '2. Update API routes to use organization filtering';
    RAISE NOTICE '3. Enable RLS on remaining tables';
    RAISE NOTICE '4. Implement audit logging for sensitive operations';
END $$;