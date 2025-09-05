-- Create pending waiver assignments table
CREATE TABLE IF NOT EXISTS pending_waiver_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    waiver_id UUID NOT NULL REFERENCES waivers(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'expired', 'cancelled')),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    signed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, waiver_id)
);

-- Create client notifications table for push notifications
CREATE TABLE IF NOT EXISTS client_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'waiver_assignment', 'booking_reminder', 'payment_due', etc.
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}', -- Additional data for the notification
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'read')),
    sent_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    push_token TEXT, -- FCM token or similar
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pending_waiver_assignments_client_id ON pending_waiver_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_pending_waiver_assignments_organization_id ON pending_waiver_assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_pending_waiver_assignments_status ON pending_waiver_assignments(status);
CREATE INDEX IF NOT EXISTS idx_pending_waiver_assignments_expires_at ON pending_waiver_assignments(expires_at);

CREATE INDEX IF NOT EXISTS idx_client_notifications_client_id ON client_notifications(client_id);
CREATE INDEX IF NOT EXISTS idx_client_notifications_organization_id ON client_notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_notifications_type ON client_notifications(type);
CREATE INDEX IF NOT EXISTS idx_client_notifications_status ON client_notifications(status);
CREATE INDEX IF NOT EXISTS idx_client_notifications_created_at ON client_notifications(created_at);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pending_waiver_assignments_updated_at 
    BEFORE UPDATE ON pending_waiver_assignments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_notifications_updated_at 
    BEFORE UPDATE ON client_notifications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE pending_waiver_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for pending_waiver_assignments
CREATE POLICY "Users can view pending waiver assignments in their organization" ON pending_waiver_assignments
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can manage pending waiver assignments in their organization" ON pending_waiver_assignments
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Service role has full access to pending waiver assignments" ON pending_waiver_assignments
    FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policies for client_notifications
CREATE POLICY "Users can view client notifications in their organization" ON client_notifications
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can manage client notifications in their organization" ON client_notifications
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Service role has full access to client notifications" ON client_notifications
    FOR ALL USING (auth.role() = 'service_role');

-- Comments
COMMENT ON TABLE pending_waiver_assignments IS 'Tracks waiver assignments that are pending client signature';
COMMENT ON TABLE client_notifications IS 'Push notifications and messages sent to clients';