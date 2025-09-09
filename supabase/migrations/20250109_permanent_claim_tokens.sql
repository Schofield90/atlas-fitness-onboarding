-- Update account_claim_tokens to support permanent tokens
ALTER TABLE public.account_claim_tokens 
  ALTER COLUMN expires_at DROP NOT NULL;

-- Add index for faster lookups by client_id
CREATE INDEX IF NOT EXISTS idx_account_claim_tokens_client_id 
  ON public.account_claim_tokens(client_id);

-- Update the cleanup function to only delete expired tokens that have an expiry date
CREATE OR REPLACE FUNCTION cleanup_expired_claim_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM public.account_claim_tokens
  WHERE expires_at IS NOT NULL 
    AND expires_at < NOW() 
    AND claimed_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a unique constraint on client_id to ensure one token per client
ALTER TABLE public.account_claim_tokens 
  ADD CONSTRAINT unique_client_token UNIQUE(client_id);

-- Drop the old has_valid_claim_token function
DROP FUNCTION IF EXISTS has_valid_claim_token(UUID);

-- Recreate to handle permanent tokens
CREATE OR REPLACE FUNCTION has_valid_claim_token(client_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.account_claim_tokens 
    WHERE client_id = client_id_param 
      AND claimed_at IS NULL
      AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;