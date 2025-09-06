-- Enhanced Waiver System Migration
-- Creates comprehensive waiver functionality including templates, customer waivers, and notification system

-- First, let's ensure the basic tables exist with correct structure
-- Drop existing foreign key constraints that may cause issues
ALTER TABLE customer_waivers DROP CONSTRAINT IF EXISTS customer_waivers_customer_id_fkey;
ALTER TABLE customer_waivers DROP CONSTRAINT IF EXISTS customer_waivers_waiver_id_fkey;

-- Update the waivers table structure
CREATE TABLE IF NOT EXISTS waivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    waiver_type TEXT DEFAULT 'liability' CHECK (waiver_type IN ('liability', 'medical', 'photo_release', 'membership_agreement', 'general')),
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    required_for TEXT[] DEFAULT '{}', -- ['membership', 'class', 'trial', 'drop_in']
    validity_days INTEGER DEFAULT NULL, -- NULL means no expiry, otherwise number of days valid
    auto_assign BOOLEAN DEFAULT false, -- Whether to auto-assign to new customers
    requires_witness BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update customer_waivers table with enhanced fields
CREATE TABLE IF NOT EXISTS customer_waivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL, -- Will reference either clients or leads table
    waiver_id UUID NOT NULL REFERENCES waivers(id) ON DELETE CASCADE,
    
    -- Signing details
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'expired', 'cancelled')),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ, -- When customer first viewed the waiver
    signed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    
    -- Signature data
    signature_data TEXT, -- Base64 encoded signature image
    signature_method TEXT DEFAULT 'digital' CHECK (signature_method IN ('digital', 'wet_signature', 'uploaded')),
    
    -- Additional metadata
    ip_address INET,
    user_agent TEXT,
    witness_name TEXT,
    witness_signature TEXT,
    witness_email TEXT,
    
    -- Tracking
    reminder_count INTEGER DEFAULT 0,
    last_reminder_sent TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(customer_id, waiver_id)
);

-- Create waiver templates table for common waiver types
CREATE TABLE IF NOT EXISTS waiver_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    template_type TEXT NOT NULL CHECK (template_type IN ('liability', 'medical', 'photo_release', 'membership_agreement', 'general')),
    content_template TEXT NOT NULL, -- Template with placeholders like {{customer_name}}, {{organization_name}}
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create waiver notifications table
CREATE TABLE IF NOT EXISTS waiver_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_waiver_id UUID NOT NULL REFERENCES customer_waivers(id) ON DELETE CASCADE,
    
    -- Notification details
    notification_type TEXT NOT NULL CHECK (notification_type IN ('waiver_assigned', 'waiver_reminder', 'waiver_signed', 'waiver_expired', 'waiver_expiring_soon')),
    channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'push', 'webhook')),
    recipient_email TEXT,
    recipient_phone TEXT,
    
    -- Status and tracking
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'read')),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    error_message TEXT,
    
    -- Content
    subject TEXT,
    message_content TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create waiver audit log for tracking changes
CREATE TABLE IF NOT EXISTS waiver_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_waiver_id UUID REFERENCES customer_waivers(id) ON DELETE CASCADE,
    waiver_id UUID REFERENCES waivers(id) ON DELETE CASCADE,
    
    -- Action details
    action TEXT NOT NULL CHECK (action IN ('created', 'assigned', 'sent', 'opened', 'signed', 'expired', 'cancelled', 'updated', 'deleted')),
    actor_id UUID REFERENCES auth.users(id),
    actor_type TEXT DEFAULT 'staff' CHECK (actor_type IN ('staff', 'customer', 'system')),
    
    -- Details
    old_values JSONB DEFAULT '{}',
    new_values JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_waivers_organization_id ON waivers(organization_id);
CREATE INDEX IF NOT EXISTS idx_waivers_type_active ON waivers(waiver_type, is_active);
CREATE INDEX IF NOT EXISTS idx_waivers_auto_assign ON waivers(organization_id, auto_assign) WHERE auto_assign = true;

