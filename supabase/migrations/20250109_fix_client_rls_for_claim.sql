-- Fix RLS policies to allow reading client data during account claim process

-- First, create a function to check if a token exists for a client
CREATE OR REPLACE FUNCTION public.has_valid_claim_token(client_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.account_claim_tokens 
        WHERE client_id = client_uuid 
        AND expires_at > NOW()
        AND claimed_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow public read for clients with valid claim tokens" ON public.clients;

-- Add RLS policy for public read access to clients when a valid token exists
CREATE POLICY "Allow public read for clients with valid claim tokens"
ON public.clients
FOR SELECT
TO anon
USING (
    has_valid_claim_token(id)
);

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow public read for valid tokens" ON public.account_claim_tokens;

-- Also ensure the account_claim_tokens table can be read publicly
CREATE POLICY "Allow public read for valid tokens"
ON public.account_claim_tokens
FOR SELECT
TO anon
USING (
    expires_at > NOW()
);