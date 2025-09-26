-- Add claim token fields to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS claim_token VARCHAR(64) UNIQUE,
ADD COLUMN IF NOT EXISTS claim_token_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS claim_email_sent_at TIMESTAMPTZ;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_clients_claim_token ON clients(claim_token) WHERE claim_token IS NOT NULL;

-- Create a function to generate unique claim tokens
CREATE OR REPLACE FUNCTION generate_claim_token()
RETURNS TEXT AS $$
DECLARE
  token TEXT;
  done BOOLEAN := FALSE;
BEGIN
  WHILE NOT done LOOP
    -- Generate a random token (URL-safe base64)
    token := encode(gen_random_bytes(32), 'base64');
    -- Make it URL-safe
    token := replace(replace(replace(token, '+', '-'), '/', '_'), '=', '');
    
    -- Check if token already exists
    PERFORM 1 FROM clients WHERE claim_token = token;
    IF NOT FOUND THEN
      done := TRUE;
    END IF;
  END LOOP;
  
  RETURN token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;