CREATE INDEX IF NOT EXISTS idx_customer_waivers_organization_id ON customer_waivers(organization_id);
CREATE INDEX IF NOT EXISTS idx_customer_waivers_customer_id ON customer_waivers(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_waivers_status ON customer_waivers(status);
CREATE INDEX IF NOT EXISTS idx_customer_waivers_expires_at ON customer_waivers(expires_at);
CREATE INDEX IF NOT EXISTS idx_customer_waivers_assigned_pending ON customer_waivers(organization_id, status) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_waiver_templates_organization_id ON waiver_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_waiver_templates_type ON waiver_templates(template_type);

CREATE INDEX IF NOT EXISTS idx_waiver_notifications_organization_id ON waiver_notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_waiver_notifications_customer_waiver_id ON waiver_notifications(customer_waiver_id);
CREATE INDEX IF NOT EXISTS idx_waiver_notifications_status ON waiver_notifications(status);
CREATE INDEX IF NOT EXISTS idx_waiver_notifications_type ON waiver_notifications(notification_type);

CREATE INDEX IF NOT EXISTS idx_waiver_audit_log_organization_id ON waiver_audit_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_waiver_audit_log_customer_waiver_id ON waiver_audit_log(customer_waiver_id);
CREATE INDEX IF NOT EXISTS idx_waiver_audit_log_action ON waiver_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_waiver_audit_log_created_at ON waiver_audit_log(created_at);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_waivers_updated_at 
    BEFORE UPDATE ON waivers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_waivers_updated_at 
    BEFORE UPDATE ON customer_waivers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_waiver_templates_updated_at 
    BEFORE UPDATE ON waiver_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_waiver_notifications_updated_at 
    BEFORE UPDATE ON waiver_notifications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create audit log trigger function
CREATE OR REPLACE FUNCTION log_customer_waiver_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO waiver_audit_log (
            organization_id, customer_waiver_id, waiver_id, action, 
            actor_id, new_values
        ) VALUES (
            NEW.organization_id, NEW.id, NEW.waiver_id, 'assigned',
            auth.uid(), to_jsonb(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO waiver_audit_log (
            organization_id, customer_waiver_id, waiver_id, action,
            actor_id, old_values, new_values
        ) VALUES (
            NEW.organization_id, NEW.id, NEW.waiver_id, 
            CASE 
                WHEN OLD.status != NEW.status AND NEW.status = 'signed' THEN 'signed'
                WHEN OLD.status != NEW.status AND NEW.status = 'expired' THEN 'expired'
                WHEN OLD.status != NEW.status AND NEW.status = 'cancelled' THEN 'cancelled'
                ELSE 'updated'
            END,
            auth.uid(), to_jsonb(OLD), to_jsonb(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO waiver_audit_log (
            organization_id, customer_waiver_id, waiver_id, action,
            actor_id, old_values
        ) VALUES (
            OLD.organization_id, OLD.id, OLD.waiver_id, 'deleted',
            auth.uid(), to_jsonb(OLD)
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customer_waiver_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON customer_waivers
    FOR EACH ROW EXECUTE FUNCTION log_customer_waiver_changes();

-- Enable RLS
ALTER TABLE waivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_waivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiver_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiver_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiver_audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for waivers
CREATE POLICY "Users can manage waivers in their organization" ON waivers
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
        )
    );

-- Create RLS policies for customer_waivers
CREATE POLICY "Users can manage customer waivers in their organization" ON customer_waivers
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
        )
    );

-- Allow customers to view and sign their own waivers (for public signing page)
CREATE POLICY "Customers can view their assigned waivers" ON customer_waivers
    FOR SELECT USING (true); -- Public access for waiver signing

CREATE POLICY "Customers can update their waiver signatures" ON customer_waivers
    FOR UPDATE USING (true); -- Public access for waiver signing

-- Create RLS policies for waiver_templates
CREATE POLICY "Users can manage waiver templates in their organization" ON waiver_templates
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
        )
    );

