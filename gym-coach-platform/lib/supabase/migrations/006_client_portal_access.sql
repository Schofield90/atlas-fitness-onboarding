-- Create client portal access table
CREATE TABLE IF NOT EXISTS client_portal_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  access_code VARCHAR(12) UNIQUE NOT NULL,
  magic_link_token UUID UNIQUE DEFAULT gen_random_uuid(),
  is_claimed BOOLEAN DEFAULT FALSE,
  claimed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  welcome_email_sent BOOLEAN DEFAULT FALSE,
  welcome_email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_client_portal_access_code ON client_portal_access(access_code);
CREATE INDEX idx_client_portal_magic_token ON client_portal_access(magic_link_token);
CREATE INDEX idx_client_portal_client ON client_portal_access(client_id);

-- RLS policies
ALTER TABLE client_portal_access ENABLE ROW LEVEL SECURITY;

-- Organization members can view their clients' access codes
CREATE POLICY "Organization members can view client access codes"
  ON client_portal_access FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Organization admins can manage access codes
CREATE POLICY "Organization admins can manage client access codes"
  ON client_portal_access FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'owner')
    )
  );

-- Clients can view their own access info (when authenticated)
CREATE POLICY "Clients can view own access info"
  ON client_portal_access FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
  );

-- Function to generate unique access code
CREATE OR REPLACE FUNCTION generate_client_access_code()
RETURNS VARCHAR(12) AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result VARCHAR(12) := '';
  i INTEGER := 0;
BEGIN
  -- Generate format: XXXX-XXXX-XXXX
  FOR i IN 1..12 LOOP
    IF i IN (5, 9) THEN
      result := result || '-';
    ELSE
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END IF;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to create portal access for new clients
CREATE OR REPLACE FUNCTION create_client_portal_access()
RETURNS TRIGGER AS $$
DECLARE
  new_code VARCHAR(12);
  attempt_count INTEGER := 0;
BEGIN
  -- Only create access for new clients (not updates)
  IF TG_OP = 'INSERT' THEN
    -- Try to generate a unique code (up to 10 attempts)
    LOOP
      new_code := generate_client_access_code();
      BEGIN
        INSERT INTO client_portal_access (
          client_id,
          organization_id,
          access_code
        ) VALUES (
          NEW.id,
          NEW.organization_id,
          new_code
        );
        EXIT; -- Success, exit loop
      EXCEPTION WHEN unique_violation THEN
        attempt_count := attempt_count + 1;
        IF attempt_count >= 10 THEN
          RAISE EXCEPTION 'Could not generate unique access code';
        END IF;
      END;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically create portal access for new clients
CREATE TRIGGER trigger_create_client_portal_access
AFTER INSERT ON clients
FOR EACH ROW
EXECUTE FUNCTION create_client_portal_access();

-- Update existing clients to have portal access
DO $$
DECLARE
  client_record RECORD;
  new_code VARCHAR(12);
  attempt_count INTEGER;
BEGIN
  FOR client_record IN SELECT id, organization_id FROM clients WHERE id NOT IN (SELECT client_id FROM client_portal_access) LOOP
    attempt_count := 0;
    LOOP
      new_code := generate_client_access_code();
      BEGIN
        INSERT INTO client_portal_access (
          client_id,
          organization_id,
          access_code
        ) VALUES (
          client_record.id,
          client_record.organization_id,
          new_code
        );
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        attempt_count := attempt_count + 1;
        IF attempt_count >= 10 THEN
          RAISE NOTICE 'Could not generate unique code for client %', client_record.id;
          EXIT;
        END IF;
      END;
    END LOOP;
  END LOOP;
END $$;