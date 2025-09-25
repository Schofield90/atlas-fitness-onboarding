-- Migration: GoTeamUp-style authentication system
-- Description: Replace OTP/Google login with persistent invitation links and password-only login

-- ============================================
-- STEP 1: Create client_invitations table
-- ============================================
CREATE TABLE IF NOT EXISTS client_invitations (
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

-- RLS Policies for client_invitations
-- Only service role and organization owners can manage invitations
CREATE POLICY "Service role can manage invitations" ON client_invitations
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Organization owners can view their invitations" ON client_invitations
  FOR SELECT USING (
    organization_id IN (
      SELECT id FROM organizations 
      WHERE owner_user_id = auth.uid()
    )
  );

-- ============================================
-- STEP 2: Update clients table
-- ============================================

-- Add password_required field to track if password has been set
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS password_required BOOLEAN DEFAULT FALSE;

-- Add invitation_sent_at to track when invitation was created
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMPTZ;

-- Ensure password fields exist (from previous migration)
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS password_hash TEXT,
ADD COLUMN IF NOT EXISTS password_set_at TIMESTAMPTZ;

-- Remove deprecated password reset fields if they exist
ALTER TABLE clients
DROP COLUMN IF EXISTS password_reset_token,
DROP COLUMN IF EXISTS password_reset_expires;

-- Add comment explaining the new fields
COMMENT ON COLUMN clients.password_required IS 'True after client has claimed their invitation and set a password';
COMMENT ON COLUMN clients.invitation_sent_at IS 'Timestamp when invitation was generated for this client';

-- ============================================
-- STEP 3: Create function to generate invitation
-- ============================================
CREATE OR REPLACE FUNCTION generate_client_invitation(
  p_client_id UUID
)
RETURNS TEXT AS $$
DECLARE
  v_token TEXT;
  v_organization_id UUID;
  v_existing_invitation client_invitations;
BEGIN
  -- Check if client exists and get organization_id
  SELECT organization_id INTO v_organization_id
  FROM clients
  WHERE id = p_client_id;
  
  IF v_organization_id IS NULL THEN
    RAISE EXCEPTION 'Client not found';
  END IF;
  
  -- Check if invitation already exists
  SELECT * INTO v_existing_invitation
  FROM client_invitations
  WHERE client_id = p_client_id
  LIMIT 1;
  
  IF v_existing_invitation.id IS NOT NULL THEN
    -- Return existing token if not claimed
    IF NOT v_existing_invitation.claimed THEN
      RETURN v_existing_invitation.invitation_token;
    ELSE
      RAISE EXCEPTION 'Client has already claimed their invitation';
    END IF;
  END IF;
  
  -- Generate a unique token (UUID without hyphens for cleaner URLs)
  v_token := REPLACE(gen_random_uuid()::TEXT, '-', '');
  
  -- Insert invitation record
  INSERT INTO client_invitations (
    client_id,
    organization_id,
    invitation_token
  ) VALUES (
    p_client_id,
    v_organization_id,
    v_token
  );
  
  -- Update client record
  UPDATE clients
  SET invitation_sent_at = NOW()
  WHERE id = p_client_id;
  
  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 4: Create function to claim invitation
-- ============================================
CREATE OR REPLACE FUNCTION claim_client_invitation(
  p_token TEXT,
  p_password_hash TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  client_id UUID,
  email TEXT,
  organization_id UUID,
  message TEXT
) AS $$
DECLARE
  v_invitation client_invitations;
  v_client clients;
BEGIN
  -- Find the invitation
  SELECT * INTO v_invitation
  FROM client_invitations
  WHERE invitation_token = p_token
  LIMIT 1;
  
  IF v_invitation.id IS NULL THEN
    RETURN QUERY SELECT 
      FALSE::BOOLEAN,
      NULL::UUID,
      NULL::TEXT,
      NULL::UUID,
      'Invalid invitation token'::TEXT;
    RETURN;
  END IF;
  
  IF v_invitation.claimed THEN
    RETURN QUERY SELECT 
      FALSE::BOOLEAN,
      NULL::UUID,
      NULL::TEXT,
      NULL::UUID,
      'This invitation has already been claimed'::TEXT;
    RETURN;
  END IF;
  
  -- Get client details
  SELECT * INTO v_client
  FROM clients
  WHERE id = v_invitation.client_id;
  
  -- Update invitation as claimed
  UPDATE client_invitations
  SET 
    claimed = TRUE,
    claimed_at = NOW(),
    updated_at = NOW()
  WHERE id = v_invitation.id;
  
  -- Update client with password
  UPDATE clients
  SET 
    password_hash = p_password_hash,
    password_set_at = NOW(),
    password_required = TRUE
  WHERE id = v_invitation.client_id;
  
  RETURN QUERY SELECT 
    TRUE::BOOLEAN,
    v_client.id,
    v_client.email,
    v_client.organization_id,
    'Invitation claimed successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 5: Generate invitations for existing clients
-- ============================================
DO $$
DECLARE
  r RECORD;
  v_token TEXT;
BEGIN
  -- Generate invitations for all existing clients who don't have one
  FOR r IN 
    SELECT c.id, c.organization_id, c.password_hash
    FROM clients c
    LEFT JOIN client_invitations ci ON ci.client_id = c.id
    WHERE ci.id IS NULL
  LOOP
    -- Generate token
    v_token := REPLACE(gen_random_uuid()::TEXT, '-', '');
    
    -- Insert invitation
    INSERT INTO client_invitations (
      client_id,
      organization_id,
      invitation_token,
      claimed,
      claimed_at
    ) VALUES (
      r.id,
      r.organization_id,
      v_token,
      CASE WHEN r.password_hash IS NOT NULL THEN TRUE ELSE FALSE END,
      CASE WHEN r.password_hash IS NOT NULL THEN NOW() ELSE NULL END
    );
    
    -- Update client
    UPDATE clients
    SET 
      invitation_sent_at = NOW(),
      password_required = CASE WHEN r.password_hash IS NOT NULL THEN TRUE ELSE FALSE END
    WHERE id = r.id;
  END LOOP;
END $$;

-- ============================================
-- STEP 6: Drop OTP-related tables
-- ============================================

-- Drop OTP tokens table
DROP TABLE IF EXISTS otp_tokens CASCADE;

-- Drop any OTP-related functions
DROP FUNCTION IF EXISTS clean_expired_otp_tokens() CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_otp_tokens() CASCADE;

-- ============================================
-- STEP 7: Create view for easy invitation management
-- ============================================
CREATE OR REPLACE VIEW client_invitation_status AS
SELECT 
  c.id AS client_id,
  c.email,
  c.first_name,
  c.last_name,
  c.organization_id,
  o.name AS organization_name,
  ci.invitation_token,
  ci.claimed,
  ci.claimed_at,
  ci.created_at AS invitation_created_at,
  c.password_required,
  c.password_set_at,
  CASE 
    WHEN ci.claimed THEN 'Claimed'
    WHEN ci.invitation_token IS NOT NULL THEN 'Pending'
    ELSE 'Not Invited'
  END AS invitation_status
FROM clients c
LEFT JOIN client_invitations ci ON ci.client_id = c.id
LEFT JOIN organizations o ON o.id = c.organization_id
ORDER BY c.created_at DESC;

-- Grant access to the view
GRANT SELECT ON client_invitation_status TO authenticated;

-- ============================================
-- STEP 8: Add helpful comments
-- ============================================
COMMENT ON TABLE client_invitations IS 'Stores non-expiring invitation tokens for client first-time setup';
COMMENT ON COLUMN client_invitations.invitation_token IS 'Unique token used in invitation URL - never expires';
COMMENT ON COLUMN client_invitations.claimed IS 'True once the client has set their password';
COMMENT ON FUNCTION generate_client_invitation IS 'Generates a unique invitation token for a client';
COMMENT ON FUNCTION claim_client_invitation IS 'Claims an invitation and sets the client password';
COMMENT ON VIEW client_invitation_status IS 'Overview of all client invitations and their status';