-- Create RLS policies for waiver_notifications
CREATE POLICY "Users can view waiver notifications in their organization" ON waiver_notifications
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
        )
    );

-- Create RLS policies for waiver_audit_log
CREATE POLICY "Users can view waiver audit logs in their organization" ON waiver_audit_log
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
        )
    );

-- Service role policies for all tables
CREATE POLICY "Service role has full access to waivers" ON waivers
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to customer waivers" ON customer_waivers
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to waiver templates" ON waiver_templates
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to waiver notifications" ON waiver_notifications
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to waiver audit log" ON waiver_audit_log
    FOR ALL USING (auth.role() = 'service_role');

-- Create function to auto-assign waivers to new customers
CREATE OR REPLACE FUNCTION auto_assign_waivers_to_customer()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert customer waivers for all auto-assign waivers in this organization
    INSERT INTO customer_waivers (organization_id, customer_id, waiver_id, status, expires_at)
    SELECT 
        NEW.organization_id,
        NEW.id,
        w.id,
        'pending',
        CASE 
            WHEN w.validity_days IS NOT NULL THEN NOW() + (w.validity_days || ' days')::INTERVAL
            ELSE NULL
        END
    FROM waivers w
    WHERE w.organization_id = NEW.organization_id 
    AND w.is_active = true 
    AND w.auto_assign = true;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to auto-assign waivers when new customers are created
CREATE TRIGGER auto_assign_waivers_to_new_client
    AFTER INSERT ON clients
    FOR EACH ROW EXECUTE FUNCTION auto_assign_waivers_to_customer();

-- Note: We also need to handle leads table if customers can be leads
-- This will depend on your business logic about when leads become customers

-- Create function to check expiring waivers
CREATE OR REPLACE FUNCTION check_expiring_waivers()
RETURNS TABLE(
    customer_waiver_id UUID,
    organization_id UUID,
    customer_id UUID,
    waiver_title TEXT,
    customer_name TEXT,
    customer_email TEXT,
    expires_at TIMESTAMPTZ,
    days_until_expiry INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cw.id as customer_waiver_id,
        cw.organization_id,
        cw.customer_id,
        w.title as waiver_title,
        COALESCE(c.name, CONCAT(l.first_name, ' ', l.last_name)) as customer_name,
        COALESCE(c.email, l.email) as customer_email,
        cw.expires_at,
        EXTRACT(days FROM cw.expires_at - NOW())::INTEGER as days_until_expiry
    FROM customer_waivers cw
    JOIN waivers w ON cw.waiver_id = w.id
    LEFT JOIN clients c ON cw.customer_id = c.id
    LEFT JOIN leads l ON cw.customer_id = l.id
    WHERE cw.status = 'signed'
    AND cw.expires_at IS NOT NULL
    AND cw.expires_at <= NOW() + INTERVAL '7 days' -- Expiring within 7 days
    AND cw.expires_at > NOW(); -- Not already expired
END;
$$ LANGUAGE plpgsql;

-- Create function to mark expired waivers
CREATE OR REPLACE FUNCTION mark_expired_waivers()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE customer_waivers 
    SET status = 'expired',
        updated_at = NOW()
    WHERE status = 'signed'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE waivers IS 'Waiver templates defined by organizations';
COMMENT ON TABLE customer_waivers IS 'Individual waiver assignments and signatures for customers';
COMMENT ON TABLE waiver_templates IS 'Pre-built waiver templates that can be used to create waivers';
COMMENT ON TABLE waiver_notifications IS 'Notifications sent regarding waiver status changes';
COMMENT ON TABLE waiver_audit_log IS 'Audit trail for all waiver-related actions';

COMMENT ON FUNCTION auto_assign_waivers_to_customer() IS 'Automatically assigns waivers marked for auto-assignment to new customers';
COMMENT ON FUNCTION check_expiring_waivers() IS 'Returns list of waivers expiring within 7 days';
COMMENT ON FUNCTION mark_expired_waivers() IS 'Marks waivers as expired when past their expiry date';