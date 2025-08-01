-- Create staff invitations table
CREATE TABLE IF NOT EXISTS staff_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'staff',
  permissions JSONB DEFAULT '{}'::jsonb,
  invite_token UUID NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  accepted_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, accepted, expired, cancelled
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_staff_invitations_organization ON staff_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_token ON staff_invitations(invite_token);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_email ON staff_invitations(email);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_status ON staff_invitations(status);

-- Enable RLS
ALTER TABLE staff_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view invitations from their organization" ON staff_invitations
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_staff WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can create invitations for their organization" ON staff_invitations
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_staff 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins can update invitations from their organization" ON staff_invitations
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_staff 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Anyone can view invitation by token" ON staff_invitations
  FOR SELECT USING (
    invite_token::text = current_setting('request.headers', true)::json->>'x-invite-token'
  );

-- Function to clean up expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void AS $$
BEGIN
  UPDATE staff_invitations
  SET status = 'expired'
  WHERE status = 'pending'
  AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_staff_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_staff_invitations_updated_at
  BEFORE UPDATE ON staff_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_staff_invitations_updated_at();