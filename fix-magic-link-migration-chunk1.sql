-- Fix for chunk 1: Drop existing policies before creating new ones

-- Drop existing RLS policies if they exist
DROP POLICY IF EXISTS "Service role can manage invitations" ON client_invitations;
DROP POLICY IF EXISTS "Organization owners can view their invitations" ON client_invitations;

-- Now create the new policies
CREATE POLICY "Service role can manage invitations" ON client_invitations
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Organization owners can view their invitations" ON client_invitations
  FOR SELECT USING (
    organization_id IN (
      SELECT id FROM organizations
      WHERE owner_user_id = auth.uid()
    )
  );

-- If you're running the complete magic link setup, you might also need to drop and recreate the table
-- Uncomment the following if needed:
/*
DROP TABLE IF EXISTS client_invitations CASCADE;

CREATE TABLE client_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invitation_token TEXT NOT NULL UNIQUE,
  claimed BOOLEAN DEFAULT FALSE,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_client_invitations_token ON client_invitations(invitation_token);
CREATE INDEX idx_client_invitations_client ON client_invitations(client_id);
CREATE INDEX idx_client_invitations_org ON client_invitations(organization_id);
CREATE INDEX idx_client_invitations_claimed ON client_invitations(claimed);

-- Enable RLS
ALTER TABLE client_invitations ENABLE ROW LEVEL SECURITY;
